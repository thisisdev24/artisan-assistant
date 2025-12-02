// models/artisan/admin/Coupon.js
/**
 * Coupon
 * Platform-level discount codes with validity, min order, usage caps.
 */
const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
    code: { type: String, unique: true, required: true },
    description: String,
    type: { type: String, enum: ['percentage', 'flat'], required: true },
    value: Number,
    max_discount: Number,
    min_order_value: Number,
    valid_from: Date,
    valid_until: Date,
    active: { type: Boolean, default: true },
    usage_limit: Number
}, { timestamps: true });

CouponSchema.index({ code: 1 });

module.exports = mongoose.model("Coupon", CouponSchema, "coupon");
