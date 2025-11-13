// artistEvent.js
const mongoose = require("mongoose");
const BaseEvent = require("./baseEvent");
const { Schema } = mongoose;

const MediaSchema = new Schema({
  url: String,
  mime_type: String,
  width: Number,
  height: Number,
  hash: String,
}, { _id: false });

const ListingSchema = new Schema({
  listing_id: String,
  title: String,
  description: String,
  category: String,
  subcategory: String,
  tags: [String],
  price: Number,
  currency: String,
  sku: String,
  stock: Number,
  status: String, // draft, published, paused, removed
  media: [MediaSchema],
  created_at: Date,
  updated_at: Date,
}, { _id: false });

const PromotionSchema = new Schema({
  promo_id: String,
  type: String,
  discount_pct: Number,
  starts_at: Date,
  ends_at: Date,
  target_listings: [String],
  budget: Number,
  status: String,
}, { _id: false });

const SalesMetricsSchema = new Schema({
  impressions: Number,
  clicks: Number,
  add_to_cart: Number,
  purchases: Number,
  revenue: Number,
  conversion_rate: Number,
}, { _id: false });

const ArtistEventSchema = new Schema({
  artist_profile: {
    artist_id: String,
    display_name: String,
    verified: Boolean,
    join_date: Date,
    languages: [String],
  },
  listing: ListingSchema,
  promotion: PromotionSchema,
  inventory_change: {
    change_type: String, // stock_update | price_update
    old_stock: Number,
    new_stock: Number,
    old_price: Number,
    new_price: Number,
    reason: String,
    effective_at: Date,
  },
  sales_metrics: SalesMetricsSchema,
  moderation: {
    takedown_id: String,
    moderator_id: String,
    reason: String,
    action: String,
    appeal_allowed: Boolean,
  },
  campaign: {
    campaign_id: String,
    utm: Schema.Types.Mixed,
  },

}, { timestamps: true });

ArtistEventSchema.add(BaseEvent);

ArtistEventSchema.index({ "artist_profile.artist_id": 1 });
ArtistEventSchema.index({ "listing.listing_id": 1 });

module.exports = ArtistEventSchema;
