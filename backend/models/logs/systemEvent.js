// models/logs/systemEvent.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const BaseEvent = require("./baseEvent");

/* ---------------------- REQUEST ---------------------- */
const RequestSchema = new Schema(
  {
    request_id: { type: String, default: null },
    method: { type: String, default: null },
    url: { type: String, default: null },
    route: { type: String, default: null },
    controller: { type: String, default: null },
    query_params: { type: Schema.Types.Mixed, default: {} },
    status_code: { type: Number, default: null },
    response_time_ms: { type: Number, default: null },
    bytes_sent: { type: Number, default: null },
    bytes_received: { type: Number, default: null },
  },
  { _id: false }
);

/* ---------------------- INFRASTRUCTURE ---------------------- */
const InfraSchema = new Schema(
  {
    host_name: { type: String, default: null },
    region: { type: String, default: null },
    data_center: { type: String, default: null },
    container_id: { type: String, default: null },
    pod_name: { type: String, default: null },
    instance_type: { type: String, default: null },
    cpu_percent: { type: Number, default: null },
    memory_mb: { type: Number, default: null },
    disk_usage_gb: { type: Number, default: null },
    uptime_seconds: { type: Number, default: null },
    node_health: { type: String, default: null },
  },
  { _id: false }
);

/* ---------------------- DEPENDENCY ---------------------- */
const DependencySchema = new Schema(
  {
    service: { type: String, default: null },
    endpoint: { type: String, default: null },
    latency_ms: { type: Number, default: null },
    error_rate: { type: Number, default: null },
    call_count: { type: Number, default: null },
    status: { type: String, default: null },
  },
  { _id: false }
);

/* ---------------------- DEPLOYMENT ---------------------- */
const DeploymentSchema = new Schema(
  {
    release_id: { type: String, default: null },
    version: { type: String, default: null },
    commit_hash: { type: String, default: null },
    deployed_by: { type: String, default: null },
    environment: { type: String, default: null },
    deployed_at: { type: Date, default: null },
  },
  { _id: false }
);

/* ---------------------- MAIN SYSTEM EVENT ---------------------- */
const SystemEventSchema = new Schema(
  {
    request: { type: RequestSchema, default: {} },

    infrastructure: { type: InfraSchema, default: {} },

    dependencies: { type: [DependencySchema], default: [] },

    deployment: { type: DeploymentSchema, default: {} },

    system_health: {
      cpu_load: { type: Number, default: null },
      memory_used_mb: { type: Number, default: null },
      network_throughput_mb: { type: Number, default: null },
      request_rate_rps: { type: Number, default: null },
      error_rate: { type: Number, default: null },
      uptime_percent: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

/* ---------------------- MERGE BASE EVENT ---------------------- */
SystemEventSchema.add(BaseEvent);

module.exports = SystemEventSchema;
