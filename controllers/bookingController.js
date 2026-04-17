const Booking = require('../models/Booking');
const Worker = require('../models/Worker');

// Create a new booking
const createBooking = async (req, res) => {
  try {
    const { service, category, description, location, scheduledTime, price } = req.body;
    const booking = await Booking.create({
      userId: req.user.id,
      service,
      category,
      description,
      location,
      scheduledTime,
      price
    });

    // Auto-assign nearest worker
    const workers = await Worker.find({ isAvailable: true, isVerified: true, skills: category });
    if (workers.length > 0) {
      // Nearest worker logic (basic - pick first available)
      let nearestWorker = workers[0];
      let minDist = Infinity;
      workers.forEach(w => {
        if (w.currentLocation && location) {
          const dist = Math.sqrt(
            Math.pow(w.currentLocation.lat - location.lat, 2) +
            Math.pow(w.currentLocation.lng - location.lng, 2)
          );
          if (dist < minDist) { minDist = dist; nearestWorker = w; }
        }
      });
      booking.workerId = nearestWorker._id;
      await booking.save();
    }

    // Notify admin via socket
    const io = req.app.get('io');
    if (io) io.to('admin_room').emit('new_booking', booking);

    res.status(201).json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get user's bookings
const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .populate('workerId', 'name phone profileImage rating currentLocation')
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single booking
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name phone profileImage')
      .populate('workerId', 'name phone profileImage rating currentLocation');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { status, finalPrice } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status, finalPrice: finalPrice || undefined, updatedAt: Date.now() },
      { new: true }
    ).populate('userId', 'name phone');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // If completed, mark worker as available
    if (status === 'completed' && booking.workerId) {
      await Worker.findByIdAndUpdate(booking.workerId, { isAvailable: true });
      // Update worker stats
      await Worker.findByIdAndUpdate(booking.workerId, { $inc: { totalJobs: 1 } });
    }

    // Real-time notify
    const io = req.app.get('io');
    if (io) {
      if (booking.userId && booking.userId._id) {
        io.to(`user_${booking.userId._id}`).emit('booking_update', { bookingId: booking._id, status });
      }
      io.to('admin_room').emit('booking_update', { bookingId: booking._id, status });
    }

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all bookings (Admin)
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'name phone email')
      .populate('workerId', 'name phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Cancel booking
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status: 'cancelled', updatedAt: Date.now() },
      { new: true }
    );
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.workerId) await Worker.findByIdAndUpdate(booking.workerId, { isAvailable: true });
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createBooking, getUserBookings, getBookingById, updateBookingStatus, getAllBookings, cancelBooking };
