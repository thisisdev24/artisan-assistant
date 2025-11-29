// models/artisan/admin/ArtisanDispute.js
/**
 * ArtisanDispute
 * Admin-managed dispute records between buyer and seller for orders.
 */
const mongoose = require('mongoose');

const ArtisanDisputeSchema = new mongoose.Schema({
    artisan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', index: true },
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    raised_by_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    evidence: [String],
    status: { type: String, enum: ['open', 'investigating', 'resolved', 'rejected'], default: 'open' },
    resolution: String,
    resolved_at: Date
}, { timestamps: true });

ArtisanDisputeSchema.index({ artisan_id: 1, order_id: 1, status: 1 });

module.exports = mongoose.model("ArtisanDispute", ArtisanDisputeSchema, "artisandispute");
