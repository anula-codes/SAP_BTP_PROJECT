// ============================================================
// Dev Auth Middleware — maps Basic auth to CDS mock users
// Production: XSUAA passport strategy takes over entirely
// File: srv/middleware/auth.js
// ============================================================
'use strict';
const cds = require('@sap/cds');
const LOG = cds.log('auth-middleware');

module.exports = (req, _res, next) => {
  if (cds.env.profiles?.includes('production')) return next();
  const header = req.headers.authorization;
  if (header?.startsWith('Basic ')) {
    try {
      const username = Buffer.from(header.slice(6), 'base64').toString().split(':')[0];
      const mockUsers = cds.env.requires?.auth?.users || {};
      if (mockUsers[username]) {
        req.user = { id: username, roles: mockUsers[username].roles || [],
          is: r => mockUsers[username].roles?.includes(r) };
        LOG.debug(`Mock auth: ${username} roles=${req.user.roles}`);
      }
    } catch (e) { LOG.warn('Auth parse error:', e.message); }
  }
  next();
};
