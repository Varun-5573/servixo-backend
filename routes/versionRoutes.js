const express = require('express');
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// APP VERSION CONTROL — Update this whenever you release a new version!
// ─────────────────────────────────────────────────────────────────────────────
const CURRENT_VERSION = {
  version: '1.0.1',           // New version!
  versionCode: 2,             // Trigger the update!
  forceUpdate: false,
  apkUrl: 'https://files.catbox.moe/q7okco.apk',
  releaseNotes: '💰 Digital Wallet is here! Now you can see your balance and refer friends to earn.',
  releasedAt: new Date().toISOString(),
};

// GET /api/version — Called by app on startup to check for updates
router.get('/', (req, res) => {
  res.json({ success: true, ...CURRENT_VERSION });
});

module.exports = router;
