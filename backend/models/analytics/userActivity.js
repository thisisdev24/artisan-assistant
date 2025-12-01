const mongoose = require("mongoose");
const { Schema } = mongoose;

const SessionStatsSchema = new Schema({
  sessions: Number,
  avg_session_duration_sec: Number,
  total_time_spent_sec: Number,
  pages_viewed: Number,
  items_viewed: Number,
  unique_devices: Number,
}, { _id: false });

const PurchaseStatsSchema = new Schema({
  total_orders: Number,
  total_spent: Number,
  avg_order_value: Number,
  cart_abandon_rate_pct: Number,
  refund_count: Number,
}, { _id: false });

const InteractionStatsSchema = new Schema({
  clicks: Number,
  scrolls: Number,
  searches: Number,
  likes: Number,
  reviews_written: Number,
  wishlist_adds: Number,
  shares: Number,
}, { _id: false });

const DeviceBreakdownSchema = new Schema({
  device_type: String,
  os: String,
  sessions: Number,
  avg_duration_sec: Number,
}, { _id: false });

const UserActivitySchema = new Schema({
  user_id: { type: String, index: true },
  role: String,

  date: { type: Date, index: true },

  session_stats: SessionStatsSchema,
  purchase_stats: PurchaseStatsSchema,
  interaction_stats: InteractionStatsSchema,

  device_breakdown: [DeviceBreakdownSchema],

  top_categories_viewed: [String],
  top_artists_viewed: [String],

  geo: {
    country: String,
    region: String,
    city: String,
  },

  loyalty_tier: String,
  risk_score: Number,

  timestamp_utc: { type: Date, default: () => new Date() },
  timestamp_ist: { type: Date, default: () => new Date(Date.now() + 19800000) },

  etl_metadata: {
    job_id: String,
    generated_at: Date,
    window_start: Date,
    window_end: Date,
    source: String,
  },

}, { timestamps: true });

module.exports = UserActivitySchema;
