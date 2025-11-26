require("dotenv").config();
const http = require("http");
const os = require("os");
const app = require("./app");
const connect = require("./db/connectDB");
const { createLog } = require("./routes/loggerService");

const PORT = process.env.PORT || 5000;
const listingDraftsRouter = require('./routes/listingDrafts');
const listingsRouter = require('./routes/listings');

// mount draft routes BEFORE or AFTER existing routes — both fine since paths are unique
app.use('/api/listings', listingDraftsRouter);
app.use('/api/listings', listingsRouter);


async function startServer() {
  try {
    // -------------------------
    // Connect MAIN database
    // -------------------------
    await connect();
    console.log("✅ Main MongoDB connected");

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
