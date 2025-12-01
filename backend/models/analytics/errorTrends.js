const mongoose = require("mongoose");
const { Schema } = mongoose;

const ErrorTypeSchema = new Schema({
  code: String,
  message: String,
  count: Number,
  p95_latency_ms: Number,
  avg_latency_ms: Number,
  severity: { type: String, enum: ["info", "warn", "error", "critical"] },
  sample_events: [String],
}, { _id: false });

const IncidentSchema = new Schema({
  incident_id: String,
  started_at: Date,
  resolved_at: Date,
  root_cause: String,
  affected_service: String,
  impacted_routes: [String],
  user_impact_level: String,
  total_duration_min: Number,
  resolution_summary: String
}, { _id: false });

const ErrorTrendSchema = new Schema({
  date: { type: Date, index: true },

  service_name: String,
  environment: String,
  total_requests: Number,
  total_errors: Number,
  error_rate_pct: Number,

  error_types: [ErrorTypeSchema],
  critical_incidents: [IncidentSchema],

  avg_response_time_ms: Number,
  uptime_percent: Number,
  anomaly_score: Number,

  etl_metadata: {
    job_id: String,
    generator: String,
    window_start: Date,
    window_end: Date,
  },

  timestamp_utc: { type: Date, default: () => new Date() },
  timestamp_ist: { type: Date, default: () => new Date(Date.now() + 19800000) },
}, { timestamps: true });

module.exports = ErrorTrendSchema;
