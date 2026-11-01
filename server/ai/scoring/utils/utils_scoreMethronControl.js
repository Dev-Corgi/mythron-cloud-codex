const SDK = require('app/sdk');

const METHRON_RULESET = 'practice-sandbox-hex';
const POINT_VALUE = 2;
const UNIT_MATERIAL_WEIGHT = 0.5;
const TERMINAL_VALUE = 1000;

const isMethronSession = (gameSession) => gameSession
  && gameSession.getRulesetId() === METHRON_RULESET
  && gameSession.getRulesetVersion() === 2;

const createProjection = (gameSession, actionData) => {
  const projection = SDK.GameSession.create();
  try {
    projection.deserializeSessionFromFirebase(JSON.parse(gameSession.serializeToJSON(gameSession)));
    projection.setStatus(SDK.GameStatus.active);
    projection.setIsRunningAsAuthoritative(true);
    projection.setValidators([]);
    if (actionData) {
      const action = projection.deserializeActionFromFirebase(actionData);
      projection.executeAction(action);
    }
    if (!projection.isOver()) projection.executeAction(projection.actionEndTurn());
    return projection;
  } catch (error) {
    projection.terminate();
    throw error;
  }
};

const getControlCounts = (gameSession) => {
  const counts = { player1: 0, player2: 0 };
  for (const tile of gameSession.getBoard().getTiles(true, false)) {
    if (tile.getId() !== SDK.Cards.Tile.MethronPoint) continue;
    if (tile.getOwnerId() === gameSession.getPlayer1Id()) counts.player1 += 1;
    else if (tile.getOwnerId() === gameSession.getPlayer2Id()) counts.player2 += 1;
  }
  return counts;
};

const getUnitMaterial = (gameSession, playerId) => gameSession.getBoard().getUnits()
  .filter((unit) => unit.getIsActive() && !unit.getIsGeneral() && unit.getOwnerId() === playerId)
  .reduce((total, unit) => total + unit.getHP() + unit.getATK(), 0);

const hasImmediateLethalGeneralThreat = (gameSession, playerId) => {
  if (gameSession.isOver()) return false;

  const opponentPlayerId = gameSession.getOpponentPlayerIdOfPlayerId(playerId);
  const general = gameSession.getGeneralForPlayerId(playerId);
  const board = gameSession.getBoard();
  for (const unit of board.getUnits()) {
    if (!unit.getIsActive() || unit.getOwnerId() !== opponentPlayerId || !unit.getCanAttack()) continue;

    const positions = [unit.getPosition()];
    if (unit.getCanMove()) {
      positions.push(...unit.getMovementRange().getValidPositions(board, unit));
    }
    for (const position of positions) {
      const targets = unit.getAttackRange().getValidTargets(board, unit, position);
      if (targets.includes(general) && unit.getATK() >= general.getHP()) return true;
    }
  }
  return false;
};

const getPositionScore = (gameSession, playerId) => {
  const otherPlayerId = gameSession.getOpponentPlayerIdOfPlayerId(playerId);
  const ownGeneral = gameSession.getGeneralForPlayerId(playerId);
  const opposingGeneral = gameSession.getGeneralForPlayerId(otherPlayerId);
  const counts = getControlCounts(gameSession);
  const ownCount = playerId === gameSession.getPlayer1Id() ? counts.player1 : counts.player2;
  const otherCount = playerId === gameSession.getPlayer1Id() ? counts.player2 : counts.player1;
  let score = ownGeneral.getHP() - opposingGeneral.getHP();
  score += POINT_VALUE * (ownCount - otherCount);
  score += UNIT_MATERIAL_WEIGHT * (getUnitMaterial(gameSession, playerId) - getUnitMaterial(gameSession, otherPlayerId));
  if (gameSession.isOver()) {
    if (ownGeneral.getHP() <= 0) score -= TERMINAL_VALUE;
    else if (opposingGeneral.getHP() <= 0) score += TERMINAL_VALUE;
  } else if (hasImmediateLethalGeneralThreat(gameSession, playerId)) {
    score -= TERMINAL_VALUE;
  }
  return score;
};

const getActionData = (gameSession, action) => JSON.parse(gameSession.serializeToJSON(action));

const scoreMethronControl = (gameSession, action, playerId, baselineProjection) => {
  if (!isMethronSession(gameSession) || !action || !playerId) return 0;
  const before = baselineProjection || createProjection(gameSession);
  const candidate = createProjection(gameSession, getActionData(gameSession, action));
  try {
    return getPositionScore(candidate, playerId) - getPositionScore(before, playerId);
  } finally {
    candidate.terminate();
    if (!baselineProjection) before.terminate();
  }
};

scoreMethronControl.createProjection = createProjection;
scoreMethronControl.getPositionScore = getPositionScore;
scoreMethronControl.isMethronSession = isMethronSession;

module.exports = scoreMethronControl;
