// ============================================================
// Request Logger Middleware
// File: srv/middleware/request-logger.js
// ============================================================
'use strict';
const cds = require('@sap/cds');
const LOG = cds.log('http');

module.exports = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const s = res.statusCode;
    const u = req.user?.id || 'anon';
    const fn = s >= 500 ? 'error' : s >= 400 ? 'warn' : 'info';
    LOG[fn]?.(`${req.method} ${req.url} → ${s} (${ms}ms) [${u}]`);
  });
  next();
};
