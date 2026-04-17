const express = require('express');
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// APP VERSION CONTROL — Update this whenever you release a new version!
// ─────────────────────────────────────────────────────────────────────────────
const CURRENT_VERSION = {
  version: '1.0.3',           // Ultimate Fixed version!
  versionCode: 4,             // Trigger the update!
  forceUpdate: false,
  apkUrl: 'https://files.catbox.moe/9nfkcz.apk',
  releaseNotes: '🏆 ULTIMATE STABILITY: All crash issues fixed! Enjoy Digital Wallet, Refer & Earn, and more.',
  releasedAt: new Date().toISOString(),
};

// GET /api/version — Called by app on startup to check for updates
router.get('/', (req, res) => {
  res.json({ success: true, ...CURRENT_VERSION });
});

module.exports = router;
