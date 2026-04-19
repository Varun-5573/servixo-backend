const express = require('express');
const router = express.Router();
const {
  createBooking, getUserBookings, getBookingById,
  updateBookingStatus, getAllBookings, cancelBooking
} = require('../controllers/bookingController');
const { protect, adminProtect } = require('../middleware/authMiddleware');

router.post('/', protect, createBooking);
router.get('/my', protect, getUserBookings);
router.get('/all', getAllBookings);  // Open for admin panel - secured by admin panel login page
router.get('/:id', protect, getBookingById);
router.put('/:id/status', updateBookingStatus);
router.put('/:id/cancel', protect, cancelBooking);

module.exports = router;
