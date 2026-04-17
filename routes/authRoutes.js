const express = require('express');
const router = express.Router();
const {
  registerUser, loginUser, getProfile, updateProfile,
  registerWorker, loginWorker, loginAdmin
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// User routes
router.post('/user/register', registerUser);
router.post('/user/login', loginUser);
router.get('/user/profile', protect, getProfile);
router.put('/user/profile', protect, updateProfile);

// Worker routes  
router.post('/worker/register', registerWorker);
router.post('/worker/login', loginWorker);

// Admin route
router.post('/admin/login', loginAdmin);

module.exports = router;
