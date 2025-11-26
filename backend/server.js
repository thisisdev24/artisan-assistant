require("dotenv").config();
const http = require("http");
const os = require("os");
const app = require("./app");
const Listing = require("./models/Listing");

// Load system lifecycle logging (OPTION 3)
require("./startup/systemLogs");

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
    // Connect MAIN database
    // -------------------------
    await connect();
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
