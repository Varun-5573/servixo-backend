const express = require('express');
const router = express.Router();
const { getReferralInfo, applyReferralCode } = require('../controllers/referralController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getReferralInfo);
router.post('/apply', protect, applyReferralCode);

module.exports = router;
