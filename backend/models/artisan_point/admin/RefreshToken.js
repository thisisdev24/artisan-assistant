/**
 * RefreshToken
 * Stores HMAC-hashed refresh tokens for sessions (applicable to all account types).
 * token_hash is deterministic HMAC so we can lookup quickly by token value.
 */
const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
    token_hash: { type: String, required: true, select: false, index: true }, // HMAC of token
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    expires_at: { type: Date, required: true, index: true },
    revoked: { type: Boolean, default: false },
    replaced_by_hash: { type: String, select: false, default: null },
    last_reauth: { type: Date, default: null } // timestamp of last re-authentication (sensitive actions)
}, { timestamps: true });

module.exports = mongoose.model("RefreshToken", RefreshTokenSchema, "refreshtoken");
