// buyerEvent.js
const mongoose = require("mongoose");
const BaseEvent = require("./baseEvent");
const { Schema } = mongoose;

const CartItemSchema = new Schema({
  listing_id: String,
  title: String,
  artist_id: String,
  qty: Number,
  unit_price: Number,
  currency: String,
  applied_discount: Number,
}, { _id: false });

const CartSchema = new Schema({
  cart_id: String,
  buyer_id: String,
  items: [CartItemSchema],
  subtotal: Number,
  shipping_fee: Number,
  tax: Number,
  total: Number,
  last_updated_at: Date,
}, { _id: false });

const CheckoutSchema = new Schema({
  checkout_id: String,
  cart_id: String,
  buyer_id: String,
  payment_method: String,
  payment_gateway: String,
  shipping_address_id: String,
  shipping_option: String,
  promotion_applied: String,
  checkout_started_at: Date,
  checkout_completed_at: Date,
  checkout_status: String, // initiated | failed | success | abandoned
}, { _id: false });

const SearchContextSchema = new Schema({
  query: String,
  filters: Schema.Types.Mixed,
  results_count: Number,
  search_duration_ms: Number,
  page: Number,
}, { _id: false });

const BuyerEventSchema = new Schema({
  buyer_profile: {
    buyer_id: String,
    loyalty_tier: String,
    first_seen: Date,
    last_seen: Date,
    email_hash: String,
  },
  cart: CartSchema,
  checkout: CheckoutSchema,
  order_reference: {
    order_id: String,
    order_total: Number,
    payment_status: String,
    transaction_id: String,
  },
  search: SearchContextSchema,
  behavior: {
    page_url: String,
    referrer_url: String,
    click_target: String,
    scroll_depth_pct: Number,
    dwell_time_sec: Number,
    item_position: Number,
  },
  attribution: {
    campaign_id: String,
    source: String,
    medium: String,
    click_id: String,
  },
  risk: {
    risk_score: Number,
    flags: [String],
  },

}, { timestamps: true });

BuyerEventSchema.add(BaseEvent);

BuyerEventSchema.index({ "buyer_profile.buyer_id": 1 });
BuyerEventSchema.index({ "order_reference.order_id": 1 });

module.exports = BuyerEventSchema;
