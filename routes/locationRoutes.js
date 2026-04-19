const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');
const { protect } = require('../middleware/authMiddleware');

// Get live location of a worker (for user tracking)
router.get('/worker/:workerId', protect, async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.workerId).select('currentLocation name');
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.json({ success: true, location: worker.currentLocation, name: worker.name });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update user location
router.post('/user', protect, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user.id, { 'location.lat': lat, 'location.lng': lng });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all workers locations (Admin map)
router.get('/all-workers', async (req, res) => {
  try {
    const workers = await Worker.find({ isActive: true }).select('name currentLocation isAvailable');
    res.json({ success: true, workers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all active customers locations (Admin map)
router.get('/active-customers', async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    
    // Find active bookings
    const activeBookings = await Booking.find({ 
      status: { $in: ['pending', 'accepted', 'ongoing', 'accepted'] } 
    }).populate('userId', 'name phone location profileImage');

    const customers = activeBookings.map(b => {
      // Use booking location first, fallback to user profile location
      const lat = b.location?.lat || b.userId?.location?.lat;
      const lng = b.location?.lng || b.userId?.location?.lng;

      return {
        _id: b.userId?._id || b._id,
        name: b.userId?.name || 'Customer',
        location: { lat, lng },
        phone: b.userId?.phone,
        service: b.service,
        bookingId: b._id,
        status: b.status
      };
    }).filter(c => c.location.lat && c.location.lng); 
    
    res.json({ success: true, customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
