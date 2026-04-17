const express = require('express');
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// APP VERSION CONTROL — Update this whenever you release a new version!
// ─────────────────────────────────────────────────────────────────────────────
const CURRENT_VERSION = {
  version: '1.0.4',
  versionCode: 5,
  forceUpdate: false,
  apkUrl: 'https://files.catbox.moe/f50925.apk',
  releaseNotes: '💰 Wallet + Refer & Earn is here! Click Download to install the new update.',
  releasedAt: new Date().toISOString(),
};

// GET /api/version — Called by app on startup to check for updates
router.get('/', (req, res) => {
  res.json({ success: true, ...CURRENT_VERSION });
});

module.exports = router;
