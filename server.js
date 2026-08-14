/**
 * =========================================================================
 *  TGX QUANTUM 24/7 CLOUD BOT SERVER & TELEMETRY HUB (v6.0)
 *  - Relays live stream directly from your Tablet / Browser
 *  - 100% immune to datacenter IP geoblocks
 * =========================================================================
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── GLOBAL TELEMETRY STATE ─────────────────────────────────
const BOT_STATE = {
  running: true,
  baseBet: 4,
  currentBet: 4,
  balance: 483.16,
  startBalance: 228.00,
  wins: 0,
  losses: 0,
  targetPeriod: null,
  activeSignal: null,
  remainingSeconds: 60,
  deviceStatus: 'ONLINE',
  last5Bets: [],
  logs: [],
  connectedClients: 0
};

function broadcastState() {
  const payload = JSON.stringify({ type: 'STATE_UPDATE', state: BOT_STATE });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// ── API ROUTES ─────────────────────────────────────────────
app.get('/api/state', (req, res) => {
  res.json(BOT_STATE);
});

// Tablet sends real-time telemetry every second
app.post('/api/sync-event', (req, res) => {
  const { balance, bet, signal, period, remSeconds, result, won, profit, history } = req.body;

  if (balance != null && Number.isFinite(balance) && balance > 0) {
    BOT_STATE.balance = balance;
  }
  if (bet != null) BOT_STATE.currentBet = bet;
  if (signal) BOT_STATE.activeSignal = signal;
  if (period) BOT_STATE.targetPeriod = period;
  if (remSeconds != null) BOT_STATE.remainingSeconds = remSeconds;

  if (history && Array.isArray(history)) {
    BOT_STATE.last5Bets = history;
  }

  if (result) {
    BOT_STATE.last5Bets.unshift({
      period: period ? String(period).slice(-3) : '--',
      prediction: signal || '--',
      result: result,
      won: !!won,
      profit: profit || 0,
      time: new Date().toLocaleTimeString()
    });
    if (BOT_STATE.last5Bets.length > 10) BOT_STATE.last5Bets.pop();

    if (won) BOT_STATE.wins++; else BOT_STATE.losses++;
  }

  broadcastState();
  res.json({ success: true });
});

// ── WEBSOCKET HANDLER ──────────────────────────────────────
wss.on('connection', (ws) => {
  BOT_STATE.connectedClients = wss.clients.size;
  ws.send(JSON.stringify({ type: 'INIT', state: BOT_STATE }));

  ws.on('close', () => {
    BOT_STATE.connectedClients = wss.clients.size;
  });
});

server.listen(PORT, () => {
  console.log(`⚡ TGX TELEMETRY SERVER LIVE ON PORT ${PORT}`);
});
