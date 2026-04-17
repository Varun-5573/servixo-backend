const express = require('express');
const router = express.Router();
const { protect, adminProtect } = require('../middleware/authMiddleware');

// Simple notification store (use Firebase FCM in production)
const notifications = [];

// Send notification (Admin to user)
router.post('/send', adminProtect, async (req, res) => {
  try {
    const { userId, title, body } = req.body;
    const notification = { userId, title, body, timestamp: new Date(), read: false };
    notifications.push(notification);

    const io = req.app.get('io');
    if (io) io.to(`user_${userId}`).emit('notification', notification);

    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get user notifications
router.get('/my', protect, (req, res) => {
  const userNotifs = notifications.filter(n => n.userId === req.user.id);
  res.json({ success: true, notifications: userNotifs });
});

module.exports = router;
