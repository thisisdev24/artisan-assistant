// models/logs/aiEvent.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const BaseEvent = require("./baseEvent");

const AIEventSchema = new Schema({
    ai: {
        model_name: String,
        operation: { type: String, enum: ["generate", "classify", "rank", "embed"] },
        input_tokens: Number,
        output_tokens: Number,
        latency_ms: Number,
        temperature: Number,
        error_message: String
    }
}, { timestamps: false });

AIEventSchema.index({ "ai.model_name": 1 });
AIEventSchema.add(BaseEvent);

module.exports = AIEventSchema;
