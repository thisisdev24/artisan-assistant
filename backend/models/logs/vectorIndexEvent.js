// models/logs/vectorIndexEvent.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const BaseEvent = require("./baseEvent");

const VectorIndexEventSchema = new Schema({
    faiss: {
        operation: { type: String, enum: ["load", "write", "merge", "rebuild", "delete"] },
        index_path: String,
        old_version: Number,
        new_version: Number,
        total_vectors: Number,
        added_vectors: Number,
        deleted_vectors: Number,
        time_taken_ms: Number,
        status: String,
        error_message: String
    }
}, { timestamps: false });

VectorIndexEventSchema.index({ "faiss.operation": 1 });
VectorIndexEventSchema.add(BaseEvent);

module.exports = VectorIndexEventSchema;
