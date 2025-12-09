// models/logs/backgroundJobEvent.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const BaseEvent = require("./baseEvent");

const BackgroundJobEventSchema = new Schema({
  job: {
    job_id: String,
    job_name: String,
    job_type: { type: String, enum: ["cron", "batch", "async", "manual"] },
    processed_count: Number,
    skipped_count: Number,
    failed_count: Number,
    start_time: Date,
    end_time: Date,
    status: String,
    error_message: String
  }
}, { timestamps: false });

BackgroundJobEventSchema.index({ "job.job_id": 1 });
BackgroundJobEventSchema.add(BaseEvent);

module.exports = BackgroundJobEventSchema;
