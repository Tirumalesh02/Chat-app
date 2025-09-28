const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  groupId: { type: String, required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  content: { type: String, required: true },
  isAnonymous: { type: Boolean, default: true },
  timestamp: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
