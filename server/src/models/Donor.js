import mongoose from "mongoose";
import { BLOOD_GROUPS } from "../constants/blood.js";

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

const donorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    phone: { type: String, required: true, trim: true, unique: true, index: true },
    password: { type: String, required: true, select: false },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true, index: true },
    location: { type: geoPointSchema, required: true },
    lastDonatedAt: { type: Date, default: null, index: true },
    isAvailable: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

donorSchema.index({ location: "2dsphere" });
donorSchema.index({ bloodGroup: 1, isAvailable: 1 });

donorSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.password;
    return ret;
  },
});

const Donor = mongoose.model("Donor", donorSchema);
export default Donor;
