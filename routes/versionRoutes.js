const express = require('express');
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// APP VERSION CONTROL — Update this whenever you release a new version!
// ─────────────────────────────────────────────────────────────────────────────
const CURRENT_VERSION = {
  version: '1.0.1',           // Bump this number for each new release
  versionCode: 2,             // Increment this integer for each new release
  forceUpdate: false,         // Set to true to force ALL users to update
  apkUrl: 'https://github.com/Varun-5573/servixo-backend/releases/latest/download/servixo.apk',
  releaseNotes: 'Bug fixes and performance improvements.',
  releasedAt: new Date().toISOString(),
};

// GET /api/version — Called by app on startup to check for updates
router.get('/', (req, res) => {
  res.json({ success: true, ...CURRENT_VERSION });
});

module.exports = router;
