const mongoose = require('mongoose');
const listingSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  category: String,
  images: [String],
  metadata: { type: Object, default: {} },
  location: {
    city: String,
    country: String,
    coordinates: { type: [Number], default: undefined } // [lng, lat]
  },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Listing', listingSchema);
