// backend/models/Listing.js
const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  thumb: String,
  large: String,
  variant: String,
  hi_res: String
}, { _id: false });

const VideoSchema = new mongoose.Schema({
  key: String,
  url: String
}, { _id: false });

const DimensionsSchema = new mongoose.Schema({
  height: { type: Number, default: null }, // in cm
  length: { type: Number, default: null }, // in cm
  width: { type: Number, default: null }, // in cm
  weight: { type: Number, default: null }  // in grams (or kg depending on your app)
}, { _id: false });

const listingSchema = new mongoose.Schema({
  main_category: { type: String },
  title: { type: String, required: true },
  average_rating: { type: Number },
  rating_number: { type: Number },
  features: { type: [String] },
  description: { type: String },
  price: { type: Number },
  images: { type: [ImageSchema], default: [] },
  videos: { type: [VideoSchema], default: [] },
  store: { type: String },
  categories: { type: [String] },
  details: { type: mongoose.Schema.Types.Mixed },
  parent_asin: { type: String },
  createdAt: { type: Date, default: Date.now },
  faiss_vector_id: { type: Number, default: null },
  embedding_created_at: { type: Date, default: null }
});

// IMPORTANT: create an index on createdAt to support sort({createdAt: -1})
listingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Listing', listingSchema);