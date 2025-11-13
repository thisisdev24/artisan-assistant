// config/connectLogDB.js
const mongoose = require("mongoose");

let logConnection;

async function connectLogDB() {
  if (logConnection) return logConnection;
  logConnection = await mongoose.createConnection(
    process.env.MONGO_URI_LOGS,
    { useNewUrlParser: true, useUnifiedTopology: true }
  );
  console.log("✅ Connected to artisan_logs");
  return logConnection;
}

module.exports = { connectLogDB };
