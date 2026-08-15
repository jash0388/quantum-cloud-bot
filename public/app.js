/**
 * WM Casino Baccarat — Cloud Live Telemetry & Remote Control Client
 */

(function () {
  'use strict';

  const CLOUD_API = '/api/settings';
  let isBotRunning = false;

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
          setTimeout(() => { feedback.textContent = 'READY'; feedback.style.color = '#73f7ff'; }, 3000);
        }
      }
    } catch(e) {
      if (feedback) { feedback.textContent = 'ERROR SENDING'; feedback.style.color = '#ff4757'; }
    }
  }

  // Hook up Remote Control Buttons
  document.getElementById('btnSetBaseBet').onclick = () => {
    const val = parseInt(document.getElementById('remoteBaseBet').value) || 10;
    sendRemoteCommand('SET_BASE_BET', { baseBet: val });
  };

  document.getElementById('btnSetProfit').onclick = () => {
    const val = parseFloat(document.getElementById('remoteTargetProfit').value) || 200;
    sendRemoteCommand('SET_TARGET_PROFIT', { targetProfit: val });
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
    if (confirm("Reset Baccarat session profit on tablet?")) {
      sendRemoteCommand('RESET_SESSION', {});
    }
  };

  async function pollLiveTelemetry() {
    try {
      const res = await fetch(CLOUD_API + '?ts=' + Date.now(), { cache: 'no-store' });
      const state = await res.json();
      if (!state) return;

      const currentBal = state.currentBalance != null ? state.currentBalance : 435.18;
      const profit = state.sessionProfit != null ? state.sessionProfit : 0;
      const stake = state.currentStake || state.baseBet || 10;
      const step = state.martingaleLevel || 0;
      const wins = state.wins || 0;
      const losses = state.losses || 0;
      const tot = wins + losses;
      const wr = tot > 0 ? ((wins / tot) * 100).toFixed(0) : 0;

      // Update UI
      document.getElementById('valBalance').textContent = `₹${currentBal.toFixed(2)}`;
      document.getElementById('valStartBal').textContent = `Target: +₹${state.targetProfit || 200}`;

      const pnlEl = document.getElementById('valPnl');
      pnlEl.textContent = `${profit >= 0 ? '+' : ''}₹${profit.toFixed(2)}`;
      pnlEl.className = `stat-val ${profit >= 0 ? 'stat-green' : 'stat-danger'}`;

      document.getElementById('valWinRate').textContent = `Win Rate: ${wr}% (${wins}W / ${losses}L)`;
      document.getElementById('valStake').textContent = `₹${stake}`;
      document.getElementById('valBaseLbl').textContent = `Step ${step} (Base: ₹${state.baseBet || 10})`;

      // Target Table & Recommended Bet
      document.getElementById('targetTable').textContent = state.targetTable || 'Scanning...';
      document.getElementById('drawTimer').textContent = state.timer != null ? state.timer : '--';

      const sigEl = document.getElementById('signalVal');
      const rec = state.targetChoice || state.nextPred || 'BANKER';
      sigEl.textContent = rec;
      sigEl.style.color = rec === 'PLAYER' ? '#73f7ff' : '#ff4757';

      document.getElementById('signalStake').textContent = `Snipe Stake: ₹${stake} on ${rec}`;

      // Update Start/Pause button appearance if synced
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
          const isPlayer = b.prediction === 'PLAYER';
          return `
            <tr>
              <td><strong>${b.period}</strong></td>
              <td><span style="color:${isPlayer ? '#73f7ff' : '#ff4757'};font-weight:800;">${b.prediction}</span></td>
              <td style="font-size:11px;">${b.number}</td>
              <td class="${b.won ? 'win-tag' : 'loss-tag'}">${b.won ? 'WIN 🏆' : 'LOSS 💀'}</td>
              <td class="${b.profit >= 0 ? 'win-tag' : 'loss-tag'}">${b.profit >= 0 ? '+' : ''}₹${Math.abs(b.profit).toFixed(2)}</td>
              <td style="color:#9aa3b8;font-size:9.5px;">${b.time}</td>
            </tr>
          `;
        }).join('');
      }
    } catch (e) {}
  }

  setInterval(pollLiveTelemetry, 1000);
  pollLiveTelemetry();
})();
