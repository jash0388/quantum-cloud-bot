/**
 * Serverless Cloud Telemetry & Live Sync API for Vercel
 * Syncs real-time stats from the tablet bot to your phone dashboard
 */

let globalCloudState = {
  botName: 'jash perc win',
  startBankroll: 262.00,
  currentBalance: 262.00,
  sessionProfit: 0.00,
  currentStake: 3,
  baseBet: 3,
  targetPct: 15,
  currentRoundNum: 1,
  totalRounds: 4,
  restMinutes: 10,
  roundProgress: 0.00,
  roundTarget: 39.30,
  status: 'ACTIVE',
  wins: 0,
  losses: 0,
  nextPeriod: '--',
  nextPred: 'WAITING...',
  timer: 60,
  lastUpdated: Date.now(),
  history: []
};

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const data = req.body || {};
    for (const key of Object.keys(data)) {
      if (key === 'history' && Array.isArray(data.history)) {
        globalCloudState.history = data.history.slice(0, 30);
      } else if (data[key] !== undefined) {
        globalCloudState[key] = data[key];
      }
    }
    globalCloudState.lastUpdated = Date.now();
    return res.json({ success: true, state: globalCloudState });
  }

  return res.json(globalCloudState);
};
