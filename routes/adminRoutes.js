const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Worker = require('../models/Worker');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { adminProtect } = require('../middleware/authMiddleware');

// Dashboard stats
router.get('/stats', adminProtect, async (req, res) => {
  try {
    const [totalUsers, totalWorkers, totalBookings, pendingBookings, completedBookings, cancelledBookings] =
      await Promise.all([
        User.countDocuments(),
        Worker.countDocuments(),
        Booking.countDocuments(),
        Booking.countDocuments({ status: 'pending' }),
        Booking.countDocuments({ status: 'completed' }),
        Booking.countDocuments({ status: 'cancelled' }),
      ]);

    const revenueResult = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Monthly bookings for chart
    const monthlyBookings = await Booking.aggregate([
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      stats: { totalUsers, totalWorkers, totalBookings, pendingBookings, completedBookings, cancelledBookings, totalRevenue },
      monthlyBookings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all users
router.get('/users', adminProtect, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Toggle user active status
router.put('/users/:id/toggle', adminProtect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Assign worker to booking
router.put('/bookings/:id/assign', adminProtect, async (req, res) => {
  try {
    const { workerId } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { workerId, status: 'accepted' },
      { new: true }
    ).populate('userId', 'name phone').populate('workerId', 'name phone');

    const io = req.app.get('io');
    if (io) {
      if (booking.userId && booking.userId._id) {
        io.to(`user_${booking.userId._id}`).emit('booking_update', { bookingId: booking._id, status: 'accepted', worker: booking.workerId });
      }
      io.to(`worker_${workerId}`).emit('new_job_assigned', booking);
    }

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Recent activity
router.get('/activity', adminProtect, async (req, res) => {
  try {
    const recentBookings = await Booking.find()
      .populate('userId', 'name')
      .populate('workerId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ success: true, recentBookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
