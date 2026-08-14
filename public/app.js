/**
 * =========================================================================
 *  TGX QUANTUM ALL-IN-ONE CLOUD CONTROLLER
 * =========================================================================
 */

let ws;
let isRunning = false;

function connectWS() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    document.getElementById('hudStatus').textContent = isRunning ? 'AUTO-BETTING ACTIVE' : 'READY';
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
    document.getElementById('hudStatus').textContent = 'RECONNECTING...';
    setTimeout(connectWS, 2000);
  };
}

function updateUI(state) {
  isRunning = state.running;

  document.getElementById('hudPeriod').textContent = state.targetPeriod ? state.targetPeriod.slice(-3) : '--';
  document.getElementById('hudTimer').textContent = (state.remainingSeconds || '--') + 's';
  document.getElementById('hudBalance').textContent = `₹${(state.balance || 345.84).toFixed(2)}`;

  const sig = document.getElementById('hudSignal');
  sig.textContent = state.activeSignal || 'WAITING...';
  sig.style.color = state.activeSignal === 'BIG' ? '#f7c873' : '#73f7ff';

  document.getElementById('hudStake').textContent = `Stake: ₹${state.currentBet || 4} (Martingale)`;

  const btn = document.getElementById('btnToggle');
  const stat = document.getElementById('hudStatus');

  if (state.running) {
    btn.className = 'hud-btn hud-btn-stop';
    btn.innerHTML = '<i class="fa-solid fa-stop"></i> STOP CLOUD AUTO-BET';
    stat.textContent = 'AUTO-BETTING 24/7';
    stat.style.color = '#00e676';
  } else {
    btn.className = 'hud-btn hud-btn-start';
    btn.innerHTML = '<i class="fa-solid fa-play"></i> START CLOUD AUTO-BET';
    stat.textContent = 'PAUSED';
    stat.style.color = '#f7c873';
  }
}

document.getElementById('btnToggle').onclick = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: isRunning ? 'STOP' : 'START' }));
  }
};

function toggleHud() {
  const hud = document.getElementById('quantumHud');
  const sc = document.getElementById('hudShortcut');
  if (hud.style.display === 'none') {
    hud.style.display = 'block';
    sc.style.display = 'none';
  } else {
    hud.style.display = 'none';
    sc.style.display = 'flex';
  }
}

connectWS();
