require("dotenv").config();
const mongoose = require("mongoose");
const http = require("http");
const os = require("os");
const app = require("./app");
const Listing = require("./models/Listing");


const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI; // MAIN DB
const listingDraftsRouter = require('./routes/listingDrafts');
const listingsRouter = require('./routes/listings');
const { getLogModels } = require("./models/logs");

// mount draft routes BEFORE or AFTER existing routes — both fine since paths are unique
app.use('/api/listings', listingDraftsRouter);
app.use('/api/listings', listingsRouter);


async function startServer() {
  try {

    await getLogModels();
    // -------------------------
    // Connect MAIN database
    // -------------------------
    await mongoose.connect(MONGO_URI);
    console.log("✅ Main MongoDB connected");

    const server = http.createServer(app);

    // -------------------------
    // Start Server
    // -------------------------
    server.listen(PORT, async () => {
      console.log(`⚡ Server running on port ${PORT}`);

    });

  } catch (err) {
    console.error("❌ Fatal Startup Error:", err.message);
    process.exit(1);
  }
}

startServer();
