// models/artisan/user/Order.js
/**
 * Order
 * Customer order record, contains items, totals, payment snapshot and shipping snapshot.
 * Shipping field is a quick snapshot; use Shipments for detailed tracking.
 */
const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
    listing_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
    artisan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan' },
    title: String,
    sku: String,
    quantity: Number,
    price: Number,
    tax: Number,
    discount: Number,
    subtotal: Number
}, { _id: false });

const OrderSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [OrderItemSchema],
    currency: { type: String, default: 'INR' },
    totals: {
        subtotal: Number,
        shipping: Number,
        tax: Number,
        discount: Number,
        total: Number
    },
    payment: {
        payment_id: String,
        provider: String,
        method: String,
        status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' }
    },
    shipping_address_snapshot: mongoose.Schema.Types.Mixed,
    billing_address_snapshot: mongoose.Schema.Types.Mixed,
    shipping: {
        provider: String,
        tracking_number: String,
        status: { type: String, enum: ['pending', 'shipped', 'delivered', 'returned'], default: 'pending' }
    },
    status: {
        type: String,
        enum: ['created', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'],
        default: 'created'
    },
    notes: String
}, { timestamps: true });

OrderSchema.index({ user_id: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Order", OrderSchema, "order");
