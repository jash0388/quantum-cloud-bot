/**
 * WinGo 24/7 Martingale — Cloud Live Telemetry & Remote Control Client
 */

(function () {
  'use strict';

  const CLOUD_API = '/api/settings';
  let isBotRunning = true;

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

  // Hook up Remote Control Buttons
  document.getElementById('btnSetBaseBet').onclick = () => {
    const val = parseInt(document.getElementById('remoteBaseBet').value) || 4;
    sendRemoteCommand('SET_BASE_BET', { baseBet: val });
  };

  document.getElementById('btnSetStartBal').onclick = () => {
    const val = parseFloat(document.getElementById('remoteStartBal').value) || 480;
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

      const currentBal = state.currentBalance != null ? state.currentBalance : 480.00;
      const profit = state.sessionProfit != null ? state.sessionProfit : 0;
      const stake = state.currentStake || state.baseBet || 4;
      const wins = state.wins || 0;
      const losses = state.losses || 0;

      // Update UI
      document.getElementById('valBalance').textContent = `₹${currentBal.toFixed(2)}`;
      document.getElementById('valStartBal').textContent = `Start: ₹${(state.startBankroll || 480).toFixed(2)}`;

      const pnlEl = document.getElementById('valPnl');
      pnlEl.textContent = `${profit >= 0 ? '+' : ''}₹${profit.toFixed(2)}`;
      pnlEl.className = `stat-val ${profit >= 0 ? 'stat-green' : 'stat-danger'}`;

      document.getElementById('valWinRate').textContent = `Score: ${wins}W / ${losses}L`;
      document.getElementById('valStake').textContent = `₹${stake}`;
      document.getElementById('valBaseLbl').textContent = `Base Bet: ₹${state.baseBet || 4}`;

      // Upcoming Draw
      document.getElementById('nextPeriod').textContent = state.nextPeriod ? `Period #${state.nextPeriod}` : 'Period #--';
      const rem = 60 - (new Date().getSeconds() % 60);
      document.getElementById('drawTimer').textContent = rem;

      const sigEl = document.getElementById('signalVal');
      const rec = state.nextPred || '--';
      sigEl.textContent = rec;
      sigEl.className = `signal-val ${rec === 'BIG' ? 'signal-big' : 'signal-small'}`;

      document.getElementById('signalStake').textContent = `Next Stake: ₹${stake} on ${rec}`;

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
          if (b.isPending) {
            return `
              <tr style="background:rgba(115,247,255,0.08);">
                <td><strong>#${b.period}</strong></td>
                <td><span class="${b.prediction === 'BIG' ? 'tag-big' : 'tag-small'}">${b.prediction}</span></td>
                <td style="color:#73f7ff;font-weight:bold;">⏳ DRAWING...</td>
                <td style="color:#73f7ff;font-weight:bold;">-</td>
                <td style="color:#f7c873;">-₹${state.currentStake || 4}</td>
                <td style="color:#9aa3b8;font-size:9.5px;">${b.time}</td>
              </tr>
            `;
          }
          return `
            <tr>
              <td><strong>#${b.period}</strong></td>
              <td><span class="${b.prediction === 'BIG' ? 'tag-big' : 'tag-small'}">${b.prediction}</span></td>
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
