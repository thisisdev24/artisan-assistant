// models/artisan/user/Address.js
/**
 * Address
 * User shipping addresses. Includes optional GeoJSON location for routing.
 */
const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: String,
    phone: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    country: { type: String, default: 'India' },
    postal_code: String,
    is_default: { type: Boolean, default: false },

    // Optional GeoJSON point [lng, lat]
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
    }
}, { timestamps: true });

AddressSchema.index({ user_id: 1, is_default: 1 });
AddressSchema.index({ location: '2dsphere' });

module.exports = mongoose.model("Address", AddressSchema, "user_address");
