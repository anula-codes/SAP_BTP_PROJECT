// ============================================================
// Custom CAP Server Bootstrap
// File: srv/server.js
// Loaded by cds-serve via "main" field or default convention
// ============================================================
'use strict';

const cds = require('@sap/cds');
const cors = require('cors');

// ─── Bootstrap ───────────────────────────────────────────────
cds.on('bootstrap', (app) => {

  // CORS for local Fiori / Postman access
  app.use(cors({
    origin: ['http://localhost:4004', 'http://localhost:5000', /\.hana\.ondemand\.com$/],
    credentials: true
  }));

  // Request logger
  try {
    app.use(require('./middleware/request-logger'));
  } catch (_) { /* optional */ }

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'UP',
      service: 'novabuild-p2p-analytics',
      version: require('../package.json').version,
      timestamp: new Date().toISOString(),
      environment: process.env.CDS_ENV || 'development'
    });
  });

  // API info endpoint
  app.get('/info', (_req, res) => {
    res.json({
      name: 'NovaBuild P2P Analytics Service',
      description: 'Procure-to-Pay Analytics on SAP CAP',
      service: '/p2p/',
      metadata: '/p2p/$metadata',
      dashboard: '/app/webapp/dashboard.html',
      fiori: '/$fiori-preview',
      swaggerUI: false,
      version: require('../package.json').version
    });
  });
});

// ─── Graceful shutdown ───────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('SIGTERM received — shutting down gracefully');
  await cds.disconnect();
  process.exit(0);
});

module.exports = cds.server;
