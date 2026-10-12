import bcrypt from "bcryptjs";
import Donor from "../models/Donor.js";
import Hospital from "../models/Hospital.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { toGeoPoint } from "../utils/geo.js";
import { signAuthToken } from "../utils/jwt.js";
import { BLOOD_GROUPS } from "../constants/blood.js";

const SALT_ROUNDS = 12;

function requiredString(value, field, { min = 1, max = 300 } = {}) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) {
    throw new AppError(`${field} is required and must be ${min}-${max} characters`, 400);
  }
  return value.trim();
}

function validateEmail(email) {
  const value = requiredString(email, "Email", { min: 5, max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new AppError("Please provide a valid email address", 400);
  return value;
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    throw new AppError("Password must be between 8 and 128 characters", 400);
  }
  return password;
}

function validatePhone(phone) {
  const value = requiredString(phone, "Phone", { min: 7, max: 20 });
  if (!/^[+\d][\d\s()\-]{5,18}\d$/.test(value)) throw new AppError("Please provide a valid contact number", 400);
  return value;
}

function validateBloodGroup(bloodGroup) {
  if (!BLOOD_GROUPS.includes(bloodGroup)) {
    throw new AppError(`Blood group must be one of: ${BLOOD_GROUPS.join(", ")}`, 400);
  }
  return bloodGroup;
}

function authResponse(user, role) {
  return {
    success: true,
    message: "Authentication successful",
    data: {
      token: signAuthToken({ id: user._id, role }),
      role,
      user: user.toJSON(),
    },
  };
}

export const registerDonor = asyncHandler(async (req, res) => {
  const name = requiredString(req.body.name, "Name", { min: 2, max: 100 });
  const email = validateEmail(req.body.email);
  const phone = validatePhone(req.body.phone);
  const password = validatePassword(req.body.password);
  const bloodGroup = validateBloodGroup(req.body.bloodGroup);
  const location = toGeoPoint(req.body.location);
  const lastDonatedAt = req.body.lastDonatedAt ? new Date(req.body.lastDonatedAt) : null;

  if (lastDonatedAt && Number.isNaN(lastDonatedAt.getTime())) throw new AppError("lastDonatedAt must be a valid date", 400);
  if (lastDonatedAt && lastDonatedAt > new Date()) throw new AppError("lastDonatedAt cannot be in the future", 400);

  const donor = await Donor.create({
    name, email, phone, password: await bcrypt.hash(password, SALT_ROUNDS), bloodGroup, location, lastDonatedAt,
    isAvailable: req.body.isAvailable === undefined ? true : Boolean(req.body.isAvailable),
  });

  res.status(201).json({
    success: true,
    message: "Donor registered successfully",
    data: { token: signAuthToken({ id: donor._id, role: "donor" }), role: "donor", user: donor.toJSON() },
  });
});

export const loginDonor = asyncHandler(async (req, res) => {
  const email = validateEmail(req.body.email);
  const password = validatePassword(req.body.password);
  const donor = await Donor.findOne({ email }).select("+password");
  if (!donor || !(await bcrypt.compare(password, donor.password))) throw new AppError("Invalid email or password", 401);
  res.json(authResponse(donor, "donor"));
});

export const registerHospital = asyncHandler(async (req, res) => {
  const name = requiredString(req.body.name, "Hospital name", { min: 2, max: 150 });
  const email = validateEmail(req.body.email);
  const phone = validatePhone(req.body.phone);
  const password = validatePassword(req.body.password);
  const address = requiredString(req.body.address, "Address", { min: 5, max: 300 });
  const location = toGeoPoint(req.body.location);

  const hospital = await Hospital.create({
    name, email, phone, password: await bcrypt.hash(password, SALT_ROUNDS), address, location,
  });

  res.status(201).json({
    success: true,
    message: "Hospital registered successfully",
    data: { token: signAuthToken({ id: hospital._id, role: "hospital" }), role: "hospital", user: hospital.toJSON() },
  });
});

export const loginHospital = asyncHandler(async (req, res) => {
  const email = validateEmail(req.body.email);
  const password = validatePassword(req.body.password);
  const hospital = await Hospital.findOne({ email }).select("+password");
  if (!hospital || !(await bcrypt.compare(password, hospital.password))) throw new AppError("Invalid email or password", 401);
  res.json(authResponse(hospital, "hospital"));
});
