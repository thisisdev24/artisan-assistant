// server.js
require("dotenv").config();
const mongoose = require("mongoose");
const http = require("http");
const app = require("./app");
const Listing = require("./models/Listing");

// Load system lifecycle logging (OPTION 3)
require("./startup/systemLogs");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

async function startServer() {
  try {
    // -------------------------
    // CONNECT MAIN DATABASE
    // -------------------------
    await mongoose.connect(MONGO_URI);
    console.log("✅ Main MongoDB connected");

    // Ensure Listing index
    try {
      await Listing.collection.createIndex({ createdAt: -1 });
      console.log("Ensured index on Listing.createdAt");
    } catch (err) {
      console.warn("Could not create Listing.createdAt index:", err.message);
    }

    // -------------------------
    // START SERVER
    // ------------------------
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`⚡ Server running on port ${PORT}`);
      
    });

  } catch (err) {
    console.error("❌ Fatal Startup Error:", err.message);
    process.exit(1);
  }
}

startServer();
