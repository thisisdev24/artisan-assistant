// models/artisan/artisan/ArtisanStockReservation.js
/**
 * ArtisanStockReservation
 * Short-lived reservation entries created during checkout. Use TTL or worker to expire.
 */
const mongoose = require('mongoose');

const ArtisanStockReservationSchema = new mongoose.Schema({
    artisan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', required: true, index: true },
    listing_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    sku: String,
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ArtisanWarehouse' },
    quantity: { type: Number, required: true },
    reserved_until: { type: Date, required: true },
    context: mongoose.Schema.Types.Mixed
}, { timestamps: true });

ArtisanStockReservationSchema.index({ reserved_until: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ArtisanStockReservation", ArtisanStockReservationSchema, "artisanstockreservation");
