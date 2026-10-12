import jwt from "jsonwebtoken";
import AppError from "./AppError.js";

export function signAuthToken({ id, role }) {
  if (!process.env.JWT_SECRET) {
    throw new AppError("JWT_SECRET is not configured on the server", 500);
  }
  return jwt.sign({ sub: String(id), role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}
