// models/artisan/artisan/ArtisanPayoutAccount.js
/**
 * ArtisanPayoutAccount
 * Encrypted seller payout destination payloads (bank/UPI). Store only ciphertext; keep masked preview.
 */
const mongoose = require('mongoose');

const ArtisanPayoutAccountSchema = new mongoose.Schema({
    artisan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', required: true, index: true },
    payout_account_encrypted: { type: String, required: true, select: false },
    masked_account: String,
    primary: { type: Boolean, default: false },
    verification_status: { type: String, enum: ['unverified', 'pending', 'verified', 'rejected'], default: 'unverified' },
    verification_notes: String
}, { timestamps: true });

ArtisanPayoutAccountSchema.index({ artisan_id: 1, primary: 1 });

module.exports = mongoose.model("ArtisanPayoutAccount", ArtisanPayoutAccountSchema, "artisanpayoutaccount");
