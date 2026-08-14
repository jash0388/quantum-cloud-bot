/**
 * =========================================================================
 *  TGX QUANTUM LIVE STATS & TELEMETRY DASHBOARD
 * =========================================================================
 */

let ws;

function connectWS() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    document.getElementById('cloudStatus').className = 'cloud-status status-live';
    document.getElementById('statusText').textContent = 'LIVE SYNCED';
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'INIT' || data.type === 'STATE_UPDATE') {
        renderDashboard(data.state);
      }
    } catch (e) {}
  };

  ws.onclose = () => {
    document.getElementById('cloudStatus').className = 'cloud-status';
    document.getElementById('statusText').textContent = 'RECONNECTING...';
    setTimeout(connectWS, 2000);
  };
}

function renderDashboard(state) {
  // 1. Balance & Profit
  document.getElementById('valBalance').textContent = `₹${(state.balance || 483.16).toFixed(2)}`;
  
  const pnl = (state.balance || 483.16) - (state.startBalance || 228.00);
  const pnlEl = document.getElementById('valPnl');
  pnlEl.textContent = `${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(2)}`;
  pnlEl.className = `stat-val ${pnl >= 0 ? 'stat-green' : 'stat-danger'}`;

  const total = (state.wins || 0) + (state.losses || 0);
  const rate = total > 0 ? (((state.wins || 0) / total) * 100).toFixed(0) : 100;
  document.getElementById('valWinRate').textContent = `Win Rate: ${rate}% (${state.wins || 0}W / ${state.losses || 0}L)`;

  // 2. Current Stake
  document.getElementById('valStake').textContent = `₹${state.currentBet || 4}`;

  // 3. Upcoming Round
  document.getElementById('targetPeriod').textContent = state.targetPeriod || 'CALCULATING...';
  document.getElementById('drawTimer').textContent = state.remainingSeconds || '--';

  const sig = document.getElementById('signalVal');
  sig.textContent = state.activeSignal || 'WAITING...';
  sig.style.color = state.activeSignal === 'BIG' ? '#f7c873' : '#73f7ff';

  document.getElementById('signalStake').textContent = `Current Bet: ₹${state.currentBet || 4} on ${state.activeSignal || 'WAITING'}`;

  // 4. Last Completed Bets Feed
  const feed = state.last5Bets && state.last5Bets.length ? state.last5Bets : (state.logs || []);
  const tbody = document.getElementById('last5Body');

  if (feed.length > 0) {
    tbody.innerHTML = feed.slice(0, 8).map(b => `
      <tr>
        <td><strong>${b.period}</strong></td>
        <td><span style="color:${b.prediction === 'BIG' ? '#f7c873' : '#73f7ff'};font-weight:800;">${b.prediction}</span></td>
        <td>${b.number || b.result || '--'}</td>
        <td class="${b.won ? 'win-tag' : 'loss-tag'}">${b.won ? 'WIN 🏆' : 'LOSS 💀'}</td>
        <td class="${b.profit >= 0 ? 'win-tag' : 'loss-tag'}">${b.profit >= 0 ? '+' : ''}₹${Math.abs(b.profit).toFixed(2)}</td>
        <td style="color:#9aa3b8;font-size:9.5px;">${b.time || '--'}</td>
      </tr>
    `).join('');
  }
}

connectWS();
