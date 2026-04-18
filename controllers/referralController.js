const User = require('../models/User');
const Referral = require('../models/Referral');
const WalletTransaction = require('../models/WalletTransaction');

const REFERRAL_BONUS = 100; // ₹100 for each successful referral

// ── GENERATE UNIQUE REFERRAL CODE ─────────────────────────────────────────
const generateCode = (name) => {
  const clean = name.replace(/\s+/g, '').toUpperCase().slice(0, 5);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${clean}${rand}`;
};

// ── GET REFERRAL INFO FOR CURRENT USER ────────────────────────────────────
exports.getReferralInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name referralCode wallet');
    if (!user) return res.json({ success: false, message: 'User not found' });

    // Auto-generate code if user doesn't have one
    if (!user.referralCode) {
      let code = generateCode(user.name);
      // Ensure uniqueness
      while (await User.findOne({ referralCode: code })) {
        code = generateCode(user.name);
      }
      user.referralCode = code;
      await user.save();
    }

    const referrals = await Referral.find({ referrerId: user._id })
      .populate('refereeId', 'name email createdAt');

    const totalEarned = referrals.filter(r => r.bonusPaid).length * REFERRAL_BONUS;

    res.json({
      success: true,
      referralCode: user.referralCode,
      totalReferrals: referrals.length,
      successfulReferrals: referrals.filter(r => r.bonusPaid).length,
      totalEarned,
      bonusPerReferral: REFERRAL_BONUS,
      referrals: referrals.map(r => ({
        name: r.refereeId?.name || 'Unknown',
        email: r.refereeId?.email || '',
        joinedAt: r.createdAt,
        bonusPaid: r.bonusPaid,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── APPLY REFERRAL CODE (called during/after registration) ────────────────
exports.applyReferralCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.json({ success: false, message: 'Referral code required' });

    const referee = await User.findById(req.user.id);
    if (!referee) return res.json({ success: false, message: 'User not found' });

    // Prevent using own code
    if (referee.referralCode === code.toUpperCase())
      return res.json({ success: false, message: "You can't use your own referral code!" });

    const referrer = await User.findOne({ referralCode: code.toUpperCase() });
    if (!referrer) return res.json({ success: false, message: 'Invalid referral code' });

    // Check if already used a referral
    const alreadyReferred = await Referral.findOne({ refereeId: referee._id });
    if (alreadyReferred) return res.json({ success: false, message: 'You have already used a referral code' });

    // Create referral record
    await Referral.create({
      referrerId:  referrer._id,
      refereeId:   referee._id,
      code:        code.toUpperCase(),
      bonusPaid:   true,
      bonusAmount: REFERRAL_BONUS,
    });

    // Credit ₹100 to referrer
    referrer.wallet = (referrer.wallet || 0) + REFERRAL_BONUS;
    await referrer.save();
    await WalletTransaction.create({
      userId:       referrer._id,
      type:         'credit',
      amount:       REFERRAL_BONUS,
      description:  `Referral bonus — ${referee.name} joined using your code!`,
      source:       'referral_bonus',
      referenceId:  referee._id.toString(),
      balanceAfter: referrer.wallet,
    });

    // Credit ₹50 welcome bonus to referee
    const welcomeBonus = 50;
    referee.wallet = (referee.wallet || 0) + welcomeBonus;
    await referee.save();
    await WalletTransaction.create({
      userId:       referee._id,
      type:         'credit',
      amount:       welcomeBonus,
      description:  `Welcome bonus — you used ${referrer.name}'s referral code!`,
      source:       'referral_bonus',
      referenceId:  referrer._id.toString(),
      balanceAfter: referee.wallet,
    });

    res.json({
      success: true,
      message: `Referral applied! ₹${welcomeBonus} added to your wallet. ${referrer.name} also got ₹${REFERRAL_BONUS}!`,
      walletBalance: referee.wallet,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
