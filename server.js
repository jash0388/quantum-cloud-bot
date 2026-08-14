/**
 * =========================================================================
 *  TGX QUANTUM 24/7 CLOUD BOT SERVER & TELEMETRY HUB
 *  - Serves Live Web Dashboard accessible from anywhere
 *  - Receives live round events, bets & balance from your Realme Tablet
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
  activeOpposites: [],
  remainingSeconds: 60,
  deviceStatus: 'ONLINE (TABLET ACTIVE)',
  last5Bets: [],
  logs: [],
  connectedClients: 0
};

const API_URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json';
let lastProcessedIssue = null;
let lastPredicted = null;

function broadcastState() {
  const payload = JSON.stringify({ type: 'STATE_UPDATE', state: BOT_STATE });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// ── API ROUTES FOR TELEMETRY ───────────────────────────────
app.get('/api/state', (req, res) => {
  res.json(BOT_STATE);
});

// Tablet sync endpoint: Tablet pushes its live balance & bets here
app.post('/api/sync-event', (req, res) => {
  const { balance, bet, signal, period, result, won, profit } = req.body;

  if (balance != null && Number.isFinite(balance) && balance > 0) {
    BOT_STATE.balance = balance;
  }
  if (bet != null) BOT_STATE.currentBet = bet;
  if (signal) BOT_STATE.activeSignal = signal;
  if (period) BOT_STATE.targetPeriod = period;

  if (result) {
    BOT_STATE.last5Bets.unshift({
      period: period ? period.slice(-3) : '--',
      prediction: signal || '--',
      result: result,
      won: !!won,
      profit: profit || 0,
      time: new Date().toLocaleTimeString()
    });
    if (BOT_STATE.last5Bets.length > 10) BOT_STATE.last5Bets.pop();

    if (won) BOT_STATE.wins++; else BOT_STATE.losses++;
  }

  BOT_STATE.deviceStatus = 'ONLINE (TABLET ACTIVE)';
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

// ── CORE QUANTUM AI STREAM ENGINE ──────────────────────────
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

    // 1. Process Result of Previous Period
    if (lastProcessedIssue && lastProcessedIssue !== latestId) {
      if (lastPredicted) {
        const actualNum = parseInt(latest.number);
        const actualSize = actualNum >= 5 ? 'BIG' : 'SMALL';
        const won = (lastPredicted === actualSize);
        let roundProfit = 0;

        if (won) {
          roundProfit = BOT_STATE.currentBet * 0.96;
          BOT_STATE.wins++;
          BOT_STATE.currentBet = BOT_STATE.baseBet;
        } else {
          roundProfit = -BOT_STATE.currentBet;
          BOT_STATE.losses++;
          BOT_STATE.currentBet = BOT_STATE.currentBet * 2;
        }

        BOT_STATE.balance += roundProfit;

        const record = {
          period: latestId.slice(-3),
          prediction: lastPredicted,
          number: `${actualNum} (${actualSize})`,
          won,
          profit: roundProfit,
          balance: BOT_STATE.balance,
          time: new Date().toLocaleTimeString()
        };

        BOT_STATE.last5Bets.unshift(record);
        if (BOT_STATE.last5Bets.length > 10) BOT_STATE.last5Bets.pop();
        BOT_STATE.logs.unshift(record);
        if (BOT_STATE.logs.length > 50) BOT_STATE.logs.pop();
      }
      lastPredicted = null;
    }

    // 2. Compute Upcoming Quantum Signal
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
      lastPredicted = nextPred;
      lastProcessedIssue = latestId;
    }

    BOT_STATE.remainingSeconds = 60 - (new Date().getSeconds() % 60);
    broadcastState();
  } catch (err) {}
}

setInterval(runQuantumTick, 1000);

server.listen(PORT, () => {
  console.log(`⚡ TGX TELEMETRY SERVER RUNNING ON PORT ${PORT}`);
});
