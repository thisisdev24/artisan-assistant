// models/artisan/admin/Shipment.js
/**
 * Shipment
 * Shipping lifecycle records: provider, tracking number, status and timestamps.
 */
const mongoose = require('mongoose');

const ShipmentSchema = new mongoose.Schema({
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    provider: String,
    tracking_number: { type: String, index: true },
    status: { type: String, enum: ['created', 'picked', 'in_transit', 'delivered', 'returned'], default: 'created' },
    estimated_delivery: Date,
    delivered_at: Date
}, { timestamps: true });

ShipmentSchema.index({ tracking_number: 1 }, { sparse: true });

module.exports = mongoose.model("Shipment", ShipmentSchema, "shipment");
