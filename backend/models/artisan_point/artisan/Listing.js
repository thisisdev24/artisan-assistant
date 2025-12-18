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
  // NEW: color detection auto-fill
  // detected_colors: array of objects { hex: "#rrggbb", percentage: 0.45, name: "red", source_image: "https://..." }
  // NEW: color detection auto-fill
  // detected_colors: array of objects { hex: "#rrggbb", percentage: 0.45, name: "red", source_image: "https://..." }
  detected_colors: [
    {
      hex: String,
      percentage: Number,
      name: String,
      source_image: String
    }
  ],

  // suggested main color (top color hex) for quick form fill
  suggested_main_color: String,

  /**
   * CLIP zero-shot tagging results (auto-suggested labels per image).
   * Stored as an array with one entry per image processed.
   *
   * Example shape:
   * clip_tags: [
   *   {
   *     image: "https://.../listing_abc_0.jpg",
   *     materials: [{ label: "cotton", score: 0.82 }, ...],
   *     styles: [{ label: "traditional", score: 0.61 }, ...],
   *     clip_colors: [{ label: "pastel", score: 0.4 }, ...],
   *     merged_colors: ["#c3b5a3", "beige", "pastel"],
   *     occasions: [{ label: "gift", score: 0.55 }, ...]
   *   }, ...
   * ]
   */
  clip_tags: [
    {
      image: String,
      materials: [
        {
          label: String,
          score: Number
        }
      ],
      styles: [
        {
          label: String,
          score: Number
        }
      ],
      clip_colors: [
        {
          label: String,
          score: Number
        }
      ],
      // merged_colors contains canonical color tokens / hex (array of strings)
      merged_colors: [String],
      occasions: [
        {
          label: String,
          score: Number
        }
      ]
    }
  ],

  // Optional: consolidated suggested tags for the listing (deduped, for UI quick-fill)
  suggested_tags: {
    materials: [String],
    styles: [String],
    colors: [String],     // canonical colors (hex or token)
    occasions: [String]
  },

  // ML metadata: keep track of when the tags were last updated
  clip_tags_updated_at: Date,

  parent_asin: String,
  faiss_vector_id: Number,
  embedding_created_at: Date,

  artisan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', index: true },
  variants: [VariantSchema],
  slug: { type: String, index: true },
  meta_title: String,
  meta_description: String,
  deleteRequested: {
    type: Boolean,
    default: false
  },
  deleteRequestedAt: {
    type: Date
  }
}, { timestamps: true });

listingSchema.index({ createdAt: -1 });
listingSchema.index({ artisan_id: 1, status: 1, createdAt: -1 });
listingSchema.index({ 'variants.sku': 1 });

module.exports = mongoose.model("Listing", listingSchema, "listings");
