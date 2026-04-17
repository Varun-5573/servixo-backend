const crypto = require('crypto');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');

// Razorpay is optional - only initialize if keys are present
let razorpay = null;
try {
  if (process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes('YOUR_')) {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
} catch(e) {}


// Create Razorpay order
const createPaymentOrder = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;
    const order = await razorpay.orders.create({
      amount: amount * 100, // in paise
      currency: 'INR',
      receipt: `receipt_${bookingId}`,
    });

    await Payment.create({
      bookingId,
      userId: req.user.id,
      amount,
      razorpayOrderId: order.id,
    });

    res.json({ success: true, order, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Verify payment
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Update payment record
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { status: 'success', razorpayPaymentId: razorpay_payment_id, transactionId: razorpay_payment_id }
    );

    // Update booking payment status
    await Booking.findByIdAndUpdate(bookingId, { paymentStatus: 'paid', paymentId: razorpay_payment_id });

    // Notify admin
    const io = req.app.get('io');
    if (io) io.to('admin_room').emit('payment_success', { bookingId, razorpay_payment_id });

    res.json({ success: true, message: 'Payment verified successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get payment status
const getPaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findOne({ bookingId: req.params.bookingId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all payments (Admin)
const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('bookingId')
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Payment stats (Admin)
const getPaymentStats = async (req, res) => {
  try {
    const total = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const count = await Payment.countDocuments({ status: 'success' });
    res.json({ success: true, totalRevenue: total[0]?.total || 0, totalTransactions: count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createPaymentOrder, verifyPayment, getPaymentStatus, getAllPayments, getPaymentStats };
