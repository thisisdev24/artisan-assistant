// securityEvent.js
const mongoose = require("mongoose");
const BaseEvent = require("./baseEvent");
const { Schema } = mongoose;

const AuthSchema = new Schema({
  user_id: String,
  auth_method: String,
  provider: String,
  success: Boolean,
  failure_reason: String,
  mfa_used: Boolean,
  mfa_method: String,
  jwt_id: String,
  session_id: String,
}, { _id: false });

const ThreatSchema = new Schema({
  detection_engine: String,
  risk_score: Number,
  threat_type: String,
  action_taken: String,
  ip_reputation: String,
  blocked: Boolean,
}, { _id: false });

const SecurityEventSchema = new Schema({
  auth: AuthSchema,
  threat: ThreatSchema,
  anomaly_score: Number,
  access_context: {
    resource_type: String,
    resource_id: String,
    access_level: String,
    action_performed: String,
  },
}, { timestamps: true });

SecurityEventSchema.add(BaseEvent);

SecurityEventSchema.index({ "auth.user_id": 1 });
SecurityEventSchema.index({ "threat.threat_type": 1 });

module.exports = SecurityEventSchema;
