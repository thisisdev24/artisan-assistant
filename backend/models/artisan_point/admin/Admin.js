// models/artisan/admin/Admin.js
/**
 * Admin
 * Platform administrator accounts (support, ops). Stores login data, MFA flag,
 * last login metadata and soft-delete flag. Password is excluded by default.
 */
const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, default: 'admin' },
  mfa_enabled: { type: Boolean, default: false },
  last_login_at: Date,
  last_login_ip: String,
  deleted: { type: Boolean, default: false }
}, { timestamps: true });

AdminSchema.index({ email: 1 });

module.exports = mongoose.model("Admin", AdminSchema, "admins");
