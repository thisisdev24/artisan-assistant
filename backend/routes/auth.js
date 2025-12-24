// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/artisan_point/user/User");
const Artisan = require("../models/artisan_point/artisan/Artisan");
const Admin = require("../models/artisan_point/admin/Admin");
const RefreshToken = require("../models/artisan_point/admin/RefreshToken");
const { generateRefreshTokenValue, hmacToken, signAccessToken } = require("../utils/tokens");
const { authenticate } = require("../middleware/auth");
const { logEvent } = require("../services/logs/loggerService");

require("dotenv").config();

const REFRESH_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || "7", 10);
const REAUTH_WINDOW_MINUTES = parseInt(process.env.REAUTH_WINDOW_MINUTES || "60", 10);

const COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "refresh_token";
const COOKIE_SECURE = (process.env.NODE_ENV === "production"); // secure only in prod
const COOKIE_SAMESITE = process.env.REFRESH_COOKIE_SAMESITE || "Lax"; // Lax by default

function getModelName(role) {
  if (role === "buyer") return User;
  else if (role === "seller") return Artisan;
  return Admin;
}

function sendRefreshCookie(res, tokenValue, maxAgeMs) {
  // cookie options
  const opts = {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    path: "/",
    maxAge: maxAgeMs
  };
  res.cookie(COOKIE_NAME, tokenValue, opts);
}

function clearRefreshCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/', httpOnly: true, secure: COOKIE_SECURE, sameSite: COOKIE_SAMESITE });
}

// ---------------------------
// Register (keeps existing behavior but also issues refresh cookie)
// ---------------------------
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Prevent admin registration
    if (req.body.role === "admin") {
      return res.status(403).json({ msg: "Admin registration is not allowed" });
    }

    if (req.body.role === "buyer") {
      user = new User({ name, email, password: hashedPassword, role: req.body.role });
      await user.save();
    } else if (req.body.role === "seller") {
      user = new Artisan({ name, email, password: hashedPassword, role: req.body.role, store: req.body.store });
      await user.save();
    } else {
      return res.status(400).json({ msg: "Invalid role" });
    }

    // create access token and refresh cookie
    const accessToken = signAccessToken({ id: user._id }, process.env.JWT_ACCESS_TTL || "1h");

    // create refresh token entry
    const refreshValue = generateRefreshTokenValue();
    const refreshHash = hmacToken(refreshValue);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      token_hash: refreshHash,
      user_id: user._id,
      expires_at: expiresAt,
      last_reauth: new Date()
    });

    // send cookie + response
    sendRefreshCookie(res, refreshValue, REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    res.json({
      token: accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ---------------------------
// Login (issue access token + refresh cookie stored server-side)
// ---------------------------
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;
  console.log("Login attempt:", { email, role }); // Debug log
  try {
    const Model = getModelName(role);
    console.log("Using model:", Model.modelName); // Debug log

    const user = await Model.findOne({ email }).select("+password");
    if (!user) {
      console.log("User not found in DB");
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch); // Debug log

    if (!isMatch) return res.status(400).json({ msg: "Invalid password" });

    // Update login status - initialize if not exists
    if (!user.login) {
      user.login = {
        is_logged_in: false,
        last_login_at: null,
        last_logout_at: null,
        login_count: 0
      };
    }
    user.login.is_logged_in = true;
    user.login.last_login_at = new Date();
    user.login.login_count = (user.login.login_count || 0) + 1;
    // Also set top-level fields for admin panel
    user.isOnline = true;
    user.lastLogin = new Date();
    await user.save();


    // Access token
    const accessToken = signAccessToken({ id: user._id }, process.env.JWT_ACCESS_TTL || "1h");

    // create refresh token and persist hashed HMAC
    const refreshValue = generateRefreshTokenValue();
    const refreshHash = hmacToken(refreshValue);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      token_hash: refreshHash,
      user_id: user._id,
      expires_at: expiresAt,
      last_reauth: new Date()
    });

    // set cookie (HttpOnly)
    sendRefreshCookie(res, refreshValue, REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    // Log the successful login
    logEvent({
      event_type: "USER_LOGIN",
      category: "security",
      security: {
        action: "login",
        status: "success",
        user_id: user._id.toString(),
        user_role: user.role,
        ip_address: req.ip || req.connection.remoteAddress
      },
      actor: {
        user_id: user._id.toString(),
        role: user.role,
        email: user.email
      }
    });

    res.json({
      token: accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, store: user.store }
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).send("Server error");
  }
});

// ---------------------------
// Refresh endpoint (rotate refresh token, sliding expiration)
// ---------------------------
router.post("/refresh", async (req, res) => {
  try {
    const cookieValue = req.cookies?.[COOKIE_NAME] || req.refreshTokenCookie || null;
    if (!cookieValue) return res.status(401).json({ msg: "No refresh token" });

    const incomingHash = hmacToken(cookieValue);

    // find token doc quickly by token_hash
    const tokenDoc = await RefreshToken.findOne({ token_hash: incomingHash }).select('+token_hash +revoked +expires_at +user_id +last_reauth');
    if (!tokenDoc) {
      // Could be rotated (old token's hash replaced_by_hash) - try to detect if it was replaced (optional)
      return res.status(401).json({ msg: "Refresh token invalid" });
    }

    // check revoked / expired
    if (tokenDoc.revoked) return res.status(401).json({ msg: "Refresh token revoked" });
    if (new Date() > tokenDoc.expires_at) return res.status(401).json({ msg: "Refresh token expired" });

    const user = await User.findById(tokenDoc.user_id) || await Artisan.findById(tokenDoc.user_id) || await Admin.findById(tokenDoc.user_id);
    if (!user) return res.status(401).json({ msg: "User not found for refresh token" });

    // rotate: create new refresh token, mark old token revoked and set replaced_by_hash
    const newValue = generateRefreshTokenValue();
    const newHash = hmacToken(newValue);
    const newExpiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    // mark old revoked and set replaced_by_hash
    tokenDoc.revoked = true;
    tokenDoc.replaced_by_hash = newHash;
    await tokenDoc.save();

    // create new DB entry
    await RefreshToken.create({
      token_hash: newHash,
      user_id: tokenDoc.user_id,
      expires_at: newExpiresAt,
      last_reauth: tokenDoc.last_reauth || null
    });

    // issue new access token + set cookie
    const accessToken = signAccessToken({ id: user._id }, process.env.JWT_ACCESS_TTL || "1h");
    sendRefreshCookie(res, newValue, REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    res.json({ token: accessToken, user: { id: user._id, name: user.name, email: user.email, role: user.role, store: user.store } });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(500).json({ msg: "refresh_failed" });
  }
});

// ---------------------------
// Logout (revoke refresh token)
router.post("/logout", authenticate, async (req, res) => {
  try {
    const cookieValue = req.cookies?.[COOKIE_NAME] || req.refreshTokenCookie || null;
    if (cookieValue) {
      const incomingHash = hmacToken(cookieValue);
      const tokenDoc = await RefreshToken.findOne({ token_hash: incomingHash }).select('+token_hash +revoked');
      if (tokenDoc) {
        tokenDoc.revoked = true;
        await tokenDoc.save();
      }
    }

    // clear cookie
    clearRefreshCookie(res);

    // update user login status if desired
    const uid = req.user?.id;
    if (uid) {
      const Model = (req.user.role === 'seller') ? Artisan : (req.user.role === 'admin') ? Admin : User;
      try {
        const userDoc = await Model.findById(uid).select('+login');
        if (userDoc) {
          userDoc.login = userDoc.login || {};
          userDoc.login.last_logout_at = new Date();
          userDoc.login.is_logged_in = false;
          userDoc.isOnline = false; // Also set top-level field
          await userDoc.save();
        }

        // Log logout
        logEvent({
          event_type: "USER_LOGOUT",
          category: "security",
          security: {
            action: "logout",
            status: "success",
            user_id: uid,
            user_role: req.user.role || 'unknown'
          },
          actor: {
            user_id: uid,
            role: req.user.role || 'unknown'
          }
        });

      } catch (e) {
        // ignore
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ msg: "logout_failed" });
  }
});

// ---------------------------
// Re-authenticate (sensitive action) - client sends { password }
// On success, update last_reauth on the refresh token session so future protected routes see a recent reauth.
router.post("/reauth", authenticate, async (req, res) => {
  try {
    const password = req.body.password;
    if (!password) return res.status(400).json({ msg: "Password required" });

    const uid = req.user.id;
    // find model by role
    let userDoc;
    if (req.user.role === 'seller') userDoc = await Artisan.findById(uid).select('+password');
    else if (req.user.role === 'admin') userDoc = await Admin.findById(uid).select('+password');
    else userDoc = await User.findById(uid).select('+password');

    if (!userDoc) return res.status(401).json({ msg: "User not found" });

    const ok = await bcrypt.compare(password, userDoc.password);
    if (!ok) return res.status(401).json({ msg: "Invalid password" });

    // update last_reauth on current refresh token session (if cookie present)
    const cookieValue = req.cookies?.[COOKIE_NAME] || req.refreshTokenCookie || null;
    if (cookieValue) {
      const incomingHash = hmacToken(cookieValue);
      const tokenDoc = await RefreshToken.findOne({ token_hash: incomingHash }).select('+token_hash');
      if (tokenDoc) {
        tokenDoc.last_reauth = new Date();
        await tokenDoc.save();
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Reauth error:", err);
    res.status(500).json({ msg: "reauth_failed" });
  }
});

// ---------------------------
// Verify token route (keep but unchanged) - remains for UI checks (uses Authorization header)
router.get("/verify", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "") ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ msg: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try to find user in all models since token doesn't contain role
    let user = await User.findById(decoded.id).select("-password");
    if (!user) {
      user = await Artisan.findById(decoded.id).select("-password");
    }
    if (!user) {
      user = await Admin.findById(decoded.id).select("-password");
    }

    if (!user) {
      return res.status(401).json({ msg: "User not found" });
    }

    // Check if user is blocked or deleted
    if (user.status === "blocked" || (user.soft_delete && user.soft_delete.is_deleted)) {
      return res.status(403).json({ msg: "User account is blocked or deleted" });
    }

    res.json({
      valid: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        store: user.store || null
      }
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: "Invalid or expired token" });
    }
    console.error("Verify token error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ---------------------------
// Profile-full route for buyer/seller/admin
// ---------------------------

router.get("/profile-full", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let Model;
    if (role === "buyer") Model = User;
    else if (role === "seller") Model = Artisan;
    else Model = Admin;

    const user = await Model.findById(userId)
      .select("-password")
      .lean();

    if (!user) return res.status(404).json({ msg: "User not found" });

    // Build response based on role
    let result = {
      details: {
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        phone_verified: user.phone_verified || false,
        email_verified: user.email_verified || false,
        store: user.store || null,
        mfa_enabled: user.mfa_enabled || false,
        last_login_at: user.login?.last_login_at || null,
        last_login_ip: user.login?.last_login_ip || null
      }
    };

    // Buyer fields
    if (role === "buyer") {
      const Address = require("../models/artisan_point/user/Address");
      const Order = require("../models/artisan_point/user/Order");
      const Wishlist = require("../models/artisan_point/user/Wishlist");

      const addresses = await Address.find({ user_id: userId }).lean();
      const orders = await Order.find({ user_id: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      const wishlistCount = await Wishlist.countDocuments({ user_id: userId });

      result.addresses = addresses;
      result.recent_orders = orders;
      result.wishlist_count = wishlistCount;
    }

    // Seller fields
    if (role === "seller") {
      result.storefront = user.storefront || null;
      result.settings = user.settings || null;
      result.payout_account = user.payout_account || null;
      result.documents = user.documents || [];
      result.warehouses = user.warehouses || [];
      result.notification_pref = user.notification_pref || {};
      result.seller_profile = {
        address: user.address || null,
        identity_card: user.identity_card || null,
        profile_details: user.profile_details || null,
        store_overview: {
          description: user.store_description || '',
          logo: user.store_logo || '',
          banner: user.store_banner || ''
        }
      };
    }

    // Admin fields
    if (role === "admin") {
      result.details.mfa_enabled = user.mfa_enabled || false;
    }

    return res.json(result);

  } catch (err) {
    console.error("profile-full error:", err);
    return res.status(500).json({ msg: "profile_fetch_failed" });
  }
});

// ---------------------------
// Update Profile Route
// ---------------------------
router.put("/profile", authenticate, async (req, res) => {
  try {
    const { phone } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    let Model = getModelName(role);
    const user = await Model.findById(userId);

    if (!user) return res.status(404).json({ msg: "User not found" });

    // Handle Phone Update
    if (phone !== undefined) {
      if (user.phone !== phone) {
        user.phone = phone;
        user.phone_verified = false; // Reset verification on change
      }
    }

    await user.save();

    res.json({
      msg: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
