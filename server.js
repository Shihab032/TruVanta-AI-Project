/**
 * TruVanta Backend Server (Node.js / Express)
 * ============================================
 * This is a lightweight backend for TruVanta.
 * Currently the app runs fully in the browser (localStorage DB).
 * This server is ready to extend with real DB, auth, payments, etc.
 *
 * INSTALL:
 *   npm install express cors
 *
 * RUN:
 *   node server.js
 *   → Serves the frontend at http://localhost:3000
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── Serve frontend files ──────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..')));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'TruVanta', time: new Date().toISOString() });
});

// ── Providers API (reads from in-memory PROVIDERS_DB in browser) ──────────────
// Add real DB routes here when you're ready to move off localStorage.
// Example:
//   app.get('/api/providers', async (req, res) => { ... })
//   app.post('/api/bookings', async (req, res) => { ... })
//   app.post('/api/payments', async (req, res) => { ... })

app.listen(PORT, () => {
  console.log(`\n✅  TruVanta server running → http://localhost:${PORT}\n`);
});
