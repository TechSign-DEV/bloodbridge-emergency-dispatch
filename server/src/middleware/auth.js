import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";

export function requireAuth(req, _res, next) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new AppError("Authentication required. Send Authorization: Bearer <token>.", 401));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload?.sub || !["donor", "hospital"].includes(payload.role)) {
      return next(new AppError("Invalid authentication token", 401));
    }
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return next(new AppError("Invalid or expired authentication token", 401));
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to access this resource", 403));
    }
    return next();
  };
}
