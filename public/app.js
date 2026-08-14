/**
 * =========================================================================
 *  TGX QUANTUM — CONTINUOUS 24/7 TRACKER (PERSISTENT & LOCKED)
 *  - Locks Base Bet & Balance in LocalStorage
 *  - Catches up and calculates every draw even after closing the app/offline
 * =========================================================================
 */

(function () {
  'use strict';

  // 1. Persistent Locked State
  let BASE_BET = parseInt(localStorage.getItem('TGX_LOCK_BASE_BET')) || 4;
  let START_BALANCE = parseFloat(localStorage.getItem('TGX_LOCK_START_BAL')) || 228.00;
  let CURRENT_BALANCE = parseFloat(localStorage.getItem('TGX_LOCK_CURR_BAL')) || 483.16;
  let currentStake = parseInt(localStorage.getItem('TGX_LOCK_STAKE')) || BASE_BET;
  let wins = parseInt(localStorage.getItem('TGX_LOCK_WINS')) || 0;
  let losses = parseInt(localStorage.getItem('TGX_LOCK_LOSSES')) || 0;

  const API_URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json';
  let PROCESSED_ISSUES = new Set(JSON.parse(localStorage.getItem('TGX_PROCESSED_SET') || '[]'));
  let HISTORY_FEED = JSON.parse(localStorage.getItem('TGX_SAVED_HISTORY') || '[]');

  // Initialize Input Values
  document.getElementById('inpBaseBet').value = BASE_BET;
  document.getElementById('inpStartBal').value = START_BALANCE;

  document.getElementById('btnSaveConfig').onclick = () => {
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
    savePersistentState();
    updateUI();
  };

  function savePersistentState() {
    localStorage.setItem('TGX_LOCK_BASE_BET', BASE_BET);
    localStorage.setItem('TGX_LOCK_START_BAL', START_BALANCE);
    localStorage.setItem('TGX_LOCK_CURR_BAL', CURRENT_BALANCE);
    localStorage.setItem('TGX_LOCK_STAKE', currentStake);
    localStorage.setItem('TGX_LOCK_WINS', wins);
    localStorage.setItem('TGX_LOCK_LOSSES', losses);
    localStorage.setItem('TGX_SAVED_HISTORY', JSON.stringify(HISTORY_FEED.slice(0, 30)));
    localStorage.setItem('TGX_PROCESSED_SET', JSON.stringify(Array.from(PROCESSED_ISSUES).slice(-100)));
  }

  function fetchDrawHistory() {
    return fetch(API_URL + '?ts=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .catch(() => null);
  }

  async function continuousTrackerCycle() {
    try {
      const json = await fetchDrawHistory();
      const list = json?.data?.list;
      if (!list || !list.length) return;

      const latest = list[0];
      const latestId = latest.issueNumber.toString();
      const nextPeriodId = (BigInt(latestId) + 1n).toString();
      const remSeconds = 60 - (new Date().getSeconds() % 60);

      // Continuous Catch-Up: Process all unprocessed historical rounds in order (oldest to newest)
      const unprocessed = [];
      for (const item of list) {
        if (!PROCESSED_ISSUES.has(item.issueNumber.toString())) {
          unprocessed.unshift(item); // Add to front so we process in chronological order
        }
      }

      for (const item of unprocessed) {
        const id = item.issueNumber.toString();
        const num = parseInt(item.number);
        const actualSize = num >= 5 ? 'BIG' : 'SMALL';

        // Calculate Quantum prediction for that round
        const idx = list.findIndex(x => x.issueNumber.toString() === id);
        const prev5 = list.slice(idx + 1, idx + 6).map(x => parseInt(x.number) >= 5 ? 'BIG' : 'SMALL');
        const pred = prev5.filter(x => x === 'BIG').length > 2 ? 'BIG' : 'SMALL';

        const won = (pred === actualSize);
        let roundPnl = 0;

        if (won) {
          roundPnl = currentStake * 0.96;
          wins++;
          CURRENT_BALANCE += roundPnl;
          currentStake = BASE_BET; // Reset on win
        } else {
          roundPnl = -currentStake;
          losses++;
          CURRENT_BALANCE += roundPnl;
          currentStake = currentStake * 2; // Martingale 2x
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
      }

      if (unprocessed.length > 0) {
        savePersistentState();
      }

      // Next Upcoming Prediction
      const last5 = list.slice(0, 5).map(x => parseInt(x.number) >= 5 ? 'BIG' : 'SMALL');
      const nextPred = last5.filter(x => x === 'BIG').length > 2 ? 'BIG' : 'SMALL';

      // Update UI
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

  setInterval(continuousTrackerCycle, 1000);
  continuousTrackerCycle();
})();
