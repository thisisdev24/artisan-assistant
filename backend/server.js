require("dotenv").config();
const mongoose = require("mongoose");
const http = require("http");
const os = require("os");
const app = require("./app");
const Listing = require("./models/artisan_point/artisan/Listing");
const loadArtisanPointModels = require("./models/artisan_point");

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
    // ------------------------------
    // MONGODB CONNECTION (UPDATED)
    // ------------------------------

    mongoose.connect(MONGO_URI, {
      dbName: "test",
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
      .then(() => console.log("✅MongoDB connected"))
      .catch(err => console.error("MongoDB connection error:", err));

    // ------------------------------
    // LOG DB CONNECTION (UPDATED)
    // ------------------------------
    await getLogModels();

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
