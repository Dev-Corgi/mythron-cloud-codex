const SDK = require('app/sdk');

const entityByIndex = (gameSession, index) => gameSession.getCardByIndex(index);
const endpointKeys = (board, paths) => {
  const keys = {};
  for (const path of paths) {
    const endpoint = path[path.length - 1];
    keys[`${endpoint.q},${endpoint.r}`] = true;
  }
  return keys;
};

// Evaluate a canonical Wall attack in a deserialized candidate session. SDK
// action resolution supplies modified damage and removes a lethal Wall there;
// the authoritative match is never touched during scoring.
module.exports = function scoreWallRouteBenefit(gameSession, attacker, wall) {
  if (!gameSession || gameSession.getRulesetId() !== 'practice-sandbox-hex'
    || gameSession.getRulesetVersion() !== 2 || !attacker || !wall
    || wall.getType() !== SDK.CardType.Tile || wall.getId() !== SDK.Cards.Tile.Wall
    || !wall.getIsActive()) return 0;

  const candidate = SDK.GameSession.create();
  try {
    const snapshot = JSON.parse(gameSession.serializeToJSON(gameSession));
    candidate.deserializeSessionFromFirebase(snapshot);
    const candidateAttacker = entityByIndex(candidate, attacker.getIndex());
    const candidateWall = entityByIndex(candidate, wall.getIndex());
    if (!candidateAttacker || !candidateWall || !candidateWall.getIsActive()) throw new Error('candidate attacker or Wall missing');
    const board = candidate.getBoard();
    const routesBefore = {};
    for (const unit of board.getEntities()) {
      if (unit instanceof SDK.Unit && unit.getIsActive() && unit.getIsPlayed()
        && unit.getOwnerId() === attacker.getOwnerId()) {
        routesBefore[unit.getIndex()] = endpointKeys(board, unit.getMovementRange().getValidPositions(board, unit));
      }
    }

    candidate.setIsRunningAsAuthoritative(true);
    candidate.setValidators([]);
    candidate.executeAction(candidateAttacker.actionAttack(candidateWall));

    const dealt = Math.max(0, wall.getHP() - (candidateWall.getIsActive() ? candidateWall.getHP() : 0));
    let score = dealt * 2;
    if (!candidateWall.getIsActive()) {
      for (const unit of board.getEntities()) {
        if (!(unit instanceof SDK.Unit) || !unit.getIsActive() || !unit.getIsPlayed()
          || unit.getOwnerId() !== attacker.getOwnerId()
          || unit.hasActiveModifierClass(SDK.ModifierFlying)) continue;
        unit.getMovementRange().flushCachedState();
        const before = routesBefore[unit.getIndex()] || {};
        const after = endpointKeys(board, unit.getMovementRange().getValidPositions(board, unit));
        const newlyReachable = Object.keys(after).filter((key) => !before[key]).length;
        score += newlyReachable * 8;
      }
    }
    return score;
  } finally {
    candidate.terminate();
  }
};
