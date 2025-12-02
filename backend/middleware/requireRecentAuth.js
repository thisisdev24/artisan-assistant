// backend/middleware/requireRecentAuth.js
const RefreshToken = require('../models/artisan_point/admin/RefreshToken');
const { hmacToken } = require('../utils/tokens');

const REAUTH_WINDOW_MINUTES = parseInt(process.env.REAUTH_WINDOW_MINUTES || "60", 10);

/**
 * If user needs to re-auth (sensitive action), respond with 401 and { need_reauth: true }.
 * Assumes authenticate middleware already ran and req.user exists.
 */
async function requireRecentAuth(req, res, next) {
  try {
    const cookieValue = req.cookies?.[process.env.REFRESH_COOKIE_NAME || 'refresh_token'] || req.refreshTokenCookie || null;
    if (!cookieValue) {
      return res.status(401).json({ need_reauth: true, msg: "No session cookie" });
    }

    const incomingHash = hmacToken(cookieValue);
    const tokenDoc = await RefreshToken.findOne({ token_hash: incomingHash }).select('+last_reauth +expires_at +revoked');

    if (!tokenDoc || tokenDoc.revoked || new Date() > tokenDoc.expires_at) {
      return res.status(401).json({ need_reauth: true, msg: "Session invalid or expired" });
    }

    const lastReauth = tokenDoc.last_reauth;
    if (!lastReauth) {
      return res.status(401).json({ need_reauth: true, msg: "Reauthentication required" });
    }

    const ageMinutes = (Date.now() - new Date(lastReauth).getTime()) / (60 * 1000);
    if (ageMinutes > REAUTH_WINDOW_MINUTES) {
      return res.status(401).json({ need_reauth: true, msg: "Reauthentication required" });
    }

    // OK
    next();
  } catch (err) {
    console.error("requireRecentAuth error", err);
    return res.status(401).json({ need_reauth: true });
  }
}

module.exports = requireRecentAuth;
