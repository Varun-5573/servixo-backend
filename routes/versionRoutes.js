const express = require('express');
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// APP VERSION CONTROL — Update this whenever you release a new version!
// ─────────────────────────────────────────────────────────────────────────────
const CURRENT_VERSION = {
  version: '1.0.0',           // Match your current app version
  versionCode: 1,             // Match your current app version code
  forceUpdate: false,
  apkUrl: 'https://github.com/Varun-5573/servixo-backend/releases/latest/download/servixo.apk',
  releaseNotes: 'Everything is up to date!',
  releasedAt: new Date().toISOString(),
};

// GET /api/version — Called by app on startup to check for updates
router.get('/', (req, res) => {
  res.json({ success: true, ...CURRENT_VERSION });
});

module.exports = router;
