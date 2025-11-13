require("dotenv").config();
const express = require("express");
const cors = require("cors");
const logRoutes = require("./routes/logRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const logRequest = require("./routes/logMiddleware");

const app = express();

app.enable("trust proxy"); // detect public IP behind CDN/load balancer
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const listings = require('./routes/listings');
app.use('/api/listings', listings);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// after other routes
const genDesc = require('./routes/generateDescription');
app.use('/api/generate_description', genDesc);

// attach log middleware
app.use(logRequest);
app.use("/api/logs", logRoutes);
app.use("/api/analytics", analyticsRoutes);

module.exports = app;