const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:        { type: String, enum: ['credit', 'debit'], required: true },
  amount:      { type: Number, required: true },
  description: { type: String, default: '' },
  // Possible sources: 'recharge', 'booking_payment', 'referral_bonus', 'refund', 'cashback'
  source:      { type: String, default: 'recharge' },
  referenceId: { type: String, default: '' }, // paymentId or bookingId
  balanceAfter:{ type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
