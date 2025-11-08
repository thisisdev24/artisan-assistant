const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  key: String,
  url: String,
  thumbnailUrl: String
}, { _id: false });

const listingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  images: [ImageSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Listing', listingSchema);
