const express = require('express');
const router = express.Router();
const Rating = require('../models/Rating');
const Worker = require('../models/Worker');
const { protect } = require('../middleware/authMiddleware');

// Submit rating
router.post('/', protect, async (req, res) => {
  try {
    const { bookingId, workerId, rating, review } = req.body;
    const existing = await Rating.findOne({ bookingId });
    if (existing) return res.status(400).json({ success: false, message: 'Already rated this booking' });

    const newRating = await Rating.create({ bookingId, userId: req.user.id, workerId, rating, review });

    // Update worker average rating
    const allRatings = await Rating.find({ workerId });
    const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
    await Worker.findByIdAndUpdate(workerId, { rating: avgRating.toFixed(1), totalRatings: allRatings.length });

    res.status(201).json({ success: true, rating: newRating });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get worker ratings
router.get('/worker/:workerId', async (req, res) => {
  try {
    const ratings = await Rating.find({ workerId: req.params.workerId })
      .populate('userId', 'name profileImage')
      .sort({ createdAt: -1 });
    res.json({ success: true, ratings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
