require("dotenv").config();
const mongoose = require("mongoose");
const http = require("http");
const os = require("os");
const app = require("./app");
const { createLog } = require("./routes/loggerService");
const Listing = require('./models/Listing');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI; // MAIN DB

async function startServer() {
  try {
    // -------------------------
    // Connect MAIN database
    // -------------------------
    await mongoose.connect(MONGO_URI);
    console.log("✅ Main MongoDB connected");

    try {
  // ensure index exists (harmless if it already exists)
  await Listing.collection.createIndex({ createdAt: -1 });
  console.log('Ensured index on Listing.createdAt');
} catch (err) {
  console.warn('Could not create Listing.createdAt index:', err.message);
}

    const server = http.createServer(app);

    // -------------------------
    // Start Server
    // -------------------------
    server.listen(PORT, async () => {
      console.log(`⚡ Server running on port ${PORT}`);
    // server.js
    const { initAnalyticsService } = require("./routes/analyticsService");
    (async () => {
      try {
        await initAnalyticsService();
        console.log("Analytics DB initialized on startup");
      } catch (err) {
        console.error("Analytics DB initialization failed:", err.message);
      }
    })();

      // Log startup event
      try {
        await createLog("system", {
          event_type: "SERVER_START",
          category: "infrastructure",
          action: `Server started on port ${PORT}`,
          status: "success",
          severity: "info",
          system_context: {
            host: os.hostname(),
            platform: os.platform(),
            node_version: process.version,
          }
        });
      } catch (err) {
        console.error("❗ Startup log failed:", err.message);
      }
    });

    // -------------------------
    // Graceful Shutdown
    // -------------------------
    process.on("SIGINT", async () => {
      console.log("🔻 SIGINT received, shutting down gracefully...");

      try {
        await createLog("system", {
          event_type: "SERVER_SHUTDOWN",
          category: "infrastructure",
          action: "Server shutting down (SIGINT)",
          status: "success",
        });
      } catch (_) {}

      process.exit(0);
    });

  } catch (err) {
    console.error("❌ Fatal Startup Error:", err.message);
    process.exit(1);
  }
}

startServer();
