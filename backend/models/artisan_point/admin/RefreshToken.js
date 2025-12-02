// models/artisan/admin/RefreshToken.js
/**
 * RefreshToken
 * Stores hashed refresh tokens for sessions (applicable to all account types).
 * Tokens are stored hashed and select:false should be used for secret fields.
 */
const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
    token_hash: { type: String, required: true, select: false, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    expires_at: { type: Date, required: true, index: true },
    revoked: { type: Boolean, default: false },
    replaced_by_hash: { type: String, select: false, default: null }
}, { timestamps: true });

module.exports = mongoose.model("RefreshToken", RefreshTokenSchema, "refreshtoken");
