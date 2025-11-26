// models/logs/buyerEvent.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const BaseEvent = require("./baseEvent");

/* ---------------------- CART ITEM ---------------------- */
const CartItemSchema = new Schema(
  {
    listing_id: { type: String, default: null },
    title: { type: String, default: null },
    artist_id: { type: String, default: null },
    qty: { type: Number, default: null },
    unit_price: { type: Number, default: null },
    currency: { type: String, default: null },
    applied_discount: { type: Number, default: null },
  },
  { _id: false }
);

/* ---------------------- CART ---------------------- */
const CartSchema = new Schema(
  {
    cart_id: { type: String, default: null },
    buyer_id: { type: String, default: null },
    items: { type: [CartItemSchema], default: [] },
    subtotal: { type: Number, default: null },
    shipping_fee: { type: Number, default: null },
    tax: { type: Number, default: null },
    total: { type: Number, default: null },
    last_updated_at: { type: Date, default: null },
  },
  { _id: false }
);

/* ---------------------- CHECKOUT ---------------------- */
const CheckoutSchema = new Schema(
  {
    checkout_id: { type: String, default: null },
    cart_id: { type: String, default: null },
    buyer_id: { type: String, default: null },
    payment_method: { type: String, default: null },
    payment_gateway: { type: String, default: null },
    shipping_address_id: { type: String, default: null },
    shipping_option: { type: String, default: null },
    promotion_applied: { type: String, default: null },
    checkout_started_at: { type: Date, default: null },
    checkout_completed_at: { type: Date, default: null },
    checkout_status: { type: String, default: null },
  },
  { _id: false }
);

/* ---------------------- SEARCH CONTEXT ---------------------- */
const SearchContextSchema = new Schema(
  {
    query: { type: String, default: null },
    filters: { type: Schema.Types.Mixed, default: {} },
    results_count: { type: Number, default: null },
    search_duration_ms: { type: Number, default: null },
    page: { type: Number, default: null },
  },
  { _id: false }
);

/* ---------------------- MAIN BUYER EVENT ---------------------- */
const BuyerEventSchema = new Schema(
  {
    buyer_profile: {
      buyer_id: { type: String, default: null },
      loyalty_tier: { type: String, default: null },
      first_seen: { type: Date, default: null },
      last_seen: { type: Date, default: null },
      email_hash: { type: String, default: null },
    },

    cart: { type: CartSchema, default: {} },
    checkout: { type: CheckoutSchema, default: {} },

    order_reference: {
      order_id: { type: String, default: null },
      order_total: { type: Number, default: null },
      payment_status: { type: String, default: null },
      transaction_id: { type: String, default: null },
    },

    search: { type: SearchContextSchema, default: {} },

    behavior: {
      page_url: { type: String, default: null },
      referrer_url: { type: String, default: null },
      click_target: { type: String, default: null },
      scroll_depth_pct: { type: Number, default: null },
      dwell_time_sec: { type: Number, default: null },
      item_position: { type: Number, default: null },
    },

    attribution: {
      campaign_id: { type: String, default: null },
      source: { type: String, default: null },
      medium: { type: String, default: null },
      click_id: { type: String, default: null },
    },

    risk: {
      risk_score: { type: Number, default: null },
      flags: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

/* ---------------------- MERGE BASE EVENT ---------------------- */
BuyerEventSchema.add(BaseEvent);

module.exports = BuyerEventSchema;
