const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  profileImage: { type: String, default: '' },
  skills: [{ type: String }],
  category: { type: String, default: '' },
  experience: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  currentLocation: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
  },
  rating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  totalJobs: { type: Number, default: 0 },
  wallet: { type: Number, default: 0 },
  fcmToken: { type: String, default: '' },
  documents: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Worker', workerSchema);
