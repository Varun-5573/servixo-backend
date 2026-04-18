const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  refereeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  code:        { type: String, required: true },
  bonusPaid:   { type: Boolean, default: false },
  bonusAmount: { type: Number, default: 100 }, // ₹100 bonus per referral
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Referral', referralSchema);
