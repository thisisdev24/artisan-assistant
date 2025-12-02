// backend/models/artisan_point/admin/PasswordResetToken.js
/**
 * PasswordResetToken
 * One-time use tokens for password reset and email verification. Stored hashed.
 */
const mongoose = require('mongoose');

const PasswordResetTokenSchema = new mongoose.Schema({
    token_hash: { type: String, required: true, select: false, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    purpose: { type: String, enum: ['password_reset', 'email_verify'], default: 'password_reset' },
    expires_at: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("PasswordResetToken", PasswordResetTokenSchema, "passwordresettoken");
