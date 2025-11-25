// const mongoose = require('mongoose');

// const ImageSchema = new mongoose.Schema({
//   thumb: String,
//   large: String,
//   variant: String,
//   hi_res: String
// }, { _id: false });

// const VideoSchema = new mongoose.Schema({
//   key: String,
//   url: String
// }, { _id: false });

// const listingSchema = new mongoose.Schema({
//   main_category: { type: String },
//   title: { type: String, required: true },
//   average_rating: { type: Number },
//   rating_number: { type: Number },
//   features: { type: [String] },
//   description: { type: String },
//   price: { type: Number },
//   images: { type: [ImageSchema], default: [] },
//   videos: { type: [VideoSchema], default: [] },
//   store: { type: String },
//   categories: { type: [String] },
//   details: { type: mongoose.Schema.Types.Mixed },
//   parent_asin: { type: String },
//   createdAt: { type: Date, default: Date.now },
//   faiss_vector_id: { type: Number, default: null },
//   embedding_created_at: { type: Date, default: null }
// });

// // IMPORTANT: create an index on createdAt to support sort({createdAt: -1})
// listingSchema.index({ createdAt: -1 });

// module.exports = mongoose.model('Listing', listingSchema);
// models/Listing.js
const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  thumb: String,
  large: String,
  hi_res: String,
  key: String // optional stored key if you want to track uploaded storage key
}, { _id: false });

const DimensionsSchema = new mongoose.Schema({
  height: { type: Number, default: null }, // in cm
  length: { type: Number, default: null }, // in cm
  width:  { type: Number, default: null }, // in cm
  weight: { type: Number, default: null }  // in grams (or kg depending on your app)
}, { _id: false });

const ListingSchema = new mongoose.Schema({
  main_category: { type: String, default: 'Handmade' },
  title: { type: String, required: true },
  subtitle: { type: String },
  description: { type: mongoose.Schema.Types.Mixed }, // string or array
  features: { type: [String], default: [] },
  price: { type: Number, required: true },

  images: { type: [ImageSchema], default: [] },
  imageUrl: { type: String, default: null },

  average_rating: { type: Number, default: 0 },
  rating_number: { type: Number, default: 0 },

  // stock fields
  stock: { type: Number, default: 0 },
  stock_available: { type: Boolean, default: false },

  // dimensions
  dimensions: { type: DimensionsSchema, default: {} },

  // publish state: draft | published
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },

  // seller/store/artisan
  store: { type: String, default: null },
  seller: { type: mongoose.Schema.Types.Mixed, default: null },

  // misc
  categories: { type: [String], default: [] },
  details: { type: mongoose.Schema.Types.Mixed, default: null },
  parent_asin: { type: String, default: null },

}, { timestamps: true });

module.exports = mongoose.model('Listing', ListingSchema);
