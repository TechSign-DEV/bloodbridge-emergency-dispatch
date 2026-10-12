import mongoose from "mongoose";
import { BLOOD_GROUPS, REQUEST_STATUSES, URGENCY_LEVELS, SEARCH_RADII_KM } from "../constants/blood.js";

const geoPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.length === 2 &&
            Number.isFinite(value[0]) &&
            Number.isFinite(value[1]) &&
            value[0] >= -180 && value[0] <= 180 &&
            value[1] >= -90 && value[1] <= 90
          );
        },
        message: "coordinates must be [longitude, latitude] within valid bounds",
      },
    },
  },
  { _id: false },
);

const bloodRequestSchema = new mongoose.Schema(
  {
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true, index: true },
    bloodGroupRequired: { type: String, enum: BLOOD_GROUPS, required: true, index: true },
    unitsNeeded: { type: Number, required: true, min: 1, max: 100, validate: Number.isInteger },
    urgency: { type: String, enum: URGENCY_LEVELS, required: true, default: "high", index: true },
    location: { type: geoPointSchema, required: true },
    contactNumber: { type: String, required: true, trim: true },
    status: { type: String, enum: REQUEST_STATUSES, default: "open", index: true },
    matchedRadiusKm: { type: Number, enum: SEARCH_RADII_KM, default: 5 },
    matchedDonorCount: { type: Number, default: 0, min: 0 },
    notifiedDonorCount: { type: Number, default: 0, min: 0 },
    acceptedDonors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Donor" }],
    dispatchRuns: { type: Number, default: 0, min: 0 },
    dispatchedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

bloodRequestSchema.index({ location: "2dsphere" });
bloodRequestSchema.index({ hospital: 1, createdAt: -1 });

const BloodRequest = mongoose.model("BloodRequest", bloodRequestSchema);
export default BloodRequest;
