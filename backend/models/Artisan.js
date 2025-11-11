const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: "seller" // default role
  },
  store: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Artisan", userSchema);
