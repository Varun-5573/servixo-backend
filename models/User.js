const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  profileImage: { type: String, default: '' },
  address: { type: String, default: '' },
  location: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 }
  },
  fcmToken: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  referralCode: { type: String, unique: true, sparse: true },
  wallet: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
