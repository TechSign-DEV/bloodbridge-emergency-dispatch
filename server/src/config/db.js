import mongoose from "mongoose";
import Donor from "../models/Donor.js";
import Hospital from "../models/Hospital.js";
import BloodRequest from "../models/BloodRequest.js";
import Notification from "../models/Notification.js";

export default async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bloodbridge";
  mongoose.set("autoIndex", process.env.MONGOOSE_AUTO_INDEX !== "false");

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  // Wait for 2dsphere and unique indexes before accepting requests. Without the
  // geo indexes, the first $near dispatch would fail; without the unique index,
  // concurrent retries could create duplicate notifications.
  if (process.env.MONGOOSE_AUTO_INDEX !== "false") {
    await Promise.all([Donor.init(), Hospital.init(), BloodRequest.init(), Notification.init()]);
  }

  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
