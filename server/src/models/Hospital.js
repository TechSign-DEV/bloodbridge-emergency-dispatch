import mongoose from "mongoose";

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

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 150 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    phone: { type: String, required: true, trim: true, unique: true, index: true },
    password: { type: String, required: true, select: false },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    location: { type: geoPointSchema, required: true },
  },
  { timestamps: true, versionKey: false },
);

hospitalSchema.index({ location: "2dsphere" });
hospitalSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.password;
    return ret;
  },
});

const Hospital = mongoose.model("Hospital", hospitalSchema);
export default Hospital;
