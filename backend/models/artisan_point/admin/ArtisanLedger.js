// models/artisan/admin/ArtisanLedger.js
/**
 * ArtisanLedger
 * Double-entry-like ledger entries for reconciliation and settlement. Use batch ids.
 */
const mongoose = require('mongoose');

const ArtisanLedgerSchema = new mongoose.Schema({
    artisan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', index: true },
    ledger_account: { type: String, required: true },
    entry_type: { type: String, enum: ['debit', 'credit'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    related_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    related_payout_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Payout' },
    batch_id: String,
    description: String
}, { timestamps: true });

ArtisanLedgerSchema.index({ artisan_id: 1, ledger_account: 1, createdAt: -1 });

module.exports = mongoose.model("ArtisanLedger", ArtisanLedgerSchema, "artisanledger");
