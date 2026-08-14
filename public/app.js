/**
 * =========================================================================
 *  TGX QUANTUM — Web Dashboard Client Application
 *  Handles WebSocket live stream, controls & config updates
 * =========================================================================
 */

let ws;
let isRunning = false;

function connectWS() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    document.getElementById('cloudStatus').className = 'cloud-status status-live';
    document.getElementById('statusText').textContent = '24/7 CLOUD ACTIVE';
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'INIT' || data.type === 'STATE_UPDATE') {
        updateUI(data.state);
      }
    } catch (e) {}
  };

  ws.onclose = () => {
    document.getElementById('cloudStatus').className = 'cloud-status';
    document.getElementById('statusText').textContent = 'RECONNECTING...';
    setTimeout(connectWS, 2000);
  };
}

function updateUI(state) {
  isRunning = state.running;

  // 1. Stats
  document.getElementById('valBalance').textContent = `₹${state.balance.toFixed(2)}`;
  document.getElementById('valStartBal').textContent = `Started: ₹${(state.startBalance || 345.84).toFixed(2)}`;

  const pnl = state.balance - (state.startBalance || 345.84);
  const pnlEl = document.getElementById('valPnl');
  pnlEl.textContent = `${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(2)}`;
  pnlEl.className = `stat-val ${pnl >= 0 ? 'stat-green' : 'stat-danger'}`;

  const totalGames = state.wins + state.losses;
  const rate = totalGames > 0 ? ((state.wins / totalGames) * 100).toFixed(0) : 0;
  document.getElementById('valWinRate').textContent = `Win Rate: ${rate}% (${state.wins}W / ${state.losses}L)`;

  document.getElementById('valStake').textContent = `₹${state.currentBet}`;
  document.getElementById('valBaseBet').textContent = `Base Bet: ₹${state.baseBet}`;

  // 2. Active Round Card
  document.getElementById('targetPeriod').textContent = state.targetPeriod || '--';
  document.getElementById('drawTimer').textContent = state.remainingSeconds || '--';

  const sigEl = document.getElementById('signalVal');
  sigEl.textContent = state.activeSignal || 'WAITING...';
  sigEl.style.color = state.activeSignal === 'BIG' ? '#f7c873' : '#73f7ff';

  if (state.activeOpposites && state.activeOpposites.length) {
    document.getElementById('signalOpp').textContent = `Opposite Hedge: [ ${state.activeOpposites[0]} • ${state.activeOpposites[1]} ]`;
  }

  // 3. CTA Button
  const btn = document.getElementById('btnToggleBot');
  if (state.running) {
    btn.className = 'main-cta-btn btn-stop';
    btn.innerHTML = '<i class="fa-solid fa-stop"></i> STOP CLOUD AUTO-BET';
  } else {
    btn.className = 'main-cta-btn btn-start';
    btn.innerHTML = '<i class="fa-solid fa-play"></i> START CLOUD AUTO-BET';
  }

  // 4. History Feed
  if (state.logs && state.logs.length) {
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = state.logs.slice(0, 10).map(log => `
      <tr>
        <td>${log.period}</td>
        <td>${log.prediction}</td>
        <td>${log.number}</td>
        <td class="${log.won ? 'win-tag' : 'loss-tag'}">${log.won ? 'WIN 🏆' : 'LOSS 💀'}</td>
        <td class="${log.profit >= 0 ? 'win-tag' : 'loss-tag'}">${log.profit >= 0 ? '+' : ''}₹${log.profit.toFixed(2)}</td>
        <td>₹${log.balance.toFixed(2)}</td>
      </tr>
    `).join('');
  }
}

// Button Events
document.getElementById('btnToggleBot').onclick = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: isRunning ? 'STOP' : 'START' }));
  }
};

document.getElementById('btnSaveConfig').onclick = () => {
  const baseBet = document.getElementById('cfgBaseBet').value;
  const maxLevel = document.getElementById('cfgMaxLevel').value;
  const takeProfit = document.getElementById('cfgTakeProfit').value;
  const stopLoss = document.getElementById('cfgStopLoss').value;

  fetch('/api/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseBet, maxLevel, takeProfit, stopLoss })
  });
};

connectWS();
