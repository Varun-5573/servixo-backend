const express = require('express');
const router = express.Router();
const {
  registerUser, loginUser, getProfile, updateProfile,
  registerWorker, loginWorker, loginAdmin
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// User routes
router.post('/user/register', registerUser);
router.post('/user/login', loginUser);
router.get('/user/profile', protect, getProfile);
router.put('/user/profile', protect, updateProfile);
router.post('/user/profile-photo', protect, upload.single('photo'), async (req, res) => {
  try {
    console.log('--- Incoming photo upload ---');
    console.log('File:', req.file);
    if (!req.file) {
      console.log('No file received from client!');
      return res.status(400).json({ success: false, message: 'No photo provided' });
    }
    
    const User = require('../models/User');
    const photoUrl = `/uploads/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user.id, { profileImage: photoUrl });
    
    console.log('Saved photo URL:', photoUrl);
    res.json({ success: true, profileImage: photoUrl });
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Worker routes  
router.post('/worker/register', registerWorker);
router.post('/worker/login', loginWorker);

// Admin route
router.post('/admin/login', loginAdmin);

module.exports = router;
