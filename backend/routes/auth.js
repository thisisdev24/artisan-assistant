const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Artisan = require("../models/Artisan");
const Admin = require("../models/Admin");
require("dotenv").config();

function getModelName(role) {
  if (role === "buyer") return User;
  else if (role === "seller") return Artisan;
  return Admin;
}

// Register route
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
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
      res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } else if (req.body.role === "seller") {
      user = new Artisan({ name, email, password: hashedPassword, role: req.body.role, store: req.body.store });
      await user.save();
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
      res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, store: user.store } });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Login route
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;
  console.log("Login attempt:", { email, role }); // Debug log
  try {
    const Model = getModelName(role);
    console.log("Using model:", Model.modelName); // Debug log

    const user = await Model.findOne({ email });
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
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "24h" });

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, store: user.store } });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).send("Server error");
  }
});

// Verify token route
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

module.exports = router;




// const express = require('express');
// const router = express.Router();
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const User = require('../models/User');

// const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// router.post('/register', async (req, res) => {
//   const { name, email, password, role } = req.body;
//   if (!email || !password) return res.status(400).json({error:'missing'});
//   const existing = await User.findOne({email});
//   if (existing) return res.status(400).json({error:'email exists'});
//   const passwordHash = await bcrypt.hash(password, 10);
//   const user = await User.create({name, email, passwordHash, role});
//   const token = jwt.sign({id: user._id, role: user.role}, JWT_SECRET);
//   res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role }});
// });

// router.post('/login', async (req, res) => {
//   const { email, password } = req.body;
//   const user = await User.findOne({email});
//   if (!user) return res.status(400).json({error:'invalid'});
//   const ok = await bcrypt.compare(password, user.passwordHash);
//   if (!ok) return res.status(400).json({error:'invalid'});
//   const token = jwt.sign({id:user._id, role:user.role}, JWT_SECRET);
//   res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role }});
// });

// module.exports = router;
