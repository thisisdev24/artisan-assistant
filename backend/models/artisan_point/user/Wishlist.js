// models/artisan/user/Wishlist.js
/**
 * Wishlist
 * Per-user saved listings for later. One wishlist per user.
 */
const mongoose = require('mongoose');

const WishlistSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    listing_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }]
}, { timestamps: true });

WishlistSchema.index({ user_id: 1 }, { unique: true });

module.exports = mongoose.model("Wishlist", WishlistSchema, "wishlist");
