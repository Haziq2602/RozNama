const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const ledgerRoutes = require('./routes/ledger');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS & body parsers
app.use(cors());
// Pre-parsed body guard for Vercel serverless execution
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    return next();
  }
  next();
});
app.use(express.json());
// Native non-multer raw audio parser (streams audio directly to memory)
app.use(express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '15mb' }));

// API Routes (mounted on both /api/* and direct /* to support local and Vercel serverless rewrites)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/ledger', ledgerRoutes);
app.use('/ledger', ledgerRoutes);

app.use('/api/ai', aiRoutes);
app.use('/ai', aiRoutes);

const { isSupabaseConfigured } = require('./db');
let config = { DEPLOYMENT_MODE: 'LOCAL' };
try {
  config = require('../roznama.config');
} catch (e) {}

// Health Check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    app: 'RozNama Server',
    deploymentMode: config.DEPLOYMENT_MODE,
    database: isSupabaseConfigured ? 'Supabase Cloud (PostgreSQL)' : 'Local SQLite (roznama.db)',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static files if hosted together
app.use(express.static(path.join(__dirname, '..')));

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 RozNama Server running on http://localhost:${PORT} [Mode: ${config.DEPLOYMENT_MODE}]`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n⚠️ Port ${PORT} is already in use by another running server instance.`);
      console.error(`💡 Tip: Close the other terminal window running RozNama, or kill the process on port ${PORT}.\n`);
      process.exit(1);
    } else {
      throw err;
    }
  });
}

module.exports = app;
