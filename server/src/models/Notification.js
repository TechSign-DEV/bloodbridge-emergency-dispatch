import mongoose from "mongoose";
import { NOTIFICATION_STATUSES } from "../constants/blood.js";

const notificationSchema = new mongoose.Schema(
  {
    bloodRequest: { type: mongoose.Schema.Types.ObjectId, ref: "BloodRequest", required: true, index: true },
    donor: { type: mongoose.Schema.Types.ObjectId, ref: "Donor", required: true, index: true },
    status: { type: String, enum: NOTIFICATION_STATUSES, default: "pending", index: true },
    distanceKm: { type: Number, required: true, min: 0 },
    radiusKm: { type: Number, required: true, enum: [5, 10, 20] },
    channels: { type: [String], default: ["web", "sms-console"] },
    sentAt: { type: Date, default: Date.now },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

// A donor can be notified at most once for a specific request, including dispatch retries.
notificationSchema.index({ bloodRequest: 1, donor: 1 }, { unique: true });
notificationSchema.index({ donor: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
