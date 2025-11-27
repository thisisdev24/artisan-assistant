require("dotenv").config();
const cors = require("cors");
const express = require("express");
const logRoutes = require("./routes/logRoutes");
//const analyticsRoutes = require("./routes/analyticsRoutes");
const { attachLogger } = require("./middleware/logMiddleware");

const app = express();

app.enable("trust proxy"); // detect public IP behind CDN/load balancer

// Use an env var for allowed frontend origin
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// Allow credentials and the specific origin (not '*')
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like curl, mobile)
    if (!origin) return callback(null, true);
    if (origin === FRONTEND_ORIGIN) return callback(null, true);
    return callback(new Error('CORS policy: This origin is not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Ensure preflight requests are handled
app.options('*', cors({
  origin: FRONTEND_ORIGIN,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Response tracking middleware (must be early to capture all responses)
const { responseTrackerMiddleware } = require('./middleware/responseTracker');
const { healthMonitor } = require('./services/logs/healthMonitor');
app.use(responseTrackerMiddleware);

// Track all requests in health monitor
app.use((req, res, next) => {
  res.on('finish', () => {
    const isError = res.statusCode >= 400;
    healthMonitor.recordRequest(isError);
  });
  next();
});

// Initialize AutoLoggingEngine BEFORE routes (so it can hook all requests)
const AutoLoggingEngine = require("./services/logs/autoLoggingEngine");
new AutoLoggingEngine(app);

const listings = require('./routes/listings');
app.use('/api/listings', listings);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// after other routes
const generateDescRouter = require("./routes/generateDescriptionProxy");
app.use("/api", generateDescRouter);

const genSearchRes = require('./routes/generateSearchResults');
app.use('/api/generate_description', genSearchRes);

// attach log middleware - now ENABLED
app.use(attachLogger);
app.use("/api/logs", logRoutes);
//app.use("/api/analytics", analyticsRoutes);

const perfMiddleware = require("./middleware/perfMiddleware");
app.use(perfMiddleware);

module.exports = app;