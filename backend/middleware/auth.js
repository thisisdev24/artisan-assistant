const jwt = require("jsonwebtoken");
const User = require("../models/artisan_point/user/User");
const Artisan = require("../models/artisan_point/artisan/Artisan");
const Admin = require("../models/artisan_point/admin/Admin");

// Middleware to verify JWT token and attach user to request
const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "") ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ msg: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try to find user in all models
    let user = await User.findById(decoded.id);
    if (!user) {
      user = await Artisan.findById(decoded.id);
    }
    if (!user) {
      user = await Admin.findById(decoded.id);
    }

    if (!user) {
      return res.status(401).json({ msg: "Token is not valid" });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      store: user.store || null
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(401).json({ msg: "Token is not valid" });
  }
};

// Middleware to check if user has specific role(s)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ msg: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ msg: "Access denied. Insufficient permissions." });
    }

    next();
  };
};

// Middleware to check if user is buyer (for cart operations)
const requireBuyer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ msg: "Authentication required" });
  }

  if (req.user.role !== "buyer") {
    return res.status(403).json({ msg: "Only buyers can access cart" });
  }

  next();
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ msg: "Authentication required" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Admin access required" });
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  requireBuyer,
  requireAdmin
};

