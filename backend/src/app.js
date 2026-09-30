require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const walletRoutes      = require('./routes/walletRoutes');
const categoryRoutes    = require('./routes/categoryRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/wallets',      walletRoutes);
app.use('/api/categories',   categoryRoutes);
app.use('/api/transactions', transactionRoutes);

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Rinci API berjalan dengan baik 🚀', timestamp: new Date() });
});

// ── 404 handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} tidak ditemukan` });
});

// ── Error handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Rinci Backend berjalan di http://localhost:${PORT}`);
  console.log(`📋 API Endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/wallets`);
  console.log(`   GET  /api/categories`);
  console.log(`   GET  /api/transactions`);
  console.log(`   GET  /api/transactions/summary\n`);
});

module.exports = app;
