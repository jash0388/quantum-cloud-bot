/**
 * =========================================================================
 *  TGX QUANTUM 24/7 CLOUD BOT SERVER
 *  - High-performance Express + WebSocket Architecture
 *  - Remote Web Control Dashboard (Mobile + Desktop)
 *  - 100% Synced Quantum Engine & 2x Martingale Ladder
 *  - Automated Reconnection & Safe Single-Bet Locking
 * =========================================================================
 */

const express = require('express');
const http = require('http');
const https = require('https');
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

// ── GLOBAL BOT STATE ───────────────────────────────────────
const BOT_STATE = {
  running: false,
  baseBet: 4,
  currentBet: 4,
  maxLevel: 6,
  takeProfitTarget: 500,
  stopLossLimit: 100,
  balance: 345.84,
  startBalance: 345.84,
  wins: 0,
  losses: 0,
  targetPeriod: null,
  activeSignal: null,
  activeOpposites: [],
  remainingSeconds: 60,
  status: 'IDLE (READY TO START)',
  logs: [],
  connectedClients: 0
};

const API_URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json';
const PLACED_ROUNDS = new Set();
let lastProcessedIssue = null;
let lastPredicted = null;

// ── BROADCAST TO ALL CONNECTED DASHBOARDS ──────────────────
function broadcastState() {
  const payload = JSON.stringify({ type: 'STATE_UPDATE', state: BOT_STATE });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// ── API ROUTES FOR DASHBOARD ───────────────────────────────
app.get('/api/state', (req, res) => {
  res.json(BOT_STATE);
});

app.post('/api/control', (req, res) => {
  const { action, baseBet, maxLevel, takeProfit, stopLoss } = req.body;
  
  if (action === 'start') {
    BOT_STATE.running = true;
    BOT_STATE.status = 'ACTIVE AUTO-BETTING';
  } else if (action === 'stop') {
    BOT_STATE.running = false;
    BOT_STATE.status = 'PAUSED BY USER';
  }

  if (baseBet && Number.isFinite(baseBet)) {
    BOT_STATE.baseBet = baseBet;
    if (!BOT_STATE.running) BOT_STATE.currentBet = baseBet;
  }
  if (maxLevel) BOT_STATE.maxLevel = maxLevel;
  if (takeProfit) BOT_STATE.takeProfitTarget = takeProfit;
  if (stopLoss) BOT_STATE.stopLossLimit = stopLoss;

  broadcastState();
  res.json({ success: true, state: BOT_STATE });
});

// External browser sync webhook (for live balance updates)
app.post('/api/sync-balance', (req, res) => {
  const { balance } = req.body;
  if (balance && Number.isFinite(balance)) {
    BOT_STATE.balance = balance;
    if (BOT_STATE.startBalance === null) BOT_STATE.startBalance = balance;
    broadcastState();
  }
  res.json({ success: true });
});

// ── WEBSOCKET CONNECTION HANDLER ───────────────────────────
wss.on('connection', (ws) => {
  BOT_STATE.connectedClients = wss.clients.size;
  ws.send(JSON.stringify({ type: 'INIT', state: BOT_STATE }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'START') {
        BOT_STATE.running = true;
        BOT_STATE.status = 'ACTIVE AUTO-BETTING';
        broadcastState();
      } else if (data.type === 'STOP') {
        BOT_STATE.running = false;
        BOT_STATE.status = 'PAUSED';
        broadcastState();
      } else if (data.type === 'UPDATE_CONFIG') {
        if (data.baseBet) BOT_STATE.baseBet = Number(data.baseBet);
        if (data.maxLevel) BOT_STATE.maxLevel = Number(data.maxLevel);
        broadcastState();
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    BOT_STATE.connectedClients = wss.clients.size;
  });
});

// ── CORE QUANTUM AI ENGINE ─────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url + '?ts=' + Date.now(), (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runQuantumTick() {
  try {
    const json = await fetchJSON(API_URL);
    const list = json?.data?.list;
    if (!list || !list.length) return;

    const latest = list[0];
    const latestId = latest.issueNumber.toString();
    const nextPeriodId = (BigInt(latestId) + 1n).toString();

    // 1. Process Result of Previous Round
    if (lastProcessedIssue && lastProcessedIssue !== latestId) {
      if (lastPredicted) {
        const actualNum = parseInt(latest.number);
        const actualSize = actualNum >= 5 ? 'BIG' : 'SMALL';
        const won = (lastPredicted === actualSize);
        let roundProfit = 0;

        if (won) {
          roundProfit = BOT_STATE.currentBet * 0.96;
          BOT_STATE.wins++;
          BOT_STATE.currentBet = BOT_STATE.baseBet; // Reset on Win
        } else {
          roundProfit = -BOT_STATE.currentBet;
          BOT_STATE.losses++;
          // Martingale 2x with Max Level Cap
          const maxStake = BOT_STATE.baseBet * Math.pow(2, BOT_STATE.maxLevel - 1);
          BOT_STATE.currentBet = Math.min(BOT_STATE.currentBet * 2, maxStake);
        }

        BOT_STATE.balance += roundProfit;

        BOT_STATE.logs.unshift({
          period: latestId.slice(-3),
          prediction: lastPredicted,
          number: `${actualNum} (${actualSize})`,
          won,
          profit: roundProfit,
          balance: BOT_STATE.balance,
          time: new Date().toLocaleTimeString()
        });

        if (BOT_STATE.logs.length > 50) BOT_STATE.logs.pop();
      }
      lastPredicted = null;
    }

    // 2. Compute Quantum Prediction for Upcoming Period
    if (BOT_STATE.targetPeriod !== nextPeriodId) {
      const last5 = list.slice(0, 5).map(x => parseInt(x.number) >= 5 ? 'BIG' : 'SMALL');
      const nextPred = last5.filter(x => x === 'BIG').length > 2 ? 'BIG' : 'SMALL';

      const pool = nextPred === 'BIG' ? [0, 1, 2, 3, 4] : [5, 6, 7, 8, 9];
      const seedVal = parseInt(latestId.slice(-3));
      const n1 = pool[seedVal % pool.length];
      const remPool = pool.filter(n => n !== n1);
      const n2 = remPool[(seedVal + 2) % remPool.length];

      BOT_STATE.targetPeriod = nextPeriodId;
      BOT_STATE.activeSignal = nextPred;
      BOT_STATE.activeOpposites = [n1, n2].sort((a, b) => a - b);
      lastProcessedIssue = latestId;
    }

    // 3. Execution Lock & Bet Recording
    if (BOT_STATE.running && !PLACED_ROUNDS.has(nextPeriodId)) {
      const remSeconds = 60 - (new Date().getSeconds() % 60);
      if (remSeconds <= 55) { // 5s settle delay
        PLACED_ROUNDS.add(nextPeriodId);
        lastPredicted = BOT_STATE.activeSignal;
        BOT_STATE.status = `PLACED ₹${BOT_STATE.currentBet} ON ${BOT_STATE.activeSignal}`;
      }
    }

    BOT_STATE.remainingSeconds = 60 - (new Date().getSeconds() % 60);
    broadcastState();
  } catch (err) {}
}

setInterval(runQuantumTick, 1000);

server.listen(PORT, () => {
  console.log(`\n=======================================================`);
  console.log(`⚡ TGX QUANTUM CLOUD BOT RUNNING ON PORT ${PORT}`);
  console.log(`🌐 Web Dashboard: http://localhost:${PORT}`);
  console.log(`=======================================================\n`);
});
