/**
 * =========================================================================
 *  TGX QUANTUM — CLOUD-WIDE SYNCHRONIZED TRACKER (ALL DEVICES)
 *  - Global Cloud Sync across iPhone, Android, Tablet & PC
 *  - Continuous Catch-Up & Zero Missed Bets
 * =========================================================================
 */

(function () {
  'use strict';

  let BASE_BET = 4;
  let START_BALANCE = 228.00;
  let CURRENT_BALANCE = 483.16;
  let currentStake = 4;
  let wins = 0;
  let losses = 0;

  const API_URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json';
  const CLOUD_SETTINGS_API = '/api/settings';

  let PROCESSED_ISSUES = new Set();
  let HISTORY_FEED = [];
  let isInitialized = false;

  // 1. Fetch Cloud-Wide State on Load
  async function loadCloudState() {
    try {
      const res = await fetch(CLOUD_SETTINGS_API);
      const state = await res.json();
      if (state) {
        BASE_BET = state.baseBet || 4;
        START_BALANCE = state.startBalance || 228.00;
        CURRENT_BALANCE = state.currentBalance || 483.16;
        currentStake = state.currentStake || BASE_BET;
        wins = state.wins || 0;
        losses = state.losses || 0;
        if (state.history && state.history.length) HISTORY_FEED = state.history;
        if (state.processedSet && state.processedSet.length) {
          PROCESSED_ISSUES = new Set(state.processedSet);
        }
      }
    } catch (e) {}

    document.getElementById('inpBaseBet').value = BASE_BET;
    document.getElementById('inpStartBal').value = START_BALANCE;
    isInitialized = true;
    updateUI();
  }

  // 2. Lock & Save Button -> Pushes to Cloud for ALL Devices
  document.getElementById('btnSaveConfig').onclick = async () => {
    const b = parseInt(document.getElementById('inpBaseBet').value) || 4;
    const s = parseFloat(document.getElementById('inpStartBal').value) || 228.00;
    
    BASE_BET = b;
    START_BALANCE = s;
    CURRENT_BALANCE = s;
    currentStake = b;
    wins = 0;
    losses = 0;
    HISTORY_FEED = [];
    PROCESSED_ISSUES.clear();

    const saveBtn = document.getElementById('btnSaveConfig');
    saveBtn.textContent = 'SAVING...';

    await pushCloudState();
    saveBtn.textContent = 'LOCKED & SAVED ✓';
    setTimeout(() => { saveBtn.textContent = 'LOCK & SAVE'; }, 2000);
    updateUI();
  };

  async function pushCloudState() {
    try {
      await fetch(CLOUD_SETTINGS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseBet: BASE_BET,
          startBalance: START_BALANCE,
          currentBalance: CURRENT_BALANCE,
          currentStake: currentStake,
          wins: wins,
          losses: losses,
          history: HISTORY_FEED.slice(0, 30),
          processedSet: Array.from(PROCESSED_ISSUES).slice(-100)
        })
      });
    } catch (e) {}
  }

  function fetchDrawHistory() {
    return fetch(API_URL + '?ts=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .catch(() => null);
  }

  async function continuousTrackerCycle() {
    if (!isInitialized) return;

    try {
      const json = await fetchDrawHistory();
      const list = json?.data?.list;
      if (!list || !list.length) return;

      const latest = list[0];
      const latestId = latest.issueNumber.toString();
      const nextPeriodId = (BigInt(latestId) + 1n).toString();
      const remSeconds = 60 - (new Date().getSeconds() % 60);

      // Continuous Catch-Up (process oldest to newest)
      const unprocessed = [];
      for (const item of list) {
        if (!PROCESSED_ISSUES.has(item.issueNumber.toString())) {
          unprocessed.unshift(item);
        }
      }

      let stateChanged = false;
      for (const item of unprocessed) {
        const id = item.issueNumber.toString();
        const num = parseInt(item.number);
        const actualSize = num >= 5 ? 'BIG' : 'SMALL';

        const idx = list.findIndex(x => x.issueNumber.toString() === id);
        const prev5 = list.slice(idx + 1, idx + 6).map(x => parseInt(x.number) >= 5 ? 'BIG' : 'SMALL');
        const pred = prev5.filter(x => x === 'BIG').length > 2 ? 'BIG' : 'SMALL';

        const won = (pred === actualSize);
        let roundPnl = 0;

        if (won) {
          roundPnl = currentStake * 0.96;
          wins++;
          CURRENT_BALANCE += roundPnl;
          currentStake = BASE_BET;
        } else {
          roundPnl = -currentStake;
          losses++;
          CURRENT_BALANCE += roundPnl;
          currentStake = currentStake * 2;
        }

        HISTORY_FEED.unshift({
          period: id.slice(-3),
          prediction: pred,
          number: `${num} (${actualSize})`,
          won: won,
          profit: roundPnl,
          time: new Date().toLocaleTimeString()
        });

        PROCESSED_ISSUES.add(id);
        stateChanged = true;
      }

      if (stateChanged) {
        pushCloudState();
      }

      // Next Upcoming Prediction
      const last5 = list.slice(0, 5).map(x => parseInt(x.number) >= 5 ? 'BIG' : 'SMALL');
      const nextPred = last5.filter(x => x === 'BIG').length > 2 ? 'BIG' : 'SMALL';

      document.getElementById('targetPeriod').textContent = nextPeriodId;
      document.getElementById('drawTimer').textContent = remSeconds;

      const sigEl = document.getElementById('signalVal');
      sigEl.textContent = nextPred;
      sigEl.style.color = nextPred === 'BIG' ? '#f7c873' : '#73f7ff';

      document.getElementById('signalStake').textContent = `Current Bet: ₹${currentStake} on ${nextPred}`;
      document.getElementById('valStake').textContent = `₹${currentStake}`;
      document.getElementById('valBaseLbl').textContent = `Base: ₹${BASE_BET}`;

      updateUI();
    } catch (e) {}
  }

  function updateUI() {
    document.getElementById('valBalance').textContent = `₹${CURRENT_BALANCE.toFixed(2)}`;
    document.getElementById('valStartBal').textContent = `Started: ₹${START_BALANCE.toFixed(2)}`;

    const pnl = CURRENT_BALANCE - START_BALANCE;
    const pnlEl = document.getElementById('valPnl');
    pnlEl.textContent = `${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(2)}`;
    pnlEl.className = `stat-val ${pnl >= 0 ? 'stat-green' : 'stat-danger'}`;

    const total = wins + losses;
    const rate = total > 0 ? ((wins / total) * 100).toFixed(0) : 100;
    document.getElementById('valWinRate').textContent = `Win Rate: ${rate}% (${wins}W / ${losses}L)`;

    const tbody = document.getElementById('last5Body');
    if (HISTORY_FEED.length > 0) {
      tbody.innerHTML = HISTORY_FEED.slice(0, 10).map(b => `
        <tr>
          <td><strong>${b.period}</strong></td>
          <td><span style="color:${b.prediction === 'BIG' ? '#f7c873' : '#73f7ff'};font-weight:800;">${b.prediction}</span></td>
          <td>${b.number}</td>
          <td class="${b.won ? 'win-tag' : 'loss-tag'}">${b.won ? 'WIN 🏆' : 'LOSS 💀'}</td>
          <td class="${b.profit >= 0 ? 'win-tag' : 'loss-tag'}">${b.profit >= 0 ? '+' : ''}₹${Math.abs(b.profit).toFixed(2)}</td>
          <td style="color:#9aa3b8;font-size:9.5px;">${b.time}</td>
        </tr>
      `).join('');
    }
  }

  loadCloudState().then(() => {
    setInterval(continuousTrackerCycle, 1000);
    continuousTrackerCycle();
  });
})();
