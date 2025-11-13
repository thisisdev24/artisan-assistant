// baseEvent.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * BaseEventSchema
 * - Full, production-grade base event used by all other event schemas.
 * - Export Schema only; register as model later.
 */

// Sub-schemas (no _id)
const GeoSchema = new Schema({
  ip: String,
  continent: String,
  country: String,
  region: String,
  city: String,
  postal_code: String,
  latitude: Number,
  longitude: Number,
  timezone: { type: String, default: "Asia/Kolkata" },
  isp: String,
  organization: String,
  source: String, // "ipapi.co" | "geoip-lite" | "fallback"
}, { _id: false });

const DeviceSchema = new Schema({
  device_id: String,
  device_type: String, // desktop, mobile, tablet, bot
  brand: String,
  model: String,
  os: String,
  os_version: String,
  browser: String,
  browser_version: String,
  screen_resolution: String,
  user_agent: String,
  app_name: String,
  app_version: String,
}, { _id: false });

const NetworkSchema = new Schema({
  connection_type: String, // wifi, cellular, ethernet
  carrier: String,
  asn: String,
  latency_ms: Number,
  vpn: Boolean,
}, { _id: false });

const TraceSchema = new Schema({
  trace_id: { type: String, index: true },
  parent_event_id: String,
  correlation_id: { type: String, index: true },
  span_id: String,
}, { _id: false });

const AuditSchema = new Schema({
  actor_id: String,
  actor_role: String,
  change_summary: String,
  before: Schema.Types.Mixed,
  after: Schema.Types.Mixed,
  approved_by: String,
  approved_at: Date,
  reason: String,
}, { _id: false });

const PerformanceSchema = new Schema({
  response_time_ms: Number,
  db_query_time_ms: Number,
  external_api_time_ms: Number,
  cpu_percent: Number,
  memory_mb: Number,
  io_wait_ms: Number,
  cache_hit_ratio: Number,
}, { _id: false });

const ErrorSchema = new Schema({
  message: String,
  code: String,
  component: String,
  stack: String,
  severity: { type: String, enum: ["info","warn","error","critical"], default: "error" },
  tags: [String],
}, { _id: false });

// Main base event schema (top-level, _id allowed)
const BaseEventSchema = new Schema({
  // identity + tracing
  event_id: { type: String, index: true },
  event_version: { type: Number, default: 1 },
  trace: TraceSchema,

  // classification
  event_type: { type: String, required: true, index: true }, // e.g. HTTP_REQUEST, ORDER_CREATED
  category: { type: String, required: true, index: true }, // system, business, security, analytics
  subcategory: String,
  action: String, // concise action verb
  description: String,

  // status & metadata
  status: { type: String, default: "success" }, // success, failed, pending
  severity: { type: String, enum: ["info","warn","error","critical"], default: "info" },
  tags: [String],
  metadata: Schema.Types.Mixed,

  // actor / session
  user_id: { type: String, index: true },
  role: { type: String, index: true }, // admin, artist, buyer, system
  session_id: String,
  anonymous_id: String,
  impersonated_user_id: String,

  // timestamps
  timestamp_received_utc: { type: Date, default: () => new Date() },
  timestamp_received_ist: { type: Date, default: () => new Date(Date.now() + 5.5 * 3600 * 1000) },
  timestamp_processed_utc: Date,
  timestamp_completed_utc: Date,

  // enrichment
  geo: GeoSchema,
  device: DeviceSchema,
  network: NetworkSchema,
  performance: PerformanceSchema,
  audit: AuditSchema,
  error: ErrorSchema,

  // system / routing context
  service_name: String,
  environment: String, // production / staging / dev
  route: String, // API route
  component: String,

}, { timestamps: true });

// Index suggestions (will be created when registering model if desired)
BaseEventSchema.index({ timestamp_received_utc: -1 });
BaseEventSchema.index({ user_id: 1, timestamp_received_utc: -1 });
BaseEventSchema.index({ event_type: 1, timestamp_received_utc: -1 });

module.exports = BaseEventSchema;
