const express = require('express');
const router = express.Router();
const {
  createBooking, getUserBookings, getBookingById,
  updateBookingStatus, getAllBookings, cancelBooking
} = require('../controllers/bookingController');
const { protect, adminProtect } = require('../middleware/authMiddleware');

router.post('/', protect, createBooking);
router.get('/my', protect, getUserBookings);
router.get('/all', adminProtect, getAllBookings);
router.get('/:id', protect, getBookingById);
router.put('/:id/status', protect, updateBookingStatus);
router.put('/:id/cancel', protect, cancelBooking);

module.exports = router;
