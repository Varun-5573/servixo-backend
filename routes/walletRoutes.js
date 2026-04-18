const express = require('express');
const router = express.Router();
const { getWallet, addWalletMoney, payWithWallet, getTransactions } = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getWallet);
router.post('/add', protect, addWalletMoney);
router.post('/pay', protect, payWithWallet);
router.get('/transactions', protect, getTransactions);

module.exports = router;
