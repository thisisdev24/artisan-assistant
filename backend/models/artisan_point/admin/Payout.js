// models/artisan/admin/Payout.js
/**
 * Payout
 * Seller settlement records created by the platform. Tracks status and provider ref.
 */
const mongoose = require('mongoose');

const PayoutSchema = new mongoose.Schema({
    artisan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    order_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    fee_total: { type: Number, default: 0 },
    provider_ref: String,
    status: { type: String, enum: ['pending', 'processing', 'paid', 'failed', 'reversed'], default: 'pending' },
    scheduled_for: Date,
    processed_at: Date
}, { timestamps: true });

PayoutSchema.index({ artisan_id: 1, status: 1 });

module.exports = mongoose.model("Payout", PayoutSchema, "payout");
