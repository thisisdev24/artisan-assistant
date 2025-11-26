require("dotenv").config();
const cors = require("cors");
const express = require("express");
const logRoutes = require("./routes/logRoutes");
//const analyticsRoutes = require("./routes/analyticsRoutes");
const logRequest = require("./middleware/logMiddleware");

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
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  credentials: true
}));

// Ensure preflight requests are handled
app.options('*', cors({
  origin: FRONTEND_ORIGIN,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const listings = require('./routes/listings');
app.use('/api/listings', listings);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// after other routes
const generateDescRouter = require("./routes/generateDescriptionProxy");
app.use("/api", generateDescRouter);

const genSearchRes = require('./routes/generateSearchResults');
app.use('/api/generate_description', genSearchRes);

// attach log middleware
// app.use(logRequest);
app.use("/api/logs", logRoutes);
//app.use("/api/analytics", analyticsRoutes);

const perfMiddleware = require("./middleware/perfMiddleware");
app.use(perfMiddleware);

const AutoLoggingEngine = require("./services/logs/autoLoggingEngine");
new AutoLoggingEngine(app);

module.exports = app;