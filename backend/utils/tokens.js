// backend/utils/tokens.js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET not set in env");

const REFRESH_HMAC_SECRET = process.env.REFRESH_HMAC_SECRET || process.env.JWT_SECRET;

/**
 * Generate a random refresh token (raw string)
 */
function generateRefreshTokenValue() {
  return crypto.randomBytes(48).toString('hex'); // 96 hex chars
}

/**
 * Deterministic HMAC of a token for DB lookup (we store HMAC, not raw token)
 */
function hmacToken(token) {
  return crypto.createHmac('sha256', REFRESH_HMAC_SECRET).update(token).digest('hex');
}

/**
 * Sign a short-lived access token (JWT)
 * payload should minimally include { id: userId }
 * accessTtl in seconds or string like '1h'
 */
function signAccessToken(payload, accessTtl = process.env.JWT_ACCESS_TTL || '1h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: accessTtl });
}

/**
 * Verify an access token, throws if invalid
 */
function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  generateRefreshTokenValue,
  hmacToken,
  signAccessToken,
  verifyAccessToken
};
