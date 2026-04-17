const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');
const { protect, workerProtect, adminProtect } = require('../middleware/authMiddleware');

// Get worker profile
router.get('/profile', workerProtect, async (req, res) => {
  try {
    const worker = await Worker.findById(req.user.id).select('-password');
    res.json({ success: true, worker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update worker profile
router.put('/profile', workerProtect, async (req, res) => {
  try {
    const { name, phone, skills, category, isAvailable, fcmToken } = req.body;
    const worker = await Worker.findByIdAndUpdate(
      req.user.id,
      { name, phone, skills, category, isAvailable, fcmToken },
      { new: true }
    ).select('-password');
    res.json({ success: true, worker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update worker location
router.post('/location', workerProtect, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const worker = await Worker.findByIdAndUpdate(
      req.user.id,
      { 'currentLocation.lat': lat, 'currentLocation.lng': lng, 'currentLocation.updatedAt': new Date() },
      { new: true }
    );
    const io = req.app.get('io');
    if (io) io.to('admin_room').emit('worker_location', { workerId: req.user.id, lat, lng });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get worker bookings
router.get('/bookings', workerProtect, async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const bookings = await Booking.find({ workerId: req.user.id })
      .populate('userId', 'name phone profileImage')
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all workers (Admin)
router.get('/all', adminProtect, async (req, res) => {
  try {
    const workers = await Worker.find().select('-password');
    res.json({ success: true, workers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get workers by category (User)
router.get('/by-category/:category', protect, async (req, res) => {
  try {
    const { category } = req.params;

    // Try exact category/skill match first (treat undefined isActive as active)
    let workers = await Worker.find({
      $or: [
        { category: { $regex: category, $options: 'i' } },
        { skills: { $elemMatch: { $regex: category, $options: 'i' } } }
      ],
      isActive: { $ne: false },
      isVerified: true
    })
    .select('-password')
    .sort({ isAvailable: -1, rating: -1 })
    .limit(10);

    // Fallback: return ALL verified workers if no category match found
    if (workers.length === 0) {
      workers = await Worker.find({ isActive: { $ne: false }, isVerified: true })
        .select('-password')
        .sort({ isAvailable: -1, rating: -1 })
        .limit(10);
    }

    res.json({ success: true, workers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin verify worker
router.put('/:id/verify', adminProtect, async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true }).select('-password');
    res.json({ success: true, worker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin toggle worker active status
router.put('/:id/toggle', adminProtect, async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    worker.isActive = !worker.isActive;
    await worker.save();
    res.json({ success: true, worker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Add Worker
router.post('/add', adminProtect, async (req, res) => {
  try {
    const { name, email, phone, password, skills, category } = req.body;
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password || 'Worker@123', 10);
    const worker = await Worker.create({ name, email, phone, password: hashed, skills, category, isVerified: true, isActive: true, isAvailable: true });
    res.status(201).json({ success: true, worker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Edit Worker
router.put('/:id/edit', adminProtect, async (req, res) => {
  try {
    const { name, email, phone, skills, category } = req.body;
    const worker = await Worker.findByIdAndUpdate(req.params.id, { name, email, phone, skills, category }, { new: true }).select('-password');
    res.json({ success: true, worker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
