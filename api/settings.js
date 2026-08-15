/**
 * Serverless Cloud Telemetry & Remote Control API for Vercel
 * 24/7 WinGo Continuous Martingale Bot
 */

let globalCloudState = {
  gameType: 'WINGO',
  botName: 'WinGo 24/7 Martingale Bot',
  startBankroll: 480.00,
  currentBalance: 480.00,
  sessionProfit: 0.00,
  currentStake: 4,
  baseBet: 4,
  status: '24/7 CONTINUOUS ACTIVE',
  running: true,
  wins: 0,
  losses: 0,
  nextPeriod: '--',
  nextPred: '--',
  timer: 60,
  lastUpdated: Date.now(),
  history: [],
  remoteCommand: null
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

    // 1. Tablet Sending Telemetry
    if (data.isTelemetry) {
      for (const key of Object.keys(data)) {
        if (key === 'history' && Array.isArray(data.history)) {
          globalCloudState.history = data.history.slice(0, 30);
        } else if (key !== 'isTelemetry' && data[key] !== undefined) {
          globalCloudState[key] = data[key];
        }
      }
      globalCloudState.lastUpdated = Date.now();
      
      const cmdToSend = globalCloudState.remoteCommand;
      globalCloudState.remoteCommand = null;
      return res.json({ success: true, command: cmdToSend, state: globalCloudState });
    }

    // 2. Phone Sending Remote Control Command
    if (data.isRemoteControl) {
      globalCloudState.remoteCommand = {
        type: data.commandType,
        payload: data.payload,
        timestamp: Date.now()
      };

      if (data.payload) {
        if (data.payload.baseBet != null) globalCloudState.baseBet = Number(data.payload.baseBet);
        if (data.payload.startBankroll != null) {
          globalCloudState.startBankroll = Number(data.payload.startBankroll);
          globalCloudState.currentBalance = Number(data.payload.startBankroll);
        }
        if (data.payload.running != null) globalCloudState.running = Boolean(data.payload.running);
      }
      globalCloudState.lastUpdated = Date.now();
      return res.json({ success: true, message: 'Remote command queued for tablet', state: globalCloudState });
    }

    for (const key of Object.keys(data)) {
      if (data[key] !== undefined) globalCloudState[key] = data[key];
    }
    return res.json({ success: true, state: globalCloudState });
  }

  return res.json(globalCloudState);
};
