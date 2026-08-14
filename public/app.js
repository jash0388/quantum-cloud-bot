/**
 * =========================================================================
 *  TGX QUANTUM ALL-IN-ONE CLOUD CONTROLLER & AUTO-BET CLICK ENGINE
 * =========================================================================
 */

let ws;
let isRunning = false;
let currentPeriod = null;
let roundStartTime = Date.now();
const COMPLETED_PERIODS = new Set();

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
        handleAutoBetting(data.state);
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

// ── DOM AUTO-BETTING CLICKER ───────────────────────────────
function getGameDocument() {
  try {
    const frame = document.getElementById('gameFrame');
    return frame.contentDocument || frame.contentWindow.document;
  } catch (e) {
    return document;
  }
}

function fireDeepClick(el) {
  if (!el) return;
  el.scrollIntoView?.({ block: 'center' });
  try {
    const touch = new Touch({ identifier: Date.now(), target: el, clientX: 100, clientY: 100 });
    el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [touch], targetTouches: [touch], changedTouches: [touch] }));
    el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [touch] }));
  } catch(e) {}

  ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(evt => {
    el.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: window }));
  });
  try { el.click(); } catch(e) {}
}

async function placeBetOnPage(pred, stake) {
  const doc = getGameDocument();
  if (!doc) return;

  // 1. Click Big / Small
  const allEls = Array.from(doc.querySelectorAll('button, div, span, p'));
  const targetBtn = allEls.find(e => (e.textContent || '').trim().toLowerCase() === pred.toLowerCase());
  if (targetBtn) fireDeepClick(targetBtn);

  await new Promise(r => setTimeout(r, 300));

  // 2. Set Stake Amount
  const inp = doc.querySelector('input[type="number"], input[type="tel"]') || 
              Array.from(doc.querySelectorAll('input')).find(i => /amount|bet|stake/i.test(i.placeholder || i.className));
  if (inp) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(inp, String(stake)); else inp.value = String(stake);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }

  await new Promise(r => setTimeout(r, 300));

  // 3. Click Confirm / Total amount
  const btns = Array.from(doc.querySelectorAll('button, .van-button, div, span'));
  const confirmBtn = btns.filter(b => /total amount/i.test((b.textContent || '').trim()));
  if (confirmBtn.length > 0) {
    const b = confirmBtn[confirmBtn.length - 1];
    fireDeepClick(b);
    if (b.parentElement) fireDeepClick(b.parentElement);
  }
}

async function handleAutoBetting(state) {
  if (!state.running || !state.targetPeriod || !state.activeSignal) return;

  const prd = state.targetPeriod;
  if (currentPeriod !== prd) {
    currentPeriod = prd;
    roundStartTime = Date.now();
  }

  if (COMPLETED_PERIODS.has(prd)) return;

  const timePassed = (Date.now() - roundStartTime) / 1000;
  if (timePassed >= 5 && !COMPLETED_PERIODS.has(prd)) {
    COMPLETED_PERIODS.add(prd);
    console.log(`%c🎯 [AUTO-BET]: Placing ₹${state.currentBet} on ${state.activeSignal} for Period ${prd.slice(-3)}`, 'color:#00e676;font-weight:bold;font-size:14px;');
    await placeBetOnPage(state.activeSignal, state.currentBet || 4);
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
