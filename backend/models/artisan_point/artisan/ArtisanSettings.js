// models/artisan/artisan/ArtisanSettings.js
/**
 * ArtisanSettings
 * Operational preferences for a seller: auto-accept, handling time, backorders, timezone & business hours.
 */
const mongoose = require('mongoose');

const ArtisanSettingsSchema = new mongoose.Schema({
    artisan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', required: true, index: true },
    auto_accept_orders: { type: Boolean, default: false },
    default_handling_time_days: { type: Number, default: 1 },
    allow_backorders: { type: Boolean, default: false },
    holiday_mode: { type: Boolean, default: false },
    timezone: { type: String, default: 'Asia/Kolkata' },
    business_hours: mongoose.Schema.Types.Mixed
}, { timestamps: true });

ArtisanSettingsSchema.index({ artisan_id: 1 });

module.exports = mongoose.model("ArtisanSettings", ArtisanSettingsSchema, "artisansettings");
