// systemEvent.js
const mongoose = require("mongoose");
const BaseEvent = require("./baseEvent");
const { Schema } = mongoose;

const RequestSchema = new Schema({
  request_id: String,
  method: String,
  url: String,
  route: String,
  controller: String,
  query_params: Schema.Types.Mixed,
  status_code: Number,
  response_time_ms: Number,
  bytes_sent: Number,
  bytes_received: Number,
}, { _id: false });

const InfraSchema = new Schema({
  host_name: String,
  region: String,
  data_center: String,
  container_id: String,
  pod_name: String,
  instance_type: String,
  cpu_percent: Number,
  memory_mb: Number,
  disk_usage_gb: Number,
  uptime_seconds: Number,
  node_health: String,
}, { _id: false });

const DependencySchema = new Schema({
  service: String,
  endpoint: String,
  latency_ms: Number,
  error_rate: Number,
  call_count: Number,
  status: String,
}, { _id: false });

const DeploymentSchema = new Schema({
  release_id: String,
  version: String,
  commit_hash: String,
  deployed_by: String,
  environment: String,
  deployed_at: Date,
}, { _id: false });

const SystemEventSchema = new Schema({
  request: RequestSchema,
  infrastructure: InfraSchema,
  dependencies: [DependencySchema],
  deployment: DeploymentSchema,
  system_health: {
    cpu_load: Number,
    memory_used_mb: Number,
    network_throughput_mb: Number,
    request_rate_rps: Number,
    error_rate: Number,
    uptime_percent: Number,
  }
}, { timestamps: true });

SystemEventSchema.add(BaseEvent);

SystemEventSchema.index({ "request.request_id": 1 });
SystemEventSchema.index({ "infrastructure.host_name": 1 });

module.exports = SystemEventSchema;
