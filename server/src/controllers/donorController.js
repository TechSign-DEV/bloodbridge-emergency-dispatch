import Donor from "../models/Donor.js";
import Notification from "../models/Notification.js";
import BloodRequest from "../models/BloodRequest.js";
import Hospital from "../models/Hospital.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { toGeoPoint } from "../utils/geo.js";

export const getMyDonorProfile = asyncHandler(async (req, res) => {
  const donor = await Donor.findById(req.user.id);
  if (!donor) throw new AppError("Donor account not found", 404);
  res.json({ success: true, data: { user: donor } });
});

export const updateAvailability = asyncHandler(async (req, res) => {
  if (typeof req.body.isAvailable !== "boolean") throw new AppError("isAvailable must be a boolean", 400);
  const donor = await Donor.findByIdAndUpdate(
    req.user.id,
    { $set: { isAvailable: req.body.isAvailable } },
    { new: true, runValidators: true },
  );
  if (!donor) throw new AppError("Donor account not found", 404);
  res.json({ success: true, message: "Availability updated", data: { user: donor } });
});

export const updateDonorLocation = asyncHandler(async (req, res) => {
  const location = toGeoPoint(req.body.location);
  const donor = await Donor.findByIdAndUpdate(
    req.user.id,
    { $set: { location } },
    { new: true, runValidators: true },
  );
  if (!donor) throw new AppError("Donor account not found", 404);
  res.json({ success: true, message: "Location updated", data: { user: donor } });
});

export const getDonorNotifications = asyncHandler(async (req, res) => {
  const filter = { donor: req.user.id };
  if (req.query.status && ["pending", "accepted", "rejected", "expired"].includes(req.query.status)) {
    filter.status = req.query.status;
  }

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .populate({
      path: "bloodRequest",
      select: "bloodGroupRequired unitsNeeded urgency status location contactNumber createdAt hospital",
      populate: { path: "hospital", select: "name phone address" },
    })
    .lean();

  res.json({ success: true, data: { notifications } });
});

export const respondToNotification = asyncHandler(async (req, res) => {
  const { response } = req.body;
  if (!["accepted", "rejected"].includes(response)) {
    throw new AppError('response must be either "accepted" or "rejected"', 400);
  }

  const notification = await Notification.findOne({ _id: req.params.notificationId, donor: req.user.id });
  if (!notification) throw new AppError("Notification not found", 404);
  if (notification.status !== "pending") throw new AppError("This notification has already been answered", 409);

  const request = await BloodRequest.findById(notification.bloodRequest);
  if (!request || ["cancelled", "fulfilled"].includes(request.status)) {
    notification.status = "expired";
    notification.respondedAt = new Date();
    await notification.save();
    throw new AppError("This blood request is no longer accepting responses", 409);
  }

  const now = new Date();
  notification.status = response;
  notification.respondedAt = now;
  await notification.save();

  const donor = await Donor.findById(req.user.id);
  if (response === "accepted") {
    request.acceptedDonors.addToSet(donor._id);
    request.status = request.acceptedDonors.length >= request.unitsNeeded ? "fulfilled" : "partially_fulfilled";
    await request.save();

    // One donor should not accept overlapping requests. Other pending invitations expire.
    await Donor.updateOne({ _id: donor._id }, { $set: { isAvailable: false } });
    await Notification.updateMany(
      { donor: donor._id, _id: { $ne: notification._id }, status: "pending" },
      { $set: { status: "expired", respondedAt: now } },
    );

    // Once enough donors have accepted, expire other invitations for this same request.
    if (request.status === "fulfilled") {
      await Notification.updateMany(
        { bloodRequest: request._id, _id: { $ne: notification._id }, status: "pending" },
        { $set: { status: "expired", respondedAt: now } },
      );
    }
  }

  const hospital = await Hospital.findById(request.hospital).select("name phone address");
  const io = req.app.get("io");
  if (io) {
    io.to(`hospital:${request.hospital}`).emit("blood:request:response", {
      requestId: String(request._id),
      notificationId: String(notification._id),
      donor: { id: String(donor._id), name: donor.name, bloodGroup: donor.bloodGroup },
      response,
      requestStatus: request.status,
    });
  }

  res.json({
    success: true,
    message: `Request ${response}`,
    data: {
      notification: { id: String(notification._id), status: notification.status, respondedAt: notification.respondedAt },
      request: { id: String(request._id), status: request.status, unitsNeeded: request.unitsNeeded, acceptedCount: request.acceptedDonors.length },
      hospital: hospital ? { name: hospital.name } : null,
    },
  });
});

export const getDonorHistory = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({
    donor: req.user.id,
    status: { $in: ["accepted", "rejected", "expired"] },
  })
    .sort({ respondedAt: -1, createdAt: -1 })
    .populate({ path: "bloodRequest", select: "bloodGroupRequired unitsNeeded urgency status createdAt contactNumber hospital" })
    .lean();

  res.json({ success: true, data: { history: notifications } });
});
