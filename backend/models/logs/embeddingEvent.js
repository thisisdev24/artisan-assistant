// models/logs/embeddingEvent.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const BaseEvent = require("./baseEvent");

const EmbeddingEventSchema = new Schema({
    embedding: {
        entity_type: String,
        entity_id: String,
        model: String,
        vector_dim: Number,
        faiss_index: String,
        embedding_version: Number,
        embedding_created_at: Date,
        operation: { type: String, enum: ["create", "update", "skip"], default: "create" },
        time_taken_ms: Number,
        status: String,
        error_message: String
    }
}, { timestamps: false });

/* indexes that help debugging by entity */
EmbeddingEventSchema.index({ "embedding.entity_type": 1, "embedding.entity_id": 1 });
EmbeddingEventSchema.add(BaseEvent);

module.exports = EmbeddingEventSchema;
