/**
 * Vercel serverless entry — reuses the Express app from index.js
 * without starting cron/listen (CLI server mode only when run as main).
 */
'use strict';

// Load env if present (no-op on Vercel when vars are set in project settings)
try {
  require('dotenv').config();
} catch {
  // optional
}

const { app } = require('../index.js');

module.exports = app;
