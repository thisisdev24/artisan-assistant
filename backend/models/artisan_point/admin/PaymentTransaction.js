// models/artisan/admin/PaymentTransaction.js
/**
 * PaymentTransaction
 * Records payment provider events and references to orders and users.
 * Stores provider ids and encrypted raw payloads (select:false).
 */
const mongoose = require('mongoose');

const PaymentTransactionSchema = new mongoose.Schema({
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
    provider: String,
    provider_payment_id: { type: String, index: true },
    method: String,
    amount: Number,
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['initiated', 'pending', 'success', 'failed', 'refunded'], default: 'initiated' },
    raw_response_encrypted: { type: String, select: false }
}, { timestamps: true });

PaymentTransactionSchema.index({ provider_payment_id: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("PaymentTransaction", PaymentTransactionSchema, "paymenttransaction");
