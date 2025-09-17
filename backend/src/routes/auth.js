const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({error:'missing'});
  const existing = await User.findOne({email});
  if (existing) return res.status(400).json({error:'email exists'});
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({name, email, passwordHash, role});
  const token = jwt.sign({id: user._id, role: user.role}, JWT_SECRET);
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role }});
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({email});
  if (!user) return res.status(400).json({error:'invalid'});
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({error:'invalid'});
  const token = jwt.sign({id:user._id, role:user.role}, JWT_SECRET);
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role }});
});

module.exports = router;
