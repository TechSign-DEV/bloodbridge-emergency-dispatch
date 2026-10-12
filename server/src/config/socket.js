import { Server } from "socket.io";
import jwt from "jsonwebtoken";

export function initializeSocket(httpServer) {
  const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim());

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST", "PATCH"],
      credentials: true,
    },
  });

  // Clients send io(url, { auth: { token } }); only authenticated users can join rooms.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || !process.env.JWT_SECRET) return next(new Error("Authentication required"));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (!payload?.sub || !["donor", "hospital"].includes(payload.role)) {
        return next(new Error("Invalid socket token"));
      }
      socket.data.user = { id: String(payload.sub), role: payload.role };
      return next();
    } catch {
      return next(new Error("Invalid or expired socket token"));
    }
  });

  io.on("connection", (socket) => {
    const { id, role } = socket.data.user;
    socket.join(`${role}:${id}`);
    socket.emit("connection:ready", { ok: true, role });
    console.info(`Socket connected role=${role} id=${id}`);
  });

  return io;
}
