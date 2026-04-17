const express = require('express');
const router = express.Router();
const { sendMessage, getMessages, getAllMessages, adminSendMessage, aiChatbot } = require('../controllers/chatController');
const { protect, adminProtect } = require('../middleware/authMiddleware');

router.post('/send', protect, sendMessage);
router.get('/:otherUserId', protect, getMessages);
router.get('/', adminProtect, getAllMessages);
router.post('/admin/send', adminProtect, adminSendMessage);
router.post('/bot', protect, aiChatbot);

module.exports = router;
