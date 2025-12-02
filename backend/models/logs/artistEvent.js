// models/logs/artistEvent.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const BaseEvent = require("./baseEvent");

/* ---------------------- MEDIA ---------------------- */
const MediaSchema = new Schema(
  {
    url: { type: String, default: null },
    mime_type: { type: String, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    hash: { type: String, default: null },
  },
  { _id: false }
);

/* ---------------------- LISTING ---------------------- */
const ListingSchema = new Schema(
  {
    listing_id: { type: String, default: null },
    title: { type: String, default: null },
    description: { type: String, default: null },
    category: { type: String, default: null },
    subcategory: { type: String, default: null },
    tags: { type: [String], default: [] },
    price: { type: Number, default: null },
    currency: { type: String, default: null },
    sku: { type: String, default: null },
    stock: { type: Number, default: null },
    status: { type: String, default: null },
    media: { type: [MediaSchema], default: [] },
    created_at: { type: Date, default: null },
    updated_at: { type: Date, default: null },
  },
  { _id: false }
);

/* ---------------------- PROMOTION ---------------------- */
const PromotionSchema = new Schema(
  {
    promo_id: { type: String, default: null },
    type: { type: String, default: null },
    discount_pct: { type: Number, default: null },
    starts_at: { type: Date, default: null },
    ends_at: { type: Date, default: null },
    target_listings: { type: [String], default: [] },
    budget: { type: Number, default: null },
    status: { type: String, default: null },
  },
  { _id: false }
);

/* ---------------------- SALES METRICS ---------------------- */
const SalesMetricsSchema = new Schema(
  {
    impressions: { type: Number, default: null },
    clicks: { type: Number, default: null },
    add_to_cart: { type: Number, default: null },
    purchases: { type: Number, default: null },
    revenue: { type: Number, default: null },
    conversion_rate: { type: Number, default: null },
  },
  { _id: false }
);

/* ---------------------- MAIN ARTIST EVENT ---------------------- */
const ArtistEventSchema = new Schema(
  {
    artist_profile: {
      artist_id: { type: String, default: null },
      display_name: { type: String, default: null },
      verified: { type: Boolean, default: false },
      join_date: { type: Date, default: null },
      languages: { type: [String], default: [] },
    },

    listing: { type: ListingSchema, default: {} },
    promotion: { type: PromotionSchema, default: {} },

    inventory_change: {
      change_type: { type: String, default: null },
      old_stock: { type: Number, default: null },
      new_stock: { type: Number, default: null },
      old_price: { type: Number, default: null },
      new_price: { type: Number, default: null },
      reason: { type: String, default: null },
      effective_at: { type: Date, default: null },
    },

    sales_metrics: { type: SalesMetricsSchema, default: {} },

    moderation: {
      takedown_id: { type: String, default: null },
      moderator_id: { type: String, default: null },
      reason: { type: String, default: null },
      action: { type: String, default: null },
      appeal_allowed: { type: Boolean, default: false },
    },

    campaign: {
      campaign_id: { type: String, default: null },
      utm: { type: Schema.Types.Mixed, default: {} },
    },
  },
  { timestamps: false }
);

/* ---------------------- MERGE BASE EVENT ---------------------- */
ArtistEventSchema.add(BaseEvent);

module.exports = ArtistEventSchema;
