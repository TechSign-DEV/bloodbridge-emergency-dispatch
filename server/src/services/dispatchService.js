import Donor from "../models/Donor.js";
import Notification from "../models/Notification.js";
import BloodRequest from "../models/BloodRequest.js";
import Hospital from "../models/Hospital.js";
import { DONATION_COOLDOWN_DAYS, SEARCH_RADII_KM } from "../constants/blood.js";
import { distanceKm } from "../utils/geo.js";
import { sendDonorAlert } from "./notificationService.js";

/**
 * Dispatches to eligible donors using MongoDB's $near + GeoJSON 2dsphere index.
 * The search widens 5 -> 10 -> 20 km until there are enough non-rejected matches
 * to cover the requested units, or the largest radius has been checked.
 * The unique (bloodRequest, donor) index is the final safeguard against duplicates.
 */
export async function dispatchBloodRequest(bloodRequestId, io) {
  const request = await BloodRequest.findById(bloodRequestId);
  if (!request) throw new Error("Blood request not found during dispatch");

  const hospital = await Hospital.findById(request.hospital).select("name phone address");
  const cutoffDate = new Date(Date.now() - DONATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const priorNotifications = await Notification.find({ bloodRequest: request._id }).select("donor status").lean();
  const priorByDonor = new Map(priorNotifications.map((item) => [String(item.donor), item]));

  let selectedRadiusKm = SEARCH_RADII_KM[0];
  let matchedDonors = [];
  let radiiChecked = [];

  for (const radiusKm of SEARCH_RADII_KM) {
    selectedRadiusKm = radiusKm;
    radiiChecked.push(radiusKm);

    // $near requires a 2dsphere index. GeoJSON maxDistance is measured in metres.
    matchedDonors = await Donor.find({
      location: {
        $near: {
          $geometry: request.location,
          $maxDistance: radiusKm * 1000,
        },
      },
      bloodGroup: request.bloodGroupRequired,
      isAvailable: true,
      $or: [{ lastDonatedAt: null }, { lastDonatedAt: { $lte: cutoffDate } }],
    })
      .select("name email phone bloodGroup location lastDonatedAt isAvailable")
      .lean();

    // Pending and accepted donors count toward coverage; rejected donors do not.
    const viableCount = matchedDonors.filter((donor) => {
      const prior = priorByDonor.get(String(donor._id));
      return !prior || prior.status !== "rejected";
    }).length;

    if (viableCount >= request.unitsNeeded || radiusKm === SEARCH_RADII_KM.at(-1)) break;
  }

  const newlyCreated = [];
  for (const donor of matchedDonors) {
    if (priorByDonor.has(String(donor._id))) continue;

    try {
      const notification = await Notification.create({
        bloodRequest: request._id,
        donor: donor._id,
        distanceKm: Number(distanceKm(request.location, donor.location).toFixed(2)),
        radiusKm: selectedRadiusKm,
        status: "pending",
        channels: ["web", "sms-console"],
      });
      newlyCreated.push({ donor, notification });
    } catch (error) {
      // Concurrent dispatch retry may race; the compound unique index prevents duplicates.
      if (error?.code !== 11000) throw error;
    }
  }

  for (const item of newlyCreated) {
    sendDonorAlert(io, {
      donor: item.donor,
      request,
      notification: item.notification,
      hospital,
    });
  }

  const totalNotifications = await Notification.countDocuments({ bloodRequest: request._id });
  request.matchedRadiusKm = selectedRadiusKm;
  request.matchedDonorCount = matchedDonors.length;
  request.notifiedDonorCount = totalNotifications;
  request.dispatchRuns += 1;
  request.dispatchedAt = new Date();
  await request.save();

  if (io) {
    io.to(`hospital:${request.hospital}`).emit("blood:request:dispatch_updated", {
      requestId: String(request._id),
      matchedDonorCount: matchedDonors.length,
      newlyNotifiedCount: newlyCreated.length,
      notifiedDonorCount: totalNotifications,
      matchedRadiusKm: selectedRadiusKm,
      radiiChecked,
    });
  }

  return {
    matchedRadiusKm: selectedRadiusKm,
    radiiChecked,
    matchedDonorCount: matchedDonors.length,
    newlyNotifiedCount: newlyCreated.length,
    notifiedDonorCount: totalNotifications,
    matches: matchedDonors.map((donor) => ({
      donorId: String(donor._id),
      name: donor.name,
      bloodGroup: donor.bloodGroup,
      distanceKm: Number(distanceKm(request.location, donor.location).toFixed(2)),
      notificationStatus: priorByDonor.get(String(donor._id))?.status || "pending",
    })),
  };
}
