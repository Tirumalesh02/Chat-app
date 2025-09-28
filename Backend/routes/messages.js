const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, COOKIE_NAME } = require('./auth');
const Message = require('../models/Message');

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

router.get('/:groupId', requireAuth, async (req, res) => {
  const { groupId } = req.params;
  const list = await Message.find({ groupId }).sort({ createdAt: 1 }).lean();
  res.json(list);
});

module.exports = { router, requireAuth };
