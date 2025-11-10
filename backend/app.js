require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
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

module.exports = app;