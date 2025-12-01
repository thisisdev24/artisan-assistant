// db/connectAnalyticsDB.js
const mongoose = require("mongoose");

let analyticsConnection;

async function connectAnalyticsDB() {
  if (analyticsConnection) return analyticsConnection;

  const uri = process.env.MONGO_URI_ANALYTICS;
  if (!uri) {
    console.warn("⚠️  MONGO_URI_ANALYTICS is not set. Analytics features will be disabled.");
    return null;
  }

  const conn = mongoose.createConnection(uri, {
    dbName: "artisan_analytics",
    serverSelectionTimeoutMS: 5000,
  });

  conn.on("connected", () => {
    console.log("✅ Connected to artisan_analytics");
  });

  conn.on("error", (err) => {
    console.error("❌ Analytics DB Error:", err.message);
    console.error("⚠️  Analytics features will be disabled. To fix:");
    console.error("   1. Check your MongoDB Atlas IP whitelist: https://www.mongodb.com/docs/atlas/security-whitelist/");
    console.error("   2. Verify MONGO_URI_ANALYTICS in your .env file");
  });

  // Handle connection timeout
  try {
    await conn.asPromise();
  } catch (err) {
    console.error("⚠️  Analytics DB connection failed:", err.message);
    console.error("⚠️  Server will continue without analytics features");
    return null;
  }

  analyticsConnection = conn;
  return analyticsConnection;
}

module.exports = { connectAnalyticsDB };
