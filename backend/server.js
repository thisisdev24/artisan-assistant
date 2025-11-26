// server.js
require("dotenv").config();
const mongoose = require("mongoose");
const http = require("http");
const app = require("./app");
const Listing = require("./models/Listing");
const { getLogModels } = require("./models/logs");




const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI; // MAIN DB
const listingDraftsRouter = require('./routes/listingDrafts');
const listingsRouter = require('./routes/listings');

// mount draft routes BEFORE or AFTER existing routes — both fine since paths are unique
app.use('/api/listings', listingDraftsRouter);
app.use('/api/listings', listingsRouter);


async function startServer() {
  try {

    // initialize models once on startup
    getLogModels();
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
