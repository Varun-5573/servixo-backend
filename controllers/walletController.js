const User = require('../models/User');
const Booking = require('../models/Booking');
const WalletTransaction = require('../models/WalletTransaction');

// ── GET WALLET BALANCE ────────────────────────────────────────────────────
exports.getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name email wallet');
    if (!user) return res.json({ success: false, message: 'User not found' });
    res.json({ success: true, balance: user.wallet, user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADD MONEY TO WALLET ───────────────────────────────────────────────────
exports.addWalletMoney = async (req, res) => {
  try {
    const { amount, paymentId } = req.body;
    if (!amount || amount <= 0) return res.json({ success: false, message: 'Invalid amount' });

    const user = await User.findById(req.user.id);
    if (!user) return res.json({ success: false, message: 'User not found' });

    user.wallet = (user.wallet || 0) + Number(amount);
    await user.save();

    const tx = await WalletTransaction.create({
      userId:       user._id,
      type:         'credit',
      amount:       Number(amount),
      description:  `Wallet recharge via Razorpay`,
      source:       'recharge',
      referenceId:  paymentId || '',
      balanceAfter: user.wallet,
    });

    res.json({ success: true, balance: user.wallet, transaction: tx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PAY BOOKING WITH WALLET ───────────────────────────────────────────────
exports.payWithWallet = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.json({ success: false, message: 'Booking not found' });
    if (booking.userId.toString() !== req.user.id)
      return res.json({ success: false, message: 'Not your booking' });
    if (booking.paymentStatus === 'paid')
      return res.json({ success: false, message: 'Already paid' });

    const user = await User.findById(req.user.id);
    const amount = booking.finalPrice || booking.price;

    if ((user.wallet || 0) < amount)
      return res.json({ success: false, message: 'Insufficient wallet balance' });

    user.wallet -= amount;
    await user.save();

    booking.paymentStatus = 'paid';
    booking.paymentId = `wallet_${Date.now()}`;
    await booking.save();

    await WalletTransaction.create({
      userId:       user._id,
      type:         'debit',
      amount:       amount,
      description:  `Payment for booking #${bookingId.slice(-6).toUpperCase()}`,
      source:       'booking_payment',
      referenceId:  bookingId,
      balanceAfter: user.wallet,
    });

    res.json({ success: true, balance: user.wallet, message: 'Payment successful via Wallet!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET TRANSACTION HISTORY ───────────────────────────────────────────────
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await WalletTransaction.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
