// models/artisan/artisan/ArtisanInventory.js
/**
 * ArtisanInventory
 * Per-sku inventory counts per warehouse. Tracks available/reserved/incoming/safety stock.
 */
const mongoose = require('mongoose');

const ArtisanInventorySchema = new mongoose.Schema({
    artisan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', required: true, index: true },
    listing_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    sku: { type: String, required: true, index: true },
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ArtisanWarehouse', required: true, index: true },
    available: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    incoming: { type: Number, default: 0 },
    safety_stock: { type: Number, default: 0 },
    last_updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

ArtisanInventorySchema.index({ artisan_id: 1, warehouse_id: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model("ArtisanInventory", ArtisanInventorySchema, "artisaninventory");
