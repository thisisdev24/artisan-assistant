// models/analytics/performanceMetrics.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const EndpointMetricsSchema = new Schema({
  route: String,
  method: String,
  avg_latency_ms: Number,
  p95_latency_ms: Number,
  max_latency_ms: Number,
  request_count: Number,
  error_count: Number,
  success_rate_pct: Number,
  cache_hit_ratio: Number,
}, { _id: false });

const DatabaseMetricsSchema = new Schema({
  collection_name: String,
  avg_query_time_ms: Number,
  p95_query_time_ms: Number,
  query_count: Number,
  slow_queries: Number,
  index_hit_ratio_pct: Number,
}, { _id: false });

const CacheMetricsSchema = new Schema({
  cache_name: String,
  hit_ratio_pct: Number,
  miss_count: Number,
  avg_lookup_time_ms: Number,
  evictions: Number
}, { _id: false });

const InfraSchema = new Schema({
  cpu_percent: Number,
  memory_mb: Number,
  disk_usage_gb: Number,
  network_in_mb_sec: Number,
  network_out_mb_sec: Number
}, { _id: false });

const PerformanceMetricsSchema = new Schema({
  service_name: String,
  environment: { type: String, default: "production" },

  period_start: Date,
  period_end: Date,

  endpoints: [EndpointMetricsSchema],
  databases: [DatabaseMetricsSchema],
  caches: [CacheMetricsSchema],

  infra: InfraSchema,

  uptime_percent: Number,
  incident_count: Number,

  anomaly_score: Number,

  timestamp_utc: { type: Date, default: () => new Date() },
  timestamp_ist: { type: Date, default: () => new Date(Date.now() + 19800000) },
}, { timestamps: true });

module.exports = PerformanceMetricsSchema;
