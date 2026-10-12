import BloodRequest from "../models/BloodRequest.js";
import Hospital from "../models/Hospital.js";
import Notification from "../models/Notification.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { toGeoPoint } from "../utils/geo.js";
import { BLOOD_GROUPS, URGENCY_LEVELS } from "../constants/blood.js";
import { dispatchBloodRequest } from "../services/dispatchService.js";

function buildMatches(notifications) {
  return notifications.map((item) => {
    const donor = item.donor;
    const match = {
      notificationId: String(item._id),
      donorId: donor ? String(donor._id) : null,
      name: donor?.name || "Deleted donor",
      bloodGroup: donor?.bloodGroup || null,
      status: item.status,
      distanceKm: item.distanceKm,
      radiusKm: item.radiusKm,
      sentAt: item.sentAt,
      respondedAt: item.respondedAt,
    };
    // Only expose donor's phone number after they explicitly accept the request.
    if (item.status === "accepted" && donor?.phone) match.phone = donor.phone;
    return match;
  });
}

export const createBloodRequest = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findById(req.user.id);
  if (!hospital) throw new AppError("Hospital account not found", 404);

  const { bloodGroupRequired, unitsNeeded, urgency = "high" } = req.body;
  if (!BLOOD_GROUPS.includes(bloodGroupRequired)) {
    throw new AppError(`bloodGroupRequired must be one of: ${BLOOD_GROUPS.join(", ")}`, 400);
  }
  const units = Number(unitsNeeded);
  if (!Number.isInteger(units) || units < 1 || units > 100) {
    throw new AppError("unitsNeeded must be an integer between 1 and 100", 400);
  }
  if (!URGENCY_LEVELS.includes(urgency)) {
    throw new AppError(`urgency must be one of: ${URGENCY_LEVELS.join(", ")}`, 400);
  }

  const location = req.body.location ? toGeoPoint(req.body.location) : hospital.location;
  const contactNumber = typeof req.body.contactNumber === "string" && req.body.contactNumber.trim()
    ? req.body.contactNumber.trim()
    : hospital.phone;

  const bloodRequest = await BloodRequest.create({
    hospital: hospital._id,
    bloodGroupRequired,
    unitsNeeded: units,
    urgency,
    location,
    contactNumber,
  });

  const dispatch = await dispatchBloodRequest(bloodRequest._id, req.app.get("io"));
  const savedRequest = await BloodRequest.findById(bloodRequest._id).populate("hospital", "name phone address");

  res.status(201).json({
    success: true,
    message: "Emergency blood request created and donor dispatch completed",
    data: { request: savedRequest, dispatch },
  });
});

export const getMyBloodRequests = asyncHandler(async (req, res) => {
  const requests = await BloodRequest.find({ hospital: req.user.id })
    .sort({ createdAt: -1 })
    .populate("hospital", "name phone address")
    .lean();

  if (requests.length === 0) return res.json({ success: true, data: { requests: [] } });

  const notifications = await Notification.find({ bloodRequest: { $in: requests.map((r) => r._id) } })
    .sort({ distanceKm: 1, createdAt: -1 })
    .populate({ path: "donor", select: "name bloodGroup phone" })
    .lean();
  const byRequestId = new Map();
  for (const item of notifications) {
    const key = String(item.bloodRequest);
    if (!byRequestId.has(key)) byRequestId.set(key, []);
    byRequestId.get(key).push(item);
  }

  res.json({
    success: true,
    data: {
      requests: requests.map((request) => ({
        ...request,
        matches: buildMatches(byRequestId.get(String(request._id)) || []),
      })),
    },
  });
});

export const getBloodRequestById = asyncHandler(async (req, res) => {
  const request = await BloodRequest.findOne({ _id: req.params.requestId, hospital: req.user.id })
    .populate("hospital", "name phone address location")
    .lean();
  if (!request) throw new AppError("Blood request not found", 404);

  const notifications = await Notification.find({ bloodRequest: request._id })
    .sort({ distanceKm: 1, createdAt: -1 })
    .populate({ path: "donor", select: "name bloodGroup phone" })
    .lean();

  res.json({ success: true, data: { request: { ...request, matches: buildMatches(notifications) } } });
});

export const retryDispatch = asyncHandler(async (req, res) => {
  const request = await BloodRequest.findOne({ _id: req.params.requestId, hospital: req.user.id });
  if (!request) throw new AppError("Blood request not found", 404);
  if (["cancelled", "fulfilled"].includes(request.status)) {
    throw new AppError(`Cannot dispatch a ${request.status} request`, 409);
  }

  const dispatch = await dispatchBloodRequest(request._id, req.app.get("io"));
  const updatedRequest = await BloodRequest.findById(request._id);
  res.json({ success: true, message: "Dispatch retry completed without duplicate notifications", data: { request: updatedRequest, dispatch } });
});

export const cancelBloodRequest = asyncHandler(async (req, res) => {
  const request = await BloodRequest.findOne({ _id: req.params.requestId, hospital: req.user.id });
  if (!request) throw new AppError("Blood request not found", 404);
  if (request.status === "fulfilled") throw new AppError("A fulfilled request cannot be cancelled", 409);
  if (request.status === "cancelled") throw new AppError("Request is already cancelled", 409);

  request.status = "cancelled";
  await request.save();
  const requestNotifications = await Notification.find({ bloodRequest: request._id })
    .select("donor status")
    .lean();
  await Notification.updateMany(
    { bloodRequest: request._id, status: "pending" },
    { $set: { status: "expired", respondedAt: new Date() } },
  );

  // Notify only donors invited to this request, not every connected user.
  const io = req.app.get("io");
  if (io) {
    const payload = { requestId: String(request._id) };
    const notifiedDonors = new Set(requestNotifications.map((item) => String(item.donor)));
    for (const donorId of notifiedDonors) io.to(`donor:${donorId}`).emit("blood:request:cancelled", payload);
    io.to(`hospital:${request.hospital}`).emit("blood:request:cancelled", payload);
  }
  res.json({ success: true, message: "Blood request cancelled", data: { request } });
});
