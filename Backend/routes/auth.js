const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const User = require('../models/User');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const COOKIE_NAME = 'token';

// helpers
function setToken(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

router.use(cookieParser());

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });
    setToken(res, { id: String(user._id), name: user.name, email: user.email });
    res.json({ id: String(user._id), name: user.name, email: user.email });
  } catch (e) {
    res.status(500).json({ error: 'signup_failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email, password required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    setToken(res, { id: String(user._id), name: user.name, email: user.email });
    res.json({ id: String(user._id), name: user.name, email: user.email });
  } catch (e) {
    res.status(500).json({ error: 'login_failed' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: false });
  res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'unauthenticated' });
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id).lean();
    if (!user) return res.status(401).json({ error: 'unauthenticated' });
    res.json({ id: String(user._id), name: user.name, email: user.email });
  } catch (e) {
    res.status(401).json({ error: 'unauthenticated' });
  }
});

module.exports = { router, COOKIE_NAME, JWT_SECRET };
