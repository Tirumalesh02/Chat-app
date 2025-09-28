// In-memory store (demo only)
module.exports = {
  users: [], // { id, name, email, passwordHash }
  messages: {}, // { [groupId]: [ { groupId, senderId, senderName, content, isAnonymous, timestamp } ] }
  prefs: {}, // { [userId]: { theme, isAnonymous } }
};