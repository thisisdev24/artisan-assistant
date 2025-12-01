// models/artisan/user/RecentlyViewedItems.js
/**
 * RecentlyViewedItems
 * Stores recently viewed listing snapshots per user for quick retrieval.
 */
const mongoose = require('mongoose');

const RecentlyViewedItemsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  listing_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', index: true },
  viewed_at: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

RecentlyViewedItemsSchema.index({ user_id: 1, listing_id: 1 }, { unique: true });
RecentlyViewedItemsSchema.index({ viewed_at: -1 });

module.exports = mongoose.model("RecentlyViewedItems", RecentlyViewedItemsSchema, "recentlyvieweditems");
