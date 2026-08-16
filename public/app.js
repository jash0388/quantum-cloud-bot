/**
 * WinGo Dragon AI — Cloud Live Telemetry & Inverter Control Client
 */

(function () {
  'use strict';

  const CLOUD_API = '/api/settings';
  let isBotRunning = true;
  let isReverseMode = false;

  async function sendRemoteCommand(commandType, payload = {}) {
    const feedback = document.getElementById('cmdFeedback');
    if (feedback) { feedback.textContent = 'SENDING...'; feedback.style.color = '#f7c873'; }

    try {
      const res = await fetch(CLOUD_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isRemoteControl: true,
          commandType: commandType,
          payload: payload
        })
      });
      const data = await res.json();
      if (data && data.success) {
        if (feedback) {
          feedback.textContent = 'SENT TO TABLET ✓';
          feedback.style.color = '#00e676';
          setTimeout(() => { feedback.textContent = 'READY'; feedback.style.color = '#00e676'; }, 3000);
        }
      }
    } catch(e) {
      if (feedback) { feedback.textContent = 'ERROR SENDING'; feedback.style.color = '#ff4757'; }
    }
  }

  let currentStrategyMode = 'TGX_STATIC';

  // Hook up Remote Control Buttons
  document.getElementById('btnRemoteMode').onclick = () => {
    if (currentStrategyMode === 'TGX_STATIC') currentStrategyMode = 'BS_ALTERNATOR';
    else if (currentStrategyMode === 'BS_ALTERNATOR') currentStrategyMode = 'STRAIGHT';
    else if (currentStrategyMode === 'STRAIGHT') currentStrategyMode = 'REVERSE';
    else currentStrategyMode = 'TGX_STATIC';

    const btn = document.getElementById('btnRemoteMode');
    if (currentStrategyMode === 'TGX_STATIC') {
      btn.textContent = '⚡ MODE: TGX 5-NODE STATIC (30S)';
      btn.style.background = 'linear-gradient(135deg, #22c55e, #f59e0b)';
      btn.style.color = '#fff';
    } else if (currentStrategyMode === 'BS_ALTERNATOR') {
      btn.textContent = '⚡ MODE: B-S-B-S (PING-PONG ALTERNATOR)';
      btn.style.background = 'linear-gradient(90deg, #ff007f, #7928ca)';
      btn.style.color = '#fff';
    } else if (currentStrategyMode === 'REVERSE') {
      btn.textContent = '🔄 MODE: REVERSE (INVERTED CHOP)';
      btn.style.background = '#ff9800';
      btn.style.color = '#fff';
    } else {
      btn.textContent = '➡️ MODE: STRAIGHT (DRAGON RIDER)';
      btn.style.background = '#73f7ff';
      btn.style.color = '#000';
    }
    sendRemoteCommand('SET_MODE', { mode: currentStrategyMode });
  };

  document.getElementById('btnSetBaseBet').onclick = () => {
    const val = parseInt(document.getElementById('remoteBaseBet').value) || 2;
    sendRemoteCommand('SET_BASE_BET', { baseBet: val });
  };

  document.getElementById('btnSetTakeProfit').onclick = () => {
    const val = parseFloat(document.getElementById('remoteTakeProfit').value) || 500;
    sendRemoteCommand('SET_TAKE_PROFIT', { takeProfitTarget: val });
  };

  document.getElementById('btnSetStartBal').onclick = () => {
    const val = parseFloat(document.getElementById('remoteStartBal').value) || 402;
    sendRemoteCommand('SET_START_BALANCE', { startBankroll: val });
  };

  document.getElementById('btnRemoteToggle').onclick = () => {
    isBotRunning = !isBotRunning;
    const btn = document.getElementById('btnRemoteToggle');
    if (isBotRunning) {
      btn.textContent = '⏹ PAUSE BOT';
      btn.style.background = '#ff4757';
      btn.style.color = '#fff';
    } else {
      btn.textContent = '▶ START BOT';
      btn.style.background = '#00e676';
      btn.style.color = '#000';
    }
    sendRemoteCommand('TOGGLE_RUNNING', { running: isBotRunning });
  };

  document.getElementById('btnResetSession').onclick = () => {
    if (confirm("Reset current bet to base bet on tablet?")) {
      sendRemoteCommand('RESET_SESSION', {});
    }
  };

  async function pollLiveTelemetry() {
    try {
      const res = await fetch(CLOUD_API + '?ts=' + Date.now(), { cache: 'no-store' });
      const state = await res.json();
      if (!state) return;

      const currentBal = state.currentBalance != null ? state.currentBalance : 275.00;
      const profit = state.sessionProfit != null ? state.sessionProfit : 0;
      const stake = state.currentStake || state.baseBet || 1;
      const wins = state.wins || 0;
      const losses = state.losses || 0;

      // Update UI
      document.getElementById('valBalance').textContent = `₹${currentBal.toFixed(2)}`;
      document.getElementById('valStartBal').textContent = `Start: ₹${(state.startBankroll || 275).toFixed(2)}`;

      const pnlEl = document.getElementById('valPnl');
      pnlEl.textContent = `${profit >= 0 ? '+' : ''}₹${profit.toFixed(2)}`;
      pnlEl.className = `stat-val ${profit >= 0 ? 'stat-green' : 'stat-danger'}`;

      document.getElementById('valWinRate').textContent = `Score: ${wins}W / ${losses}L`;
      document.getElementById('valStake').textContent = `₹${stake}`;
      document.getElementById('valBaseLbl').textContent = `Base Bet: ₹${state.baseBet || 1}`;

      // Mode sync
      if (state.reverseMode !== undefined && state.reverseMode !== isReverseMode) {
        isReverseMode = state.reverseMode;
        const btn = document.getElementById('btnRemoteMode');
        btn.textContent = isReverseMode ? '🔄 MODE: REVERSE (INVERTED)' : '➡️ MODE: STRAIGHT (DRAGON RIDER)';
        btn.style.background = isReverseMode ? '#ff9800' : '#73f7ff';
      }

      // Upcoming Draw
      document.getElementById('nextPeriod').textContent = state.nextPeriod ? `Period #${state.nextPeriod}` : 'Period #--';
      const rem = 60 - (new Date().getSeconds() % 60);
      document.getElementById('drawTimer').textContent = rem;

      const sigEl = document.getElementById('signalVal');
      const rec = state.nextPred || '--';
      sigEl.textContent = rec;
      sigEl.className = `signal-val ${rec === 'BIG' ? 'signal-big' : 'signal-small'}`;

      document.getElementById('signalModeBadge').textContent = isReverseMode ? 'AI REVERSE INVERTED PREDICTION' : 'AI DRAGON PREDICTION';
      document.getElementById('signalStake').textContent = `Next Stake: ₹${stake} on ${rec} (${isReverseMode ? 'Inverted' : 'Straight'})`;

      // Update button appearance
      if (state.running !== undefined && state.running !== isBotRunning) {
        isBotRunning = state.running;
        const btn = document.getElementById('btnRemoteToggle');
        if (isBotRunning) {
          btn.textContent = '⏹ PAUSE BOT';
          btn.style.background = '#ff4757';
          btn.style.color = '#fff';
        } else {
          btn.textContent = '▶ START BOT';
          btn.style.background = '#00e676';
          btn.style.color = '#000';
        }
      }

      // History Table
      const tbody = document.getElementById('last5Body');
      if (state.history && state.history.length > 0) {
        tbody.innerHTML = state.history.slice(0, 15).map(b => {
          const pStr = b.period ? String(b.period).slice(-4) : '--';
          const drawNum = b.number !== undefined ? b.number : '--';
          const drawSize = b.size || (parseInt(drawNum) >= 5 ? 'BIG' : 'SMALL') || '--';
          const pred = b.prediction || b.pred || drawSize;
          const predClass = pred.includes('BIG') || pred === 'BIG' ? 'tag-big' : 'tag-small';
          const sizeClass = drawSize === 'BIG' ? 'tag-big' : 'tag-small';
          const timeStr = b.time || new Date().toLocaleTimeString();

          if (b.isPending) {
            return `
              <tr style="background:rgba(0, 245, 255, 0.08);">
                <td><strong>#${pStr}</strong></td>
                <td><span class="${predClass}">${pred}</span></td>
                <td style="color:#00f5ff;font-weight:bold;">⏳ DRAWING...</td>
                <td style="color:#00f5ff;font-weight:bold;">PLACED</td>
                <td style="color:#ffea00;">-₹${b.stake || state.currentStake || 2}</td>
                <td style="color:#9aa3b8;font-size:10px;">${timeStr}</td>
              </tr>
            `;
          }

          let outcomeTag = '<span style="color:#8892b0;">RESOLVED</span>';
          let plTag = '<span style="color:#8892b0;">-</span>';

          if (b.won === true) {
            outcomeTag = '<span class="win-tag">WIN 🏆</span>';
            plTag = `<span class="win-tag">+₹${(b.profit || (b.stake ? b.stake * 0.96 : 1.92)).toFixed(2)}</span>`;
          } else if (b.won === false) {
            outcomeTag = '<span class="loss-tag">LOSS 💀</span>';
            plTag = `<span class="loss-tag">-₹${(b.profit ? Math.abs(b.profit) : (b.stake || 2)).toFixed(2)}</span>`;
          } else {
            outcomeTag = `<span class="${sizeClass}">${drawSize}</span>`;
            plTag = `<span style="color:#8892b0;">-</span>`;
          }

          return `
            <tr>
              <td><strong>#${pStr}</strong></td>
              <td><span class="${predClass}">${pred}</span></td>
              <td style="font-size:12px;font-weight:bold;">${drawNum} <span class="${sizeClass}" style="font-size:9.5px;padding:2px 4px;">${drawSize}</span></td>
              <td>${outcomeTag}</td>
              <td>${plTag}</td>
              <td style="color:#9aa3b8;font-size:10px;">${timeStr}</td>
            </tr>
          `;
        }).join('');
      }
    } catch (e) {}
  }

  setInterval(pollLiveTelemetry, 1000);
  pollLiveTelemetry();
})();
