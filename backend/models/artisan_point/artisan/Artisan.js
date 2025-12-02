// models/artisan/artisan/Artisan.js
/**
 * Artisan
 * Seller account (artisan). Stores credentials, store metadata, verification state and masked payout preview.
 * Password is excluded by default.
 */
const mongoose = require('mongoose');

const ArtisanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, default: 'seller' },
  store: { type: String, required: true },
  store_slug: { type: String, index: true },
  store_description: { type: String, default: '' },
  store_logo: { type: String, default: '' },
  store_banner: { type: String, default: '' },
  rating: { type: Number, default: 0 },
  rating_count: { type: Number, default: 0 },
  verification: {
    documents: [String],
    status: { type: String, enum: ['unverified', 'pending', 'verified', 'rejected'], default: 'unverified' },
    verified_at: Date
  },
  payout_details_masked: String,
  deleted: { type: Boolean, default: false }
}, { timestamps: true });

ArtisanSchema.index({ email: 1 });
ArtisanSchema.index({ store_slug: 1 });

module.exports = mongoose.model("Artisan", ArtisanSchema, "artisans");
