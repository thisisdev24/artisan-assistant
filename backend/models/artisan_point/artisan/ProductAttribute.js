// models/artisan/artisan/ProductAttribute.js
/**
 * ProductAttribute
 * Structured attributes used for filtering (size, color, material) linked to listings.
 */
const mongoose = require('mongoose');

const ProductAttributeSchema = new mongoose.Schema({
    listing_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', index: true },
    attribute_name: String,
    attribute_value: String
}, { timestamps: true });

ProductAttributeSchema.index({ listing_id: 1 });

module.exports = mongoose.model("ProductAttribute", ProductAttributeSchema, "productattribute");
