// models/artisan/artisan/ArtisanStorefront.js
/**
 * ArtisanStorefront
 * Public storefront profile for an artisan: headline, about, banners, policies and optional location.
 * Use for store pages and pickup location display.
 */
const mongoose = require('mongoose');

const ArtisanStorefrontSchema = new mongoose.Schema({
    artisan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', required: true, index: true },
    headline: String,
    about: String,
    banner_url: String,
    logo_url: String,
    slug: { type: String, index: true },
    theme: mongoose.Schema.Types.Mixed,
    shipping_from_postal_code: String,
    shipping_providers: [String],
    shipping_policy: String,
    return_policy: String,
    cancellation_policy: String,
    is_active: { type: Boolean, default: true },

    // Optional GeoJSON point [lng, lat]
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: undefined }
    }
}, { timestamps: true });

ArtisanStorefrontSchema.index({ artisan_id: 1, slug: 1 }, { unique: true });
ArtisanStorefrontSchema.index({ location: '2dsphere' });

module.exports = mongoose.model("ArtisanStorefront", ArtisanStorefrontSchema, "artisanstorefront");
