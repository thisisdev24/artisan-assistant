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
  email_verified: { type: Boolean, default: false },
  profile_image: String,
  deleted: { type: Boolean, default: false },
  deleted_at: Date
}, { timestamps: true });

UserSchema.index({ email: 1 });

module.exports = mongoose.model("User", UserSchema, "users");
