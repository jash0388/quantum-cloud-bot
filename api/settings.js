/**
 * Serverless Cloud Telemetry & Remote Control API for Vercel
 * Supports WinGo Lottery & WM Casino Baccarat Live Monitoring
 */

let globalCloudState = {
  gameType: 'BACCARAT', // 'BACCARAT' | 'WINGO'
  botName: 'WM Casino Baccarat AI',
  startBankroll: 435.18,
  currentBalance: 435.18,
  sessionProfit: 0.00,
  currentStake: 10,
  baseBet: 10,
  martingaleLevel: 0,
  maxMartingale: 5,
  targetProfit: 200,
  stopLoss: 500,
  status: 'ACTIVE SCANNING',
  running: false,
  wins: 0,
  losses: 0,
  targetTable: 'Baccarat 17',
  targetChoice: 'BANKER', // 'PLAYER' | 'BANKER'
  timer: 22,
  lastUpdated: Date.now(),
  history: [
    { period: 'Bac 16', prediction: 'PLAYER', number: 'P:7 vs B:1', won: true, profit: 9.50, time: '11:19:15 AM' },
    { period: 'Bac 15', prediction: 'BANKER', number: 'P:2 vs B:8', won: true, profit: 9.50, time: '11:18:20 AM' },
    { period: 'Bac 17', prediction: 'PLAYER', number: 'P:4 vs B:9', won: false, profit: -10.00, time: '11:17:10 AM' }
  ],
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
        if (data.payload.targetProfit != null) globalCloudState.targetProfit = Number(data.payload.targetProfit);
        if (data.payload.stopLoss != null) globalCloudState.stopLoss = Number(data.payload.stopLoss);
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
