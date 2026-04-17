const express = require('express');
const router = express.Router();
const { createPaymentOrder, verifyPayment, getPaymentStatus, getAllPayments, getPaymentStats } = require('../controllers/paymentController');
const { protect, adminProtect } = require('../middleware/authMiddleware');

router.post('/create-order', protect, createPaymentOrder);
router.post('/verify', protect, verifyPayment);
router.get('/status/:bookingId', protect, getPaymentStatus);
router.get('/all', adminProtect, getAllPayments);
router.get('/stats', adminProtect, getPaymentStats);

module.exports = router;
