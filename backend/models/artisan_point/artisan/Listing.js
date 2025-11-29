// models/artisan/artisan/Listing.js
/**
 * Listing
 * Products created by artisans. Stores title, variants, pricing, images, categories, SEO, and artisan link.
 */
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

const VariantSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  title: String,
  attributes: mongoose.Schema.Types.Mixed,
  price: Number,
  mrp: Number,
  stock: Number,
  images: [ImageSchema],
  barcode: String
}, { _id: false });

const listingSchema = new mongoose.Schema({
  main_category: String,
  title: { type: String, required: true },
  average_rating: Number,
  rating_number: Number,
  features: [String],
  description: String,
  price: Number,
  images: [ImageSchema],
  videos: [VideoSchema],
  stock: { type: Number, default: 0 },
  stock_available: { type: Boolean, default: false },
  dimensions: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  store: String,
  categories: [String],
  details: mongoose.Schema.Types.Mixed,
  parent_asin: String,
  faiss_vector_id: Number,
  embedding_created_at: Date,

  artisan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', index: true },
  variants: [VariantSchema],
  slug: { type: String, index: true },
  meta_title: String,
  meta_description: String,
  deleted: { type: Boolean, default: false }
}, { timestamps: true });

listingSchema.index({ createdAt: -1 });
listingSchema.index({ artisan_id: 1, status: 1, createdAt: -1 });
listingSchema.index({ 'variants.sku': 1 });

module.exports = mongoose.model("Listing", listingSchema, "listings");
