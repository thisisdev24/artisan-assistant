const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  key: String,
  url: String,
  thumbnailUrl: String
}, { _id: false });

const listingSchema = new mongoose.Schema({
  main_category: { type: String },
  title: { type: String, required: true },
  average_rating: { type: Number },
  rating_number: { type: Number },
  features: { type: [String] },
  description: { type: String },
  price: { type: Number },
  images: { type: [String] },
  videos: { type: [String] },
  store: { type: String },
  categories: { type: [String] },
  details: { type: mongoose.Schema.Types.Mixed },
  parent_asin: { type: String },
  createdAt: { type: Date, default: Date.now },
  faiss_vector_id: { type: Number, default: null },
  embedding_created_at: { type: Date, default: null }
});

module.exports = mongoose.model('Listing', listingSchema);
