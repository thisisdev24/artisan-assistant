// adminEvent.js
const mongoose = require("mongoose");
const BaseEvent = require("./baseEvent");
const { Schema } = mongoose;

const EscalationSchema = new Schema({
  escalation_id: String,
  from_role: String,
  to_role: String,
  reason: String,
  status: { type: String, enum: ["open","in_progress","resolved","rejected"], default: "open" },
  created_at: Date,
  resolved_at: Date,
  notes: String,
}, { _id: false });

const ApprovalStepSchema = new Schema({
  step: String,
  approver_id: String,
  approver_role: String,
  approved: Boolean,
  approved_at: Date,
  comments: String,
}, { _id: false });

const AdminActionSchema = new Schema({
  action_type: String, // create, update, delete, approve, suspend
  resource_type: String, // user, listing, payout, config
  resource_id: String,
  target_user_id: String,
  before_state: Schema.Types.Mixed,
  after_state: Schema.Types.Mixed,
  reason: String,
  visibility: { type: String, enum: ["internal","public","restricted"], default: "internal" },
  audit_notes: String,
}, { _id: false });

const AdminEventSchema = new Schema({
  // admin-specific fields
  admin_context: {
    admin_id: String,
    admin_email_hash: String, // store hash, not raw PII
    admin_name: String,
    admin_team: String,
    is_sudo: Boolean,
  },
  admin_action: AdminActionSchema,
  workflow: {
    ticket_id: String,
    priority: { type: String, enum: ["low","medium","high","urgent"], default: "medium" },
    escalation: EscalationSchema,
    approvals: [ApprovalStepSchema],
  },
  impact: {
    affected_collections: [String],
    affected_rows: Number,
    downtime_seconds: Number,
  },

}, { timestamps: true });

// merge with BaseEvent
AdminEventSchema.add(BaseEvent);

AdminEventSchema.index({ "admin_context.admin_id": 1 });
AdminEventSchema.index({ "workflow.ticket_id": 1 });

module.exports = AdminEventSchema;
