// models/artisan/admin/RefundTransaction.js
/**
 * RefundTransaction
 * Tracks refunds issued against orders/payment transactions.
 */
const mongoose = require('mongoose');

const RefundTransactionSchema = new mongoose.Schema({
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    payment_transaction_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction' },
    amount: Number,
    currency: { type: String, default: 'INR' },
    provider_ref: String,
    status: { type: String, enum: ['initiated', 'success', 'failed'], default: 'initiated' },
    reason: String
}, { timestamps: true });

module.exports = mongoose.model("RefundTransaction", RefundTransactionSchema, "refundtransaction");
