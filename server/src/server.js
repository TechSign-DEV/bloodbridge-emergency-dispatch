import "dotenv/config";
import { createServer } from "node:http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initializeSocket } from "./config/socket.js";

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set to a random string of at least 32 characters in .env");
  }

  await connectDB();
  const httpServer = createServer(app);
  const io = initializeSocket(httpServer);
  app.set("io", io);

  httpServer.listen(port, () => {
    console.log(`BloodBridge API listening on http://localhost:${port}`);
    console.log(`Health check: http://localhost:${port}/api/health`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down BloodBridge...`);
    io.close();
    httpServer.close(async () => {
      const mongoose = await import("mongoose");
      await mongoose.default.disconnect();
      process.exit(0);
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((error) => {
  console.error("Failed to start BloodBridge:", error.message);
  process.exit(1);
});
