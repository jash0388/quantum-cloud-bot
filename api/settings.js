/**
 * Serverless Cloud Telemetry & Two-Way Control API for Vercel
 * Supports real-time telemetry streaming AND live remote commands from Phone -> Tablet!
 */

let globalCloudState = {
  botName: 'jash perc win',
  startBankroll: 480.00,
  currentBalance: 480.00,
  sessionProfit: 0.00,
  currentStake: 4,
  baseBet: 4,
  targetPct: 13,
  currentRoundNum: 2,
  totalRounds: 14,
  restMinutes: 10,
  targetBalance: 542.40,
  roundProgress: 0.00,
  roundTarget: 62.40,
  status: 'ACTIVE',
  running: true,
  wins: 0,
  losses: 0,
  nextPeriod: '--',
  nextPred: '--',
  pendingBet: null,
  timer: 60,
  lastUpdated: Date.now(),
  history: [],
  // Remote Command Queue (Commands sent from phone to tablet)
  remoteCommand: null, // { type: 'SET_SETTINGS' | 'TOGGLE_BOT' | 'SKIP_REST' | 'SET_BALANCE', payload: {...}, timestamp: 123 }
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

    // 1. Tablet Sending Telemetry Update
    if (data.isTelemetry) {
      for (const key of Object.keys(data)) {
        if (key === 'history' && Array.isArray(data.history)) {
          globalCloudState.history = data.history.slice(0, 30);
        } else if (key !== 'isTelemetry' && data[key] !== undefined) {
          globalCloudState[key] = data[key];
        }
      }
      globalCloudState.lastUpdated = Date.now();
      
      // Return any pending remote command back to tablet, then clear it!
      const cmdToSend = globalCloudState.remoteCommand;
      globalCloudState.remoteCommand = null;
      return res.json({ success: true, command: cmdToSend, state: globalCloudState });
    }

    // 2. User Sending Remote Control Command from Phone Dashboard
    if (data.isRemoteControl) {
      globalCloudState.remoteCommand = {
        type: data.commandType, // e.g. 'SET_BASE_BET', 'SET_TARGET_PCT', 'TOGGLE_RUNNING', 'RESET_SESSION', 'SET_BALANCE'
        payload: data.payload,
        timestamp: Date.now()
      };

      // Optimistically update cloud state
      if (data.payload) {
        if (data.payload.baseBet != null) globalCloudState.baseBet = Number(data.payload.baseBet);
        if (data.payload.targetPct != null) globalCloudState.targetPct = Number(data.payload.targetPct);
        if (data.payload.totalRounds != null) globalCloudState.totalRounds = Number(data.payload.totalRounds);
        if (data.payload.restMinutes != null) globalCloudState.restMinutes = Number(data.payload.restMinutes);
        if (data.payload.currentBalance != null) globalCloudState.currentBalance = Number(data.payload.currentBalance);
        if (data.payload.running != null) globalCloudState.running = Boolean(data.payload.running);
      }
      globalCloudState.lastUpdated = Date.now();
      return res.json({ success: true, message: 'Remote command queued for tablet', state: globalCloudState });
    }

    // Generic Update
    for (const key of Object.keys(data)) {
      if (data[key] !== undefined) globalCloudState[key] = data[key];
    }
    return res.json({ success: true, state: globalCloudState });
  }

  return res.json(globalCloudState);
};
