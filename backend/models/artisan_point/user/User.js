// backend/models/artisan_point/user/User.js
/**
 * User
 * Customer accounts. Stores profile, contact, and soft-delete info.
 * Password is excluded by default from queries.
 */
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, default: 'buyer' },
  phone: String,
  phone_verified: { type: Boolean, default: false },
  email_verified: { type: Boolean, default: false },
  profile_image: String,
  status: { type: String, default: 'active', enum: ['active', 'inactive', 'blocked'] },
  statusHistory: [{
    from: String,
    to: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    changedByName: String,
    reason: String,
    timestamp: { type: Date, default: Date.now }
  }],
  lastLogin: Date,
  isOnline: { type: Boolean, default: false },
  store: String, // For sellers
  deleted: { type: Boolean, default: false },
  deleted_at: Date
}, { timestamps: true });

UserSchema.index({ email: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ role: 1 });

module.exports = mongoose.model("User", UserSchema, "users");
