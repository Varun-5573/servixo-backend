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

module.exports = router;
