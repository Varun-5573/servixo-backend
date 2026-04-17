const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Worker = require('../models/Worker');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// ============ USER AUTH ============
const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, phone, password: hashed });
    const token = generateToken(user._id, 'user');
    res.status(201).json({ success: true, token, user: { id: user._id, name, email, phone } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ success: false, message: 'Invalid credentials' });
    const token = generateToken(user._id, 'user');
    res.json({ success: true, token, user: { id: user._id, name: user.name, email, phone: user.phone, profileImage: user.profileImage } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, profileImage } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, address, profileImage },
      { new: true }
    ).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============ WORKER AUTH ============
const registerWorker = async (req, res) => {
  try {
    const { name, email, phone, password, skills, category } = req.body;
    const exists = await Worker.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const worker = await Worker.create({ name, email, phone, password: hashed, skills, category });
    const token = generateToken(worker._id, 'worker');
    res.status(201).json({ success: true, token, worker: { id: worker._id, name, email, phone } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const loginWorker = async (req, res) => {
  try {
    const { email, password } = req.body;
    const worker = await Worker.findOne({ email: email.toLowerCase() });
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    const match = await bcrypt.compare(password, worker.password);
    if (!match) return res.status(400).json({ success: false, message: 'Invalid credentials' });
    const token = generateToken(worker._id, 'worker');
    res.json({ success: true, token, worker: { id: worker._id, name: worker.name, email, phone: worker.phone, skills: worker.skills, rating: worker.rating } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============ ADMIN AUTH ============
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Hardcoded master admins
    const isDemoAdmin = email === 'admin@servixo.com' && password === 'Admin@123';
    const isUserAdmin = email === 'pittalaadithyavarun555@gmail.com'; // No password check required for your convenience

    if (isDemoAdmin || isUserAdmin) {
      const token = jwt.sign({ id: 'admin', role: 'admin' }, process.env.JWT_SECRET || 'servixo_super_secret_jwt_key_2024', { expiresIn: '7d' });
      return res.json({ success: true, token, admin: { name: 'Varun (Super Admin)', email } });
    }
    res.status(401).json({ success: false, message: 'Invalid admin credentials' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { registerUser, loginUser, getProfile, updateProfile, registerWorker, loginWorker, loginAdmin };
