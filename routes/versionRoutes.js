const express = require('express');
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// APP VERSION CONTROL — Update this whenever you release a new version!
// ─────────────────────────────────────────────────────────────────────────────
const CURRENT_VERSION = {
  version: '1.0.2',           // Fixed version!
  versionCode: 3,             // Trigger the update again!
  forceUpdate: false,
  apkUrl: 'https://files.catbox.moe/wsswpj.apk',
  releaseNotes: '🚀 Stability Update: Crash issues fixed + Digital Wallet & Referral features!',
  releasedAt: new Date().toISOString(),
};

// GET /api/version — Called by app on startup to check for updates
router.get('/', (req, res) => {
  res.json({ success: true, ...CURRENT_VERSION });
});

module.exports = router;
