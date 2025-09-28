const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, COOKIE_NAME } = require('./auth');
const User = require('../models/User');

const router = express.Router();

function requireAuth(req, res, next) {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'unauthenticated' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'unauthenticated' });
  }
}

router.get('/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  if (userId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  const user = await User.findById(userId).lean();
  res.json({ theme: user?.theme || null, isAnonymous: user?.isAnonymous ?? true });
});

router.post('/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  if (userId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  const { theme, isAnonymous } = req.body || {};
  const update = {};
  if (theme) update.theme = theme;
  if (typeof isAnonymous === 'boolean') update.isAnonymous = isAnonymous;
  const doc = await User.findByIdAndUpdate(userId, update, { new: true }).lean();
  res.json({ theme: doc?.theme || null, isAnonymous: doc?.isAnonymous ?? true });
});

module.exports = { router };
