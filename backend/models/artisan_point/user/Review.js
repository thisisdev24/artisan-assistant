// models/artisan/user/Review.js
/**
 * Review
 * Product reviews posted by buyers. One review per user per listing.
 */
const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    listing_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    rating: { type: Number, required: true },
    text: String,
    images: [String],
    verified_purchase: { type: Boolean, default: false }
}, { timestamps: true });

ReviewSchema.index({ listing_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model("Review", ReviewSchema, "review");
