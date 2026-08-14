/**
 * Serverless Cloud State & Settings API for Vercel
 * Stores & syncs locked balance across ALL devices (Phone, Tablet, PC)
 */

let globalCloudState = {
  baseBet: 4,
  startBalance: 228.00,
  currentBalance: 483.16,
  currentStake: 4,
  wins: 0,
  losses: 0,
  history: [],
  processedSet: []
};

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { baseBet, startBalance, currentBalance, currentStake, wins, losses, history, processedSet } = req.body || {};
    if (baseBet != null) globalCloudState.baseBet = Number(baseBet);
    if (startBalance != null) globalCloudState.startBalance = Number(startBalance);
    if (currentBalance != null) globalCloudState.currentBalance = Number(currentBalance);
    if (currentStake != null) globalCloudState.currentStake = Number(currentStake);
    if (wins != null) globalCloudState.wins = Number(wins);
    if (losses != null) globalCloudState.losses = Number(losses);
    if (history && Array.isArray(history)) globalCloudState.history = history.slice(0, 30);
    if (processedSet && Array.isArray(processedSet)) globalCloudState.processedSet = processedSet.slice(-100);

    return res.json({ success: true, state: globalCloudState });
  }

  return res.json(globalCloudState);
};
