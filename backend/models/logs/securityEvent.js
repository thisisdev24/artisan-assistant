// models/logs/securityEvent.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const BaseEvent = require("./baseEvent");

/* ---------------------- AUTH ---------------------- */
const AuthSchema = new Schema(
  {
    user_id: { type: String, default: null },
    auth_method: { type: String, default: null },
    provider: { type: String, default: null },
    success: { type: Boolean, default: false },
    failure_reason: { type: String, default: null },
    mfa_used: { type: Boolean, default: false },
    mfa_method: { type: String, default: null },
    jwt_id: { type: String, default: null },
    session_id: { type: String, default: null },
  },
  { _id: false }
);

/* ---------------------- THREAT ---------------------- */
const ThreatSchema = new Schema(
  {
    detection_engine: { type: String, default: null },
    risk_score: { type: Number, default: null },
    threat_type: { type: String, default: null },
    action_taken: { type: String, default: null },
    ip_reputation: { type: String, default: null },
    blocked: { type: Boolean, default: false },
  },
  { _id: false }
);

/* ---------------------- MAIN SECURITY EVENT ---------------------- */
const SecurityEventSchema = new Schema(
  {
    auth: { type: AuthSchema, default: {} },

    threat: { type: ThreatSchema, default: {} },

    anomaly_score: { type: Number, default: null },

    access_context: {
      resource_type: { type: String, default: null },
      resource_id: { type: String, default: null },
      access_level: { type: String, default: null },
      action_performed: { type: String, default: null },
    },
  },
  { timestamps: true }
);

/* ---------------------- MERGE BASE EVENT ---------------------- */
SecurityEventSchema.add(BaseEvent);

module.exports = SecurityEventSchema;
