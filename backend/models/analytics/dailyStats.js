// models/analytics/dailyStats.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

/* ----------------------- SUBSCHEMAS ----------------------- */

const RevenueSchema = new Schema({
  gross_revenue: Number,
  net_revenue: Number,
  refunds: Number,
  commission_collected: Number,
  taxes_collected: Number,
  platform_discount_cost: Number,
  currency: { type: String, default: "INR" },
}, { _id: false });

const UserStatsSchema = new Schema({
  total_users: Number,
  new_users: Number,
  active_users: Number,
  returning_users: Number,
  churn_rate_pct: Number,
  new_artists: Number,
  active_artists: Number,
  inactive_artists: Number,
}, { _id: false });

const EngagementSchema = new Schema({
  avg_session_duration_sec: Number,
  bounce_rate_pct: Number,
  conversion_rate_pct: Number,
  avg_pages_per_session: Number,
  avg_events_per_session: Number,
  repeat_visits: Number,
}, { _id: false });

const SystemMetricsSchema = new Schema({
  avg_response_time_ms: Number,
  p95_latency_ms: Number,
  uptime_percent: Number,
  error_rate_pct: Number,
  peak_cpu_usage_pct: Number,
  peak_memory_mb: Number,
  infra_cost_estimate_inr: Number,
}, { _id: false });

const GeoBreakdownSchema = new Schema({
  country: String,
  region: String,
  users: Number,
  artists: Number,
  revenue: Number,
  orders: Number,
}, { _id: false });

const ETLMetadataSchema = new Schema({
  etl_job_id: String,
  source_collections: [String],
  processed_events: Number,
  dropped_events: Number,
  window_start: Date,
  window_end: Date,
  generated_at: Date,
  generator_service: String,
  notes: String
}, { _id: false });

/* ----------------------- MAIN SCHEMA ----------------------- */
const DailyStatsSchema = new Schema({
  date: { type: Date, index: true, required: true },

  revenue: RevenueSchema,
  users: UserStatsSchema,
  engagement: EngagementSchema,
  system: SystemMetricsSchema,

  geo_breakdown: [GeoBreakdownSchema],

  top_categories: [{
    name: String,
    orders: Number,
    revenue: Number,
    avg_order_value: Number
  }],

  top_artists: [{
    artist_id: String,
    name: String,
    revenue: Number,
    units_sold: Number
  }],

  data_quality_score: Number,
  anomalies_detected: [String],

  etl_metadata: ETLMetadataSchema,

  timestamp_utc: { type: Date, default: () => new Date() },
  timestamp_ist: { type: Date, default: () => new Date(Date.now() + 19800000) },
}, { timestamps: true });

module.exports = DailyStatsSchema;
