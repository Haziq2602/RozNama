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
app.use(express.json());
// Native non-multer raw audio parser (streams audio directly to memory)
app.use(express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '15mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/ai', aiRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'RozNama Server', timestamp: new Date().toISOString() });
});

// Serve frontend static files if hosted together
app.use(express.static(path.join(__dirname, '..')));

app.listen(PORT, () => {
  console.log(`🚀 RozNama Server running on http://localhost:${PORT}`);
});
