require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const listings = require('./routes/listings');
app.use('/api/listings', listings);

module.exports = app;