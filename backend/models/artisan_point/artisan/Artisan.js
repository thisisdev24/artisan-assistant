// models/artisan/artisan/Artisan.js
/**
 * Artisan
 * Seller account (artisan). Stores credentials, store metadata, verification state and masked payout preview.
 * Password is excluded by default.
 */
const mongoose = require('mongoose');

const ArtisanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  emailVerified: { type: Boolean, default: false },
  emailVerifiedAt: Date,
  password: { type: String, required: true, select: false },
  phone: { type: String, default: '' },
  phoneVerified: { type: Boolean, default: false },
  phoneVerifiedAt: Date,
  role: { type: String, default: 'seller' },
  store: { type: String, required: true },
  store_slug: { type: String, index: true },
  store_description: { type: String, default: '' },
  store_logo: { type: String, default: '' },
  store_banner: { type: String, default: '' },
  rating: { type: Number, default: 0 },
  rating_count: { type: Number, default: 0 },
  verification: {
    documents: [String],
    status: { type: String, enum: ['unverified', 'pending', 'verified', 'rejected'], default: 'unverified' },
    verified_at: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    verifiedByName: String,
    adminApprovals: [{
      adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
      adminName: String,
      approvedAt: { type: Date, default: Date.now }
    }]
  },
  address: {
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postal_code: { type: String, default: '' },
    country: { type: String, default: '' }
  },
  identity_card: {
    type: { type: String, default: '' },
    number: { type: String, default: '' },
    document_url: { type: String, default: '' },
    expires_at: { type: Date, default: null },
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    verifiedByName: String
  },
  profile_details: {
    bio: { type: String, default: '' },
    years_of_experience: { type: Number, default: 0 },
    specialties: { type: [String], default: [] }
  },
  payout_details_masked: String,
  isOnline: { type: Boolean, default: false },
  lastLogin: Date,
  status: { type: String, default: 'active', enum: ['active', 'inactive', 'blocked', 'suspended'] },
  statusHistory: [{
    from: String,
    to: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    changedByName: String,
    reason: String,
    timestamp: { type: Date, default: Date.now }
  }],
  notes: [{
    content: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    createdByName: String,
    createdAt: { type: Date, default: Date.now }
  }],
  messages: [{
    content: String,
    fromAdmin: { type: Boolean, default: true },
    senderId: mongoose.Schema.Types.ObjectId,
    senderName: String,
    createdAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }],
  deleted: { type: Boolean, default: false }
}, { timestamps: true });

ArtisanSchema.index({ email: 1 });
ArtisanSchema.index({ store_slug: 1 });

module.exports = mongoose.model("Artisan", ArtisanSchema, "artisans");
