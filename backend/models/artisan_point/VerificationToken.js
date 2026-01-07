const mongoose = require('mongoose');

const VerificationTokenSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, index: true },
    code: { type: String, required: true }, // 6-digit code (for simple implementation)
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    verified: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 } // number of failed verify attempts
});

// auto-delete expired docs (TTL on expiresAt)
VerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// optional compound index to quickly lookup recent token per email
VerificationTokenSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model('VerificationToken', VerificationTokenSchema, 'verification_tokens');