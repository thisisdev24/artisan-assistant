// models/logs/deploymentEvent.js
// DeploymentEvent schema — exclusively for deployment events
// (deployment started, completed, rollback, canary switch, etc.)

const mongoose = require("mongoose");
const { Schema } = mongoose;
const BaseEvent = require("./baseEvent");

/* ---------------------- DEPLOYMENT ---------------------- */
const DeploymentSchema = new Schema(
    {
        release_id: { type: String, default: null },
        version: { type: String, default: null },
        previous_version: { type: String, default: null },
        commit_hash: { type: String, default: null },
        branch: { type: String, default: null },
        deployed_by: { type: String, default: null },
        environment: { type: String, default: null },
        deployed_at: { type: Date, default: null },
        deployment_type: {
            type: String,
            enum: ["full", "canary", "blue_green", "rolling", "hotfix"],
            default: "full",
        },
        duration_seconds: { type: Number, default: null },
    },
    { _id: false }
);

/* ---------------------- ROLLBACK ---------------------- */
const RollbackSchema = new Schema(
    {
        rollback_id: { type: String, default: null },
        from_version: { type: String, default: null },
        to_version: { type: String, default: null },
        reason: { type: String, default: null },
        triggered_by: { type: String, default: null },
        automatic: { type: Boolean, default: false },
        rolled_back_at: { type: Date, default: null },
    },
    { _id: false }
);

/* ---------------------- HEALTH CHECK ---------------------- */
const HealthCheckSchema = new Schema(
    {
        check_type: { type: String, default: null }, // pre_deploy, post_deploy, smoke_test
        passed: { type: Boolean, default: null },
        checks_total: { type: Number, default: null },
        checks_passed: { type: Number, default: null },
        checks_failed: { type: Number, default: null },
        duration_ms: { type: Number, default: null },
        failure_details: { type: Schema.Types.Mixed, default: null },
    },
    { _id: false }
);

/* ---------------------- MAIN DEPLOYMENT EVENT ---------------------- */
const DeploymentEventSchema = new Schema(
    {
        deployment: { type: DeploymentSchema, default: {} },

        rollback: { type: RollbackSchema, default: {} },

        health_check: { type: HealthCheckSchema, default: {} },

        // Deployment-specific metadata
        affected_services: { type: [String], default: [] },
        config_changes: { type: Schema.Types.Mixed, default: {} },
        migration_applied: { type: Boolean, default: false },
        downtime_seconds: { type: Number, default: null },
    },
    { timestamps: false }
);

/* ---------------------- MERGE BASE EVENT ---------------------- */
DeploymentEventSchema.add(BaseEvent);

module.exports = DeploymentEventSchema;
