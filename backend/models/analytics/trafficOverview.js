const mongoose = require("mongoose");
const { Schema } = mongoose;

const SourceSchema = new Schema({
  source: String,
  medium: String,
  campaign_id: String,
  sessions: Number,
  users: Number,
  conversions: Number,
  conversion_rate_pct: Number,
}, { _id: false });

const DeviceSchema = new Schema({
  device_type: String,
  os: String,
  browser: String,
  sessions: Number,
  users: Number,
  bounce_rate_pct: Number,
  avg_session_duration_sec: Number,
}, { _id: false });

const GeoSchema = new Schema({
  country: String,
  region: String,
  city: String,
  sessions: Number,
  users: Number,
  revenue: Number,
}, { _id: false });

const TrafficOverviewSchema = new Schema({
  date: { type: Date, index: true },

  total_sessions: Number,
  total_users: Number,
  avg_session_duration_sec: Number,
  bounce_rate_pct: Number,

  sources: [SourceSchema],
  devices: [DeviceSchema],
  geo: [GeoSchema],

  attribution: {
    top_campaigns: [String],
    assisted_conversions: Number,
  },

  anomaly_score: Number,

  timestamp_utc: { type: Date, default: () => new Date() },
  timestamp_ist: { type: Date, default: () => new Date(Date.now() + 19800000) },
}, { timestamps: true });

module.exports = TrafficOverviewSchema;
