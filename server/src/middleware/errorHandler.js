import AppError from "../utils/AppError.js";

export function notFound(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let details = err.details;

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(err.errors).map((item) => item.message);
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID or field value";
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    message = `A record with this ${field} already exists`;
    details = undefined;
  }

  const body = { success: false, message };
  if (details) body.details = details;
  if (process.env.NODE_ENV !== "production" && statusCode >= 500) body.stack = err.stack;

  if (statusCode >= 500) console.error(err);
  res.status(statusCode).json(body);
}
