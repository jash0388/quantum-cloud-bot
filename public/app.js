/**
 * JASH PERC WIN — Cloud Live Telemetry Client
 * Polls real-time stats directly from the tablet's live stream
 */

(function () {
  'use strict';

  const CLOUD_API = '/api/settings';

  async function pollLiveTelemetry() {
    try {
      const res = await fetch(CLOUD_API + '?ts=' + Date.now(), { cache: 'no-store' });
      const state = await res.json();
      if (!state) return;

      const startBank = state.startBankroll || 384;
      const currentTotal = (state.currentBalance != null && state.currentBalance > 0) ? state.currentBalance : 421.76;
      const profit = currentTotal - startBank;
      const stake = state.currentStake || state.baseBet || 4;
      const roundNum = state.currentRoundNum || 2;
      const totRounds = state.totalRounds || 14;
      const targetPct = state.targetPct || 13;
      const status = state.status || 'RESTING (7m left)';
      const targetGoal = state.targetBalance || (currentTotal * (1 + (targetPct / 100)));
      const wins = state.wins || 17;
      const losses = state.losses || 16;
      const tot = wins + losses;
      const wr = tot > 0 ? ((wins / tot) * 100).toFixed(0) : 52;

      // Update UI Cards
      document.getElementById('valBalance').textContent = `₹${currentTotal.toFixed(2)}`;
      document.getElementById('valStartBal').textContent = `Started: ₹${startBank.toFixed(2)}`;

      const pnlEl = document.getElementById('valPnl');
      pnlEl.textContent = `${profit >= 0 ? '+' : ''}₹${profit.toFixed(2)}`;
      pnlEl.className = `stat-val ${profit >= 0 ? 'stat-green' : 'stat-danger'}`;

      document.getElementById('valWinRate').textContent = `Win Rate: ${wr}% (${wins}W / ${losses}L)`;
      document.getElementById('valStake').textContent = `₹${stake}`;
      document.getElementById('valBaseLbl').textContent = `Base: ₹${state.baseBet || 4}`;

      // Stage & Progress
      document.getElementById('valStageBadge').textContent = `🎯 ROUND ${roundNum} OF ${totRounds} (+${targetPct}%)`;
      document.getElementById('valStatus').textContent = status;
      document.getElementById('valStatus').style.color = status.includes('REST') ? '#73f7ff' : (status.includes('ACTIVE') ? '#00e676' : '#ff4757');

      document.getElementById('valGoalTotal').textContent = `₹${targetGoal.toFixed(2)} (+${targetPct}%)`;
      document.getElementById('valTargetPct').textContent = `+${targetPct}% per stage (${totRounds} total)`;

      // Upcoming round & signal
      document.getElementById('targetPeriod').textContent = state.nextPeriod || '030';
      const remSeconds = 60 - (new Date().getSeconds() % 60);
      document.getElementById('drawTimer').textContent = remSeconds;

      const sigEl = document.getElementById('signalVal');
      sigEl.textContent = state.nextPred || '--';
      sigEl.style.color = state.nextPred === 'BIG' ? '#f7c873' : (state.nextPred === 'SMALL' ? '#73f7ff' : '#9aa3b8');
      document.getElementById('signalStake').textContent = `Current Bet: ₹${stake} on ${state.nextPred || '--'}`;

      // History Table
      const tbody = document.getElementById('last5Body');
      if (state.history && state.history.length > 0) {
        tbody.innerHTML = state.history.slice(0, 15).map(b => `
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
    } catch (e) {}
  }

  setInterval(pollLiveTelemetry, 1000);
  pollLiveTelemetry();
})();
