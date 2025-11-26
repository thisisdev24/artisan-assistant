// models/logs/baseEvent.js
// BaseEvent schema — canonical UTC ingestion timestamp, explicit client timezone fields,
// and safe defaults for arrays / mixed fields. Non-breaking: no required additions.

const mongoose = require("mongoose");
const { Schema } = mongoose;

/* ---------------------- GEO ---------------------- */
const GeoSchema = new Schema(
  {
    ip: { type: String, default: null },
    continent: { type: String, default: null },
    country: { type: String, default: null },
    region: { type: String, default: null },
    city: { type: String, default: null },
    postal_code: { type: String, default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    timezone: { type: String, default: null }, // optional: from geo-ip
    isp: { type: String, default: null },
    organization: { type: String, default: null },
    source: { type: String, default: null },
  },
  { _id: false }
);

/* -------------------- DEVICE -------------------- */
const DeviceSchema = new Schema(
  {
    device_id: { type: String, default: null },
    device_type: { type: String, default: null },
    brand: { type: String, default: null },
    model: { type: String, default: null },
    os: { type: String, default: null },
    os_version: { type: String, default: null },
    browser: { type: String, default: null },
    browser_version: { type: String, default: null },
    screen_resolution: { type: String, default: null },
    user_agent: { type: String, default: null },
    app_name: { type: String, default: null },
    app_version: { type: String, default: null },
  },
  { _id: false }
);

/* -------------------- NETWORK -------------------- */
const NetworkSchema = new Schema(
  {
    connection_type: { type: String, default: null },
    carrier: { type: String, default: null },
    asn: { type: String, default: null },
    latency_ms: { type: Number, default: null },
    vpn: { type: Boolean, default: false },
  },
  { _id: false }
);

/* -------------------- TRACING -------------------- */
const TraceSchema = new Schema(
  {
    trace_id: {
      type: String,
      index: true,
      default: null,
    },
    parent_event_id: { type: String, default: null },
    correlation_id: {
      type: String,
      index: true,
      default: null,
    },
    span_id: { type: String, default: null },
  },
  { _id: false }
);

/* ---------------------- AUDIT --------------------- */
const AuditSchema = new Schema(
  {
    actor_id: { type: String, default: null },
    actor_role: { type: String, default: null },
    change_summary: { type: String, default: null },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    approved_by: { type: String, default: null },
    approved_at: { type: Date, default: null },
    reason: { type: String, default: null },
  },
  { _id: false }
);

/* ------------------- PERFORMANCE ------------------ */
const PerformanceSchema = new Schema(
  {
    response_time_ms: { type: Number, default: null },
    db_query_time_ms: { type: Number, default: null },
    external_api_time_ms: { type: Number, default: null },
    cpu_percent: { type: Number, default: null },
    memory_mb: { type: Number, default: null },
    io_wait_ms: { type: Number, default: null },
    cache_hit_ratio: { type: Number, default: null },
  },
  { _id: false }
);

/* ---------------------- ERROR --------------------- */
const ErrorSchema = new Schema(
  {
    message: { type: String, default: null },
    code: { type: String, default: null },
    component: { type: String, default: null },
    stack: { type: String, default: null },
    severity: {
      type: String,
      enum: ["info", "warn", "error", "critical"],
      default: "error",
    },
    tags: { type: [String], default: [] },
  },
  { _id: false }
);

/* -------------------- BASE EVENT -------------------- */
const BaseEvent = {
  // identity
  event_id: { type: String, index: true, default: null },
  event_version: { type: Number, default: 1 },

  // basic classification
  event_type: { type: String, required: true },
  category: { type: String, default: null },
  subcategory: { type: String, default: null },
  action: { type: String, default: null },
  description: { type: String, default: null },

  // status/severity
  status: { type: String, default: "success" },
  severity: { type: String, default: "info" },

  // actor / user
  user_id: { type: Schema.Types.Mixed, index: true, default: null }, // string or ObjectId
  role: { type: String, default: null },
  session_id: { type: String, index: true, default: null },
  anonymous_id: { type: String, index: true, default: null },
  impersonated_user_id: { type: String, default: null },

  // tracing
  trace: TraceSchema,

  // canonical timestamps (server-side canonical UTC time)
  timestamp_received_utc: { type: Date, default: Date.now, index: true },

  // optional processing timestamps
  timestamp_processed_utc: { type: Date, default: null },
  timestamp_completed_utc: { type: Date, default: null },

  // client timezone info (frontend/enricher may populate)
  client_timezone: { type: String, default: null },
  timezone_offset_minutes: { type: Number, default: null },

  // geo & network
  geo: { type: GeoSchema, default: {} },
  device: { type: DeviceSchema, default: {} },

  // network (flexible)
  network: { type: NetworkSchema, default: {} },

  // performance / metrics
  performance: { type: PerformanceSchema, default: {} },

  // error object
  error: { type: ErrorSchema, default: {} },

  // correlation-ish metadata
  service_name: { type: String, default: null, index: true },
  environment: { type: String, default: process.env.NODE_ENV || "development", index: true },
  route: { type: String, default: null },
  component: { type: String, default: null },

  // common lists / arrays — explicit defaults
  tags: { type: [String], default: [] },
  affected_collections: { type: [String], default: [] },
  dependencies: { type: [String], default: [] },

  // arbitrary payloads
  before_state: { type: Schema.Types.Mixed, default: null },
  after_state: { type: Schema.Types.Mixed, default: null },
  metadata: { type: Schema.Types.Mixed, default: {} },
};

module.exports = BaseEvent;
