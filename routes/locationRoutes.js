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
    
    // Find ALL active bookings sorted newest first
    const activeBookings = await Booking.find({ 
      status: { $in: ['pending', 'accepted', 'ongoing'] } 
    })
    .populate('userId', 'name phone location profileImage')
    .sort({ createdAt: -1 }); // newest first

    // Deduplicate: keep only the LATEST booking per user
    const seenUsers = new Set();
    const latestBookings = [];
    for (const b of activeBookings) {
      const uid = b.userId?._id?.toString() || b._id.toString();
      if (!seenUsers.has(uid)) {
        seenUsers.add(uid);
        latestBookings.push(b);
      }
    }

    const customers = latestBookings.map(b => {
      // Prefer booking GPS (captured at booking time) over user profile location
      const bLat = b.location?.lat;
      const bLng = b.location?.lng;
      const uLat = b.userId?.location?.lat;
      const uLng = b.userId?.location?.lng;

      // Booking location takes priority; fallback to user profile
      let lat = (bLat && bLat !== 0) ? bLat : (uLat && uLat !== 0 ? uLat : null);
      let lng = (bLng && bLng !== 0) ? bLng : (uLng && uLng !== 0 ? uLng : null);

      const hasGps = !!(lat && lng);

      console.log(`📍 Customer: ${b.userId?.name} | bookingLat: ${bLat} | userLat: ${uLat} | final: ${lat}, ${lng}`);

      return {
        _id: b.userId?._id || b._id,
        name: b.userId?.name || 'Customer',
        location: hasGps ? { lat, lng } : null,
        hasGps,
        phone: b.userId?.phone,
        service: b.service,
        bookingId: b._id,
        address: b.location?.address || '',
        status: b.status
      };
    });
    
    console.log(`\n📊 Active customers: ${customers.length} (${customers.filter(c=>c.hasGps).length} with GPS)`);
    res.json({ success: true, customers });
  } catch (err) {
    console.error('active-customers error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
