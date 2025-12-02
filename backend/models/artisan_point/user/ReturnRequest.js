// models/artisan/user/ReturnRequest.js
/**
 * ReturnRequest
 * Buyer-initiated return requests for specific orders/items, with evidence and a status.
 */
const mongoose = require('mongoose');

const ReturnRequestSchema = new mongoose.Schema({
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    item_index: Number,
    reason: String,
    images: [String],
    status: { type: String, enum: ['requested', 'approved', 'rejected', 'received', 'processed'], default: 'requested' },
    notes: String
}, { timestamps: true });

ReturnRequestSchema.index({ order_id: 1, user_id: 1 });

module.exports = mongoose.model("ReturnRequest", ReturnRequestSchema, "returnrequest");
