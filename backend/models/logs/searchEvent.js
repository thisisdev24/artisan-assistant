// models/logs/searchEvent.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const BaseEvent = require("./baseEvent");

const SearchEventSchema = new Schema({
    search: {
        query: String,
        filters: Schema.Types.Mixed,
        results_count: Number,
        latency_ms: Number,
        page: Number,
        used_vector: Boolean,
        used_keyword: Boolean,
        faiss_index: String,
        ranking_model: String,
        error_message: String
    }
}, { timestamps: false });

SearchEventSchema.index({ "search.query": 1 });
SearchEventSchema.add({ base: BaseEvent });

module.exports = SearchEventSchema;
