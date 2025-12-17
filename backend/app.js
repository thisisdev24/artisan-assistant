// backend/app.js
require("dotenv").config();
const cors = require("cors");
const express = require("express");
const cookieParser = require("cookie-parser");
const logRoutes = require("./routes/logRoutes");
const attachLogger = require("./middleware/logMiddleware");
const analyticsRoutes = require("./routes/analyticsRoutes");
const app = express();

app.enable("trust proxy"); // detect public IP behind CDN/load balancer

// Use an env var for allowed frontend origin
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// Allow credentials and the specific origin (not '*')
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like curl, mobile)
    if (!origin) return callback(null, true);
    // Allow any localhost for development
    if (origin.startsWith('http://localhost') || origin === FRONTEND_ORIGIN) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy: This origin is not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'x-network-type',
    'x-network-effective-type',
    'x-network-downlink',
    'x-network-rtt',
    'x-network-save-data',
    'x-device-memory',
    'x-device-platform',
    'x-device-hardware-concurrency',
    'x-timezone',
  ],
  credentials: true
}));

// Preflight - Allow PATCH method
app.options('*', cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.startsWith('http://localhost') || origin === FRONTEND_ORIGIN) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy: This origin is not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'x-network-type',
    'x-network-effective-type',
    'x-network-downlink',
    'x-network-rtt',
    'x-network-save-data',
    'x-device-memory',
    'x-device-platform',
    'x-device-hardware-concurrency',
    'x-timezone',
  ],
  credentials: true
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

// other existing routes unchanged
const generateDescRouter = require("./routes/generateDescriptionProxy");
app.use("/api", generateDescRouter);

const genSearchRes = require('./routes/generateSearchResults');
app.use('/api/generate_description', genSearchRes);

// enable logging middleware AFTER application routes
app.use(attachLogger);

// attach log ingestion endpoint
app.use("/api/logs", logRoutes);
app.use("/api/analytics", analyticsRoutes);

// keep perf middleware last
const perfMiddleware = require("./middleware/perfMiddleware");
app.use(perfMiddleware);

module.exports = app;
