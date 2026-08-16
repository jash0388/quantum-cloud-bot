/**
 * Serverless Cloud Telemetry & Remote Control API for Vercel
 * Supports Reverse/Straight Inverter Mode Toggle
 */

let globalCloudState = {
  gameType: 'WINGO',
  botName: 'WinGo Dragon AI Bot',
  startBankroll: 402.32,
  currentBalance: 402.32,
  takeProfitTarget: 500.00,
  sessionProfit: 0.00,
  currentStake: 2,
  baseBet: 2,
  reverseMode: false,
  status: '24/7 ACTIVE',
  running: true,
  wins: 0,
  losses: 0,
  nextPeriod: '--',
  nextPred: '--',
  timer: 30,
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
        } else if (key === 'currentBalance') {
          const val = Number(data.currentBalance);
          if (!(val < 50 && (globalCloudState.startBankroll >= 100 || globalCloudState.currentBalance >= 100))) {
            globalCloudState.currentBalance = val;
          }
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

      if (data.commandType === 'TOGGLE_REVERSE') {
        globalCloudState.reverseMode = !globalCloudState.reverseMode;
      } else if (data.payload) {
        if (data.payload.baseBet != null) globalCloudState.baseBet = Number(data.payload.baseBet);
        if (data.payload.takeProfitTarget != null) globalCloudState.takeProfitTarget = Number(data.payload.takeProfitTarget);
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
