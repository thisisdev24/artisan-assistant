// db/connectLogDB.js
const mongoose = require("mongoose");

let logConnection = null;

async function connectLogDB() {
  // keep structure exactly the same
  if (logConnection) return logConnection;

  const uri = process.env.MONGO_URI_LOGS;
  if (!uri) {
    // improved clarity but same behavior (throws)
    throw new Error("MONGO_URI_LOGS is not set");
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
    // new: clearer error output, without changing structure or flow
    console.error("[Log DB] Connection error:", err.message);
    throw err; // same behavior — surface error
  }

  return logConnection;
}

module.exports = connectLogDB;
