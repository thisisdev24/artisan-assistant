// models/artisan/admin/StockTransaction.js
/**
 * StockTransaction
 * Immutable audit trail of inventory movements: in/out/return/adjustment.
 */
const mongoose = require('mongoose');

const StockTransactionSchema = new mongoose.Schema({
    listing_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', index: true },
    sku: String,
    type: { type: String, enum: ['in', 'out', 'return', 'adjustment'], required: true },
    quantity: Number,
    artisan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', index: true, sparse: true },
    context: mongoose.Schema.Types.Mixed
}, { timestamps: true });

StockTransactionSchema.index({ listing_id: 1, createdAt: -1 });

module.exports = mongoose.model("StockTransaction", StockTransactionSchema, "stocktransaction");
