/**
 * JASH PERC WIN — Cloud Live Telemetry Client
 * Real-time balance deduction & pending bet status row
 */

(function () {
  'use strict';

  const CLOUD_API = '/api/settings';

  async function pollLiveTelemetry() {
    try {
      const res = await fetch(CLOUD_API + '?ts=' + Date.now(), { cache: 'no-store' });
      const state = await res.json();
      if (!state) return;

      const startBank = state.startBankroll || 421.76;
      const profit = state.sessionProfit != null ? state.sessionProfit : 0;
      const currentTotal = state.currentBalance != null ? state.currentBalance : (startBank + profit);
      const stake = state.currentStake || state.baseBet || 4;
      const roundNum = state.currentRoundNum || 1;
      const totRounds = state.totalRounds || 14;
      const targetPct = state.targetPct || 13;
      const status = state.status || 'ACTIVE BETTING';
      const targetGoal = state.targetBalance || (startBank * (1 + (targetPct / 100)));
      const wins = state.wins || 0;
      const losses = state.losses || 0;
      const tot = wins + losses;
      const wr = tot > 0 ? ((wins / tot) * 100).toFixed(0) : 100;

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
      document.getElementById('valStatus').style.color = status.includes('REST') ? '#73f7ff' : (status.includes('BET') || status.includes('ACTIVE') ? '#00e676' : '#ff4757');

      document.getElementById('valGoalTotal').textContent = `₹${targetGoal.toFixed(2)} (+${targetPct}%)`;
      document.getElementById('valTargetPct').textContent = `+${targetPct}% per stage (${totRounds} total)`;

      // Upcoming round & signal
      document.getElementById('targetPeriod').textContent = state.nextPeriod || '--';
      const remSeconds = 60 - (new Date().getSeconds() % 60);
      document.getElementById('drawTimer').textContent = remSeconds;

      const sigEl = document.getElementById('signalVal');
      sigEl.textContent = state.nextPred || '--';
      sigEl.style.color = state.nextPred === 'BIG' ? '#f7c873' : (state.nextPred === 'SMALL' ? '#73f7ff' : '#9aa3b8');
      
      const isBetPending = state.pendingBet != null;
      document.getElementById('signalStake').textContent = isBetPending ? 
        `Active Stake: ₹${state.pendingBet.stake} on ${state.pendingBet.pred} (⏳ Placed)` : 
        `Next Stake: ₹${stake} on ${state.nextPred || '--'}`;

      // History Table
      const tbody = document.getElementById('last5Body');
      if (state.history && state.history.length > 0) {
        tbody.innerHTML = state.history.slice(0, 15).map(b => {
          if (b.isPending) {
            return `
              <tr style="background:rgba(115,247,255,0.08);border-left:3px solid #73f7ff;">
                <td><strong>${b.period}</strong></td>
                <td><span style="color:${b.prediction === 'BIG' ? '#f7c873' : '#73f7ff'};font-weight:800;">${b.prediction}</span></td>
                <td style="color:#73f7ff;font-style:italic;">Drawing...</td>
                <td style="color:#f7c873;font-weight:800;">⏳ PENDING</td>
                <td style="color:#9aa3b8;font-weight:bold;">-</td>
                <td style="color:#9aa3b8;font-size:9.5px;">${b.time}</td>
              </tr>
            `;
          }
          return `
            <tr>
              <td><strong>${b.period}</strong></td>
              <td><span style="color:${b.prediction === 'BIG' ? '#f7c873' : '#73f7ff'};font-weight:800;">${b.prediction}</span></td>
              <td>${b.number}</td>
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
