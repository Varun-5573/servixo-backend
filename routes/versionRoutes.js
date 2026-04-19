const express = require('express');
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// APP VERSION CONTROL — Update this whenever you release a new version!
// ─────────────────────────────────────────────────────────────────────────────
const CURRENT_VERSION = {
  version: '1.0.5',
  versionCode: 6,
  forceUpdate: false,
  apkUrl: 'https://files.catbox.moe/o1j1iy.apk',
  releaseNotes: '🤖 Instant Support Chat added! And minor bug fixes. Click Download to install!',
  releasedAt: new Date().toISOString(),
};

// GET /api/version — Called by app on startup to check for updates
router.get('/', (req, res) => {
  res.json({ success: true, ...CURRENT_VERSION });
});

module.exports = router;
