// db/connectAnalyticsDB.js
const mongoose = require("mongoose");

let analyticsConnection;

async function connectAnalyticsDB() {
  if (analyticsConnection) return analyticsConnection;

  analyticsConnection = await mongoose.createConnection(
    process.env.MONGO_URI_ANALYTICS,
    {
      dbName: "artisan_analytics",
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  );

  console.log("🟩 Connected to artisan_analytics DB");
  return analyticsConnection;
}

module.exports = { connectAnalyticsDB };
