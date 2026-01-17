// backend/app.js
require("dotenv").config();
const mongoose = require("mongoose");

// Database connection helper to prevent multiple connections in serverless
const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.ML_DB,
  });
  console.log("MongoDB Connected");
};

const cors = require("cors");
const express = require("express");
const cookieParser = require("cookie-parser");
const logRoutes = require("./routes/logRoutes");
const attachLogger = require("./middleware/logMiddleware");
const analyticsRoutes = require("./routes/analyticsRoutes");
const app = express();

// Middleware to ensure DB is connected before handling routes
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).send("Database Connection Error");
  }
});

app.enable("trust proxy"); // detect public IP behind CDN/load balancer

const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  'http://localhost:5173', // Default Vite port
  'http://localhost:5000'
];

app.use(cors({
  origin: (origin, callback) => {
    // 1. Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // 2. Allow specific origins or any vercel.app subdomain
    const isVercelSubdomain = origin.endsWith('.vercel.app');
    const isAllowedCustom = allowedOrigins.includes(origin);

    if (isAllowedCustom || isVercelSubdomain) {
      return callback(null, true);
    } else {
      return callback(new Error('CORS policy: This origin is not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-network-type', 'x-timezone', 'x-network-effective-type', 'x-network-rtt'] // Add others as needed
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// parse cookies for refresh token handling
app.use(cookieParser());

// small helper: attach raw refresh token value from cookie to req for convenience
app.use((req, res, next) => {
  req.refreshTokenCookie = req.cookies?.refresh_token || null;
  next();
});

// Response tracking middleware (keep early)
const { responseTracker } = require('./middleware/responseTracker');
app.use(responseTracker);

// HealthMonitor hookup
const healthMonitor = require('./services/logs/healthMonitor');
app.use((req, res, next) => {
  res.on('finish', () => {
    const isError = res.statusCode >= 400;
    healthMonitor.recordRequest(isError);
  });
  next();
});

// AutoLoggingEngine BEFORE routes
const AutoLoggingEngine = require("./services/logs/autoLoggingEngine");
new AutoLoggingEngine(app);

// existing routes remain unchanged
const listings = require('./routes/listings');
app.use('/api/listings', listings);

const drafts = require('./routes/listingDrafts');
app.use('/api/drafts', drafts);

const artisanRoutes = require('./routes/artisans');
app.use('/api/artisans', artisanRoutes);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const wishlistRoutes = require('./routes/wishlist');
app.use('/api/wishlist', wishlistRoutes);

const cartRoutes = require('./routes/cart');
app.use('/api/cart', cartRoutes);

const addressRoutes = require('./routes/addresses');
app.use('/api/addresses', addressRoutes);

const orderRoutes = require('./routes/orders');
app.use('/api/orders', orderRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

const reviewRoutes = require('./routes/reviews');
app.use('/api/reviews', reviewRoutes);

const adminChatRoutes = require('./routes/adminChat');
app.use('/api/admin-chat', adminChatRoutes);

const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);

// enable logging middleware AFTER application routes
app.use(attachLogger);

// attach log ingestion endpoint
app.use("/api/logs", logRoutes);
app.use("/api/analytics", analyticsRoutes);

// keep perf middleware last
const perfMiddleware = require("./middleware/perfMiddleware");
app.use(perfMiddleware);

module.exports = app;