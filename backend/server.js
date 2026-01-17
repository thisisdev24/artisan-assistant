// backend/server.js
require("dotenv").config();
const mongoose = require("mongoose");
const http = require("http");
const os = require("os");
const app = require("./app");
// Load analytics models on startup
const { loadAnalyticsModels } = require("./models/analytics");

const PORT = process.env.BACKEND_PORT;
const MONGO_URI = process.env.MONGO_URI; // MAIN DB
const { getLogModels } = require("./models/logs");

async function startServer() {
  try {
    // ------------------------------
    // MONGODB CONNECTION (UPDATED)
    // ------------------------------
    if (!MONGO_URI) {
      console.error("❌ MONGO_URI is not set in environment variables");
      console.error("   Please set MONGO_URI in your .env file");
      process.exit(1);
    }

    mongoose.connect(MONGO_URI, {
      dbName: "test",
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 second timeout
    })
      .then(() => console.log("✅ MongoDB connected successfully"))
      .catch(err => {
        console.error("\n❌ MongoDB connection error:", err.message);
        console.error("\n📋 To fix this issue:");
        console.error("   1. If using MongoDB Atlas:");
        console.error("      → Go to: https://cloud.mongodb.com/");
        console.error("      → Navigate to: Network Access → IP Access List");
        console.error("      → Click 'Add IP Address'");
        console.error("      → Add your current IP or use '0.0.0.0/0' (allows all IPs - for dev only)");
        console.error("   2. Verify MONGO_URI in your .env file is correct");
        console.error("   3. Check your MongoDB connection string format:");
        console.error("      → mongodb+srv://username:password@cluster.mongodb.net/dbname");
        console.error("   4. For local MongoDB, use: mongodb://localhost:27017/artisan-assistant");
        console.error("\n💡 Tip: You can find your current IP at: https://whatismyipaddress.com/\n");
        process.exit(1); // Main DB is required, so exit
      });

    // ------------------------------
    // LOG DB CONNECTION (UPDATED) - Optional
    // ------------------------------
    try {
      await getLogModels();
    } catch (err) {
      console.warn("⚠️  Log DB connection failed, continuing without logging features");
    }

    // ------------------------------
    // ANALYTICS DB CONNECTION (UPDATED) - Optional
    // ------------------------------
    try {
      const analyticsModels = await loadAnalyticsModels();
      
      // Only load cron jobs if analytics DB is connected and models are available
      if (analyticsModels && analyticsModels.DailyStats) {
        try {
          require("./cron/dailyAnalytics.cron");
          require("./cron/hourlyAnalytics.cron");
          require("./cron/weeklyAnalytics.cron");
          console.log("✅ Analytics cron jobs loaded");
        } catch (cronErr) {
          console.warn("⚠️  Analytics cron jobs not loaded:", cronErr.message);
        }
      } else {
        console.warn("⚠️  Analytics models not available, skipping cron jobs");
      }
    } catch (err) {
      console.warn("⚠️  Analytics DB connection failed, continuing without analytics features");
    }

    // -------------------------
    // Start Server
    // -------------------------
    const server = http.createServer(app);
    server.listen(PORT, async () => {
      console.log(`⚡ Server running on port ${PORT}`);

    });

  } catch (err) {
    console.error("❌ Fatal Startup Error:", err.message);
    process.exit(1);
  }
}

startServer();
