// models/artisan/artisan/ArtisanNotificationPref.js
/**
 * ArtisanNotificationPref
 * Seller notification preferences and webhook config (webhook secret stored hashed/select:false).
 */
const mongoose = require('mongoose');

const ArtisanNotificationPrefSchema = new mongoose.Schema({
    artisan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', required: true, index: true },
    channels: {
        email: { enabled: { type: Boolean, default: true }, address: String },
        sms: { enabled: { type: Boolean, default: false }, phone: String },
        push: { enabled: { type: Boolean, default: false }, device_tokens: [String] },
        webhooks: { enabled: { type: Boolean, default: false }, url: String, secret_hash: { type: String, select: false } }
    }
}, { timestamps: true });

ArtisanNotificationPrefSchema.index({ artisan_id: 1 });

module.exports = mongoose.model("ArtisanNotificationPref", ArtisanNotificationPrefSchema, "artisannotificationpref");
