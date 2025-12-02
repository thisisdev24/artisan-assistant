// models/artisan/artisan/ArtisanWarehouse.js
/**
 * ArtisanWarehouse
 * Physical warehouse or 3PL location for a seller. Optional GeoJSON location used for routing.
 */
const mongoose = require('mongoose');

const ArtisanWarehouseSchema = new mongoose.Schema({
    artisan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', required: true, index: true },
    name: { type: String, required: true },
    address: mongoose.Schema.Types.Mixed,
    phone: String,
    timezone: String,
    is_default: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    metadata: mongoose.Schema.Types.Mixed,

    // Optional GeoJSON point [lng, lat]
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: undefined }
    }
}, { timestamps: true });

ArtisanWarehouseSchema.index({ artisan_id: 1, is_default: 1 });
ArtisanWarehouseSchema.index({ location: '2dsphere' });

module.exports = mongoose.model("ArtisanWarehouse", ArtisanWarehouseSchema, "artisanwarehouse");
