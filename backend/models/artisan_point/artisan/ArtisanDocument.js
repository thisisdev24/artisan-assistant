// models/artisan/artisan/ArtisanDocument.js
/**
 * ArtisanDocument
 * KYC and business verification documents (store S3/URL paths). Tracks review status.
 */
const mongoose = require('mongoose');

const ArtisanDocumentSchema = new mongoose.Schema({
    artisan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', required: true, index: true },
    file_url: { type: String, required: true },
    type: { type: String, required: true }, // id_front, gst, etc
    meta: mongoose.Schema.Types.Mixed,
    status: { type: String, enum: ['uploaded', 'in_review', 'approved', 'rejected'], default: 'uploaded' },
    notes: String,
    reviewed_by_admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    reviewed_at: Date
}, { timestamps: true });

ArtisanDocumentSchema.index({ artisan_id: 1, type: 1 });

module.exports = mongoose.model("ArtisanDocument", ArtisanDocumentSchema, "artisandocument");
