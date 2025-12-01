const mongoose = require("mongoose");
const { Schema } = mongoose;

const ProductPerformanceSchema = new Schema({
  listing_id: String,
  title: String,
  category: String,
  artist_id: String,
  units_sold: Number,
  revenue: Number,
  refunds: Number,
  conversion_rate_pct: Number,
}, { _id: false });

const CategoryPerformanceSchema = new Schema({
  category: String,
  orders: Number,
  revenue: Number,
  avg_order_value: Number,
  units_sold: Number,
}, { _id: false });

const ArtistPerformanceSchema = new Schema({
  artist_id: String,
  artist_name: String,
  orders: Number,
  revenue: Number,
  avg_ticket_size: Number,
  cancel_rate_pct: Number,
}, { _id: false });

const ChannelBreakdownSchema = new Schema({
  channel: String,
  sessions: Number,
  orders: Number,
  revenue: Number,
  conversion_rate_pct: Number,
}, { _id: false });

const SalesSummarySchema = new Schema({
  period: {
    type: String,
    enum: ["daily", "weekly", "monthly", "quarterly"],
    index: true
  },

  start_date: Date,
  end_date: Date,

  totals: {
    orders: Number,
    revenue: Number,
    refunds: Number,
    profit_margin_pct: Number,
    gross_sales: Number,
    net_sales: Number,
  },

  products: [ProductPerformanceSchema],
  categories: [CategoryPerformanceSchema],
  artists: [ArtistPerformanceSchema],
  channels: [ChannelBreakdownSchema],

  currency: { type: String, default: "INR" },

  etl_metadata: {
    generator: String,
    job_id: String,
    processed_at: Date,
  },

  timestamp_utc: { type: Date, default: () => new Date() },
  timestamp_ist: { type: Date, default: () => new Date(Date.now() + 19800000) },
}, { timestamps: true });

module.exports = SalesSummarySchema;
