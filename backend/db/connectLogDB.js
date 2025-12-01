// db/connectLogDB.js
const mongoose = require("mongoose");

let logConnection = null;

async function connectLogDB() {
  // keep structure exactly the same
  if (logConnection) return logConnection;

  const uri = process.env.MONGO_URI_LOGS;
  if (!uri) {
    console.warn("⚠️  MONGO_URI_LOGS is not set. Logging features will be disabled.");
    return null; // Return null instead of throwing
  }

  try {
    // keep same call structure
    logConnection = await mongoose
      .createConnection(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      })
      .asPromise();

    console.log("✅Connected to artisan_logs");
  } catch (err) {
    // Don't crash - just warn and return null
    console.error("[Log DB] Connection error:", err.message);
    console.error("⚠️  Logging features will be disabled. To fix:");
    console.error("   1. Check your MongoDB Atlas IP whitelist: https://www.mongodb.com/docs/atlas/security-whitelist/");
    console.error("   2. Verify MONGO_URI_LOGS in your .env file");
    console.error("   3. Server will continue without logging features");
    return null; // Return null instead of throwing
  }

  return logConnection;
}

module.exports = connectLogDB;
