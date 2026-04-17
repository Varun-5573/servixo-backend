const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  senderType: { type: String, enum: ['user', 'worker', 'admin', 'bot'], default: 'user' },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  message: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'location', 'bot'], default: 'text' },
  isRead: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
