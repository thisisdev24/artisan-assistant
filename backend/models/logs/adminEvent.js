// models/logs/adminEvent.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const BaseEvent = require("./baseEvent");

/* ------------------- ESCALATION ------------------- */
const EscalationSchema = new Schema(
  {
    escalation_id: { type: String, default: null },
    from_role: { type: String, default: null },
    to_role: { type: String, default: null },
    reason: { type: String, default: null },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "rejected"],
      default: "open",
    },
    created_at: { type: Date, default: null },
    resolved_at: { type: Date, default: null },
    notes: { type: String, default: null },
  },
  { _id: false }
);

/* ------------------- APPROVAL STEP ------------------- */
const ApprovalStepSchema = new Schema(
  {
    step: { type: String, default: null },
    approver_id: { type: String, default: null },
    approver_role: { type: String, default: null },
    approved: { type: Boolean, default: false },
    approved_at: { type: Date, default: null },
    comments: { type: String, default: null },
  },
  { _id: false }
);

/* ------------------- ADMIN ACTION ------------------- */
const AdminActionSchema = new Schema(
  {
    action_type: { type: String, default: null },
    resource_type: { type: String, default: null },
    resource_id: { type: String, default: null },
    target_user_id: { type: String, default: null },
    before_state: { type: Schema.Types.Mixed, default: null },
    after_state: { type: Schema.Types.Mixed, default: null },
    reason: { type: String, default: null },
    visibility: {
      type: String,
      enum: ["internal", "public", "restricted"],
      default: "internal",
    },
    audit_notes: { type: String, default: null },
  },
  { _id: false }
);

/* ------------------- MAIN SCHEMA ------------------- */
const AdminEventSchema = new Schema(
  {
    admin_context: {
      admin_id: { type: String, default: null },
      admin_email_hash: { type: String, default: null },
      admin_name: { type: String, default: null },
      admin_team: { type: String, default: null },
      is_sudo: { type: Boolean, default: false },
    },

    admin_action: { type: AdminActionSchema, default: {} },

    workflow: {
      ticket_id: { type: String, default: null },
      priority: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "medium",
      },
      escalation: { type: EscalationSchema, default: {} },
      approvals: { type: [ApprovalStepSchema], default: [] },
    },

    impact: {
      affected_collections: { type: [String], default: [] },
      affected_rows: { type: Number, default: null },
      downtime_seconds: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

/* ------------ MERGE BASE EVENT INTO ADMIN EVENT ------------ */
AdminEventSchema.add(BaseEvent);

module.exports = AdminEventSchema;
