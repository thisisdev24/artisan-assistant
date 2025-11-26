// db/connectAnalyticsDB.js
const mongoose = require("mongoose");

let analyticsConnection;

async function connectAnalyticsDB() {
  if (analyticsConnection) return analyticsConnection;

  const conn = mongoose.createConnection(process.env.MONGO_URI_ANALYTICS, {
    dbName: "artisan_analytics",
  });

  conn.on("connected", () => {
    console.log("✅ Connected to artisan_analytics");
  });

  conn.on("error", (err) => {
    console.error("❌ Analytics DB Error:", err.message);
  });

  analyticsConnection = conn;
  return analyticsConnection;
}

module.exports = { connectAnalyticsDB };
