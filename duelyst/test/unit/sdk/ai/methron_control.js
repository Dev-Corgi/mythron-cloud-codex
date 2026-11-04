const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const { expect } = require('chai');
const SDK = require('../../../../app/sdk.coffee');
const scoreMethronControl = require('../../../../server/ai/scoring/utils/utils_scoreMethronControl');
const StarterAI = require('../../../../server/ai/starter_ai');

const createSession = () => {
  const gameSession = SDK.GameSession.create();
  gameSession.setRuleset('practice-sandbox-hex', 2);
  const roster = [50003, 50004, 50006, 50007, 50008, 50022, 50023, 50028];
  SDK.GameSetup.setupNewSession(
    gameSession,
    { userId: 'methron-ai-player-1', name: 'Methron AI Player 1', deck: [{ id: SDK.Cards.Faction1.General }, ...roster.map((id) => ({ id }))] },
    { userId: 'methron-ai-player-2', name: 'Methron AI Player 2', deck: [{ id: SDK.Cards.Faction4.AltGeneral }, ...roster.map((id) => ({ id }))] },
    true,
  );
  gameSession.setStatus(SDK.GameStatus.active);
  return gameSession;
};

const setControlCounts = (gameSession, player1Count, player2Count) => {
  const points = gameSession.getBoard().getTiles(true, false)
    .filter((tile) => tile.getId() === SDK.Cards.Tile.MethronPoint);
  points.slice(0, player1Count).forEach((point) => point.setOwnerId(gameSession.getPlayer1Id()));
  points.slice(player1Count, player1Count + player2Count)
    .forEach((point) => point.setOwnerId(gameSession.getPlayer2Id()));
  return points;
};

const addUnit = (gameSession, cardId, ownerId, position) => {
  const unit = gameSession.createCardForIdentifier(cardId);
  unit.setOwnerId(ownerId);
  gameSession._indexCardAsNeeded(unit);
  unit.setPosition(position);
  unit.setIsPlayed(true);
  unit.setIsRemoved(false);
  unit.refreshExhaustion();
  gameSession.getBoard().addCard(unit);
  return unit;
};

describe('Practice AI Methron control valuation', () => {
  it('uses authoritative capture-before-damage results for 3–1 and equal control at either turn end', () => {
    const session = createSession();
    setControlCounts(session, 3, 1);
    const startingPlayer2Hp = session.getGeneralForPlayer2().getHP();
    const firstProjection = scoreMethronControl.createProjection(session);
    expect(firstProjection.getGeneralForPlayer2().getHP()).to.equal(startingPlayer2Hp - 400);
    firstProjection.terminate();

    session.setIsRunningAsAuthoritative(true);
    session.setValidators([]);
    session.executeAction(session.actionEndTurn());
    const startingPlayer1Hp = session.getGeneralForPlayer1().getHP();
    const secondProjection = scoreMethronControl.createProjection(session);
    expect(secondProjection.getGeneralForPlayer2().getHP()).to.equal(session.getGeneralForPlayer2().getHP() - 400);
    expect(secondProjection.getGeneralForPlayer1().getHP()).to.equal(startingPlayer1Hp);
    secondProjection.terminate();
    session.terminate();

    const tied = createSession();
    setControlCounts(tied, 2, 2);
    const tiedPlayer1Hp = tied.getGeneralForPlayer1().getHP();
    const tiedPlayer2Hp = tied.getGeneralForPlayer2().getHP();
    const tiedProjection = scoreMethronControl.createProjection(tied);
    expect(tiedProjection.getGeneralForPlayer1().getHP()).to.equal(tiedPlayer1Hp);
    expect(tiedProjection.getGeneralForPlayer2().getHP()).to.equal(tiedPlayer2Hp);
    tiedProjection.terminate();
    tied.terminate();
  });

  it('does not apply Methron valuation to another ruleset version', () => {
    const session = createSession();
    session.setRuleset('practice-sandbox-hex', 1);
    const position = session.getBoard().getTiles(true, false)
      .find((tile) => !session.getBoard().getEntityAtPosition(tile.getPosition())).getPosition();
    const unit = addUnit(session, SDK.Cards.Neutral.SaberspineTiger, session.getPlayer1Id(), position);
    const ai = new StarterAI(session, session.getPlayer1Id(), 1);
    ai._nextActions = [];

    expect(scoreMethronControl(session, unit.actionMove(position), session.getPlayer1Id())).to.equal(0);
    expect(ai._findBestMethronTacticalAction([unit])).to.equal(false);
    expect(ai._nextActions).to.have.length(0);
    session.terminate();
  });

  it('prefers removing an enemy occupant when that preserves owned point control', () => {
    const session = createSession();
    const board = session.getBoard();
    const point = board.getTiles(true, false).find((tile) => tile.getId() === SDK.Cards.Tile.MethronPoint);
    const sourcePosition = board.getHexNeighbors(point.getPosition()).find((position) =>
      board.hasTileAtPosition(position) && !board.getEntityAtPosition(position));
    const attacker = addUnit(session, SDK.Cards.Neutral.SaberspineTiger, session.getPlayer1Id(), sourcePosition);
    attacker.atk = 30;
    attacker.maxHP = 30;
    attacker.setDamage(0);
    attacker.setReach(2);
    const enemy = addUnit(session, SDK.Cards.Neutral.SaberspineTiger, session.getPlayer2Id(), point.getPosition());
    enemy.maxHP = 3;
    enemy.setDamage(0);
    point.setOwnerId(session.getPlayer1Id());
    const neutralPosition = board.getHexNeighbors(sourcePosition).find((position) =>
      board.hasTileAtPosition(position) && !board.getEntityAtPosition(position)
      && !board.positionsEqual(position, point.getPosition()));

    expect(scoreMethronControl(session, attacker.actionAttack(enemy), session.getPlayer1Id()))
      .to.be.greaterThan(scoreMethronControl(session, attacker.actionMove(neutralPosition), session.getPlayer1Id()));
    session.terminate();
  });

  it('applies terminal win and loss priorities to projected positions', () => {
    const winning = createSession();
    winning.getGeneralForPlayer2().setDamage(winning.getGeneralForPlayer2().getMaxHP());
    winning.setStatus(SDK.GameStatus.over);
    expect(scoreMethronControl.getPositionScore(winning, winning.getPlayer1Id())).to.be.at.least(1000);
    winning.terminate();

    const losing = createSession();
    losing.getGeneralForPlayer1().setDamage(losing.getGeneralForPlayer1().getMaxHP());
    losing.setStatus(SDK.GameStatus.over);
    expect(scoreMethronControl.getPositionScore(losing, losing.getPlayer1Id())).to.be.at.most(-1000);
    losing.terminate();
  });

  it('avoids a candidate that leaves the opponent a direct lethal attack on the General', () => {
    const session = createSession();
    const board = session.getBoard();
    const general = session.getGeneralForPlayer1();
    general.setDamage(general.getHP() - 1);
    const enemyPosition = board.getHexNeighbors(general.getPosition()).find((position) =>
      board.hasTileAtPosition(position) && !board.getEntityAtPosition(position));
    const enemy = addUnit(session, SDK.Cards.Neutral.SaberspineTiger, session.getPlayer2Id(), enemyPosition);
    enemy.atk = 30;
    enemy.maxHP = 3;
    enemy.setDamage(0);
    const attackerPosition = board.getHexNeighbors(enemyPosition).find((position) =>
      board.hasTileAtPosition(position) && !board.getEntityAtPosition(position));
    const attacker = addUnit(session, SDK.Cards.Neutral.SaberspineTiger, session.getPlayer1Id(), attackerPosition);
    attacker.atk = 30;
    attacker.maxHP = 30;
    attacker.setDamage(0);
    attacker.setReach(2);
    const neutralPosition = board.getHexNeighbors(attackerPosition).find((position) =>
      board.hasTileAtPosition(position) && !board.getEntityAtPosition(position));

    expect(scoreMethronControl(session, attacker.actionAttack(enemy), session.getPlayer1Id()))
      .to.be.greaterThan(scoreMethronControl(session, attacker.actionMove(neutralPosition), session.getPlayer1Id()));
    session.terminate();
  });

  it('values a safe recapture while preserving empty-point ownership and live candidate state', () => {
    const session = createSession();
    const board = session.getBoard();
    const point = board.getTiles(true, false).find((tile) => tile.getId() === SDK.Cards.Tile.MethronPoint);
    const sourcePosition = board.getHexNeighbors(point.getPosition()).find((position) =>
      board.hasTileAtPosition(position) && !board.getEntityAtPosition(position));
    const unit = addUnit(session, SDK.Cards.Neutral.SaberspineTiger, session.getPlayer1Id(), sourcePosition);
    point.setOwnerId(session.getPlayer2Id());
    const action = unit.actionMove(point.getPosition());
    const score = scoreMethronControl(session, action, session.getPlayer1Id());

    expect(score).to.be.greaterThan(0);
    expect(unit.getPosition()).to.deep.equal(sourcePosition);
    expect(point.getOwnerId()).to.equal(session.getPlayer2Id());

    const emptyPoint = board.getTiles(true, false).find((tile) =>
      tile.getId() === SDK.Cards.Tile.MethronPoint && tile !== point);
    emptyPoint.setOwnerId(session.getPlayer1Id());
    const emptyProjection = scoreMethronControl.createProjection(session);
    expect(emptyProjection.getBoard().getTileAtPosition(emptyPoint.getPosition(), true).getOwnerId())
      .to.equal(session.getPlayer1Id());
    emptyProjection.terminate();
    session.terminate();
  });

  it('uses the shared end-turn sequence when scoring an ephemeral capturer', () => {
    const session = createSession();
    const board = session.getBoard();
    const point = board.getTiles(true, false).find((tile) => tile.getId() === SDK.Cards.Tile.MethronPoint);
    const sourcePosition = board.getHexNeighbors(point.getPosition()).find((position) =>
      board.hasTileAtPosition(position) && !board.getEntityAtPosition(position));
    const ephemeral = addUnit(session, SDK.Cards.Faction3.Dervish, session.getPlayer1Id(), sourcePosition);
    session.setIsRunningAsAuthoritative(true);
    ephemeral.getInherentModifiersContextObjects().forEach((modifier) => session.applyModifierContextObject(modifier, ephemeral));
    expect(ephemeral.hasModifierClass(SDK.ModifierEphemeral)).to.equal(true);
    const action = ephemeral.actionMove(point.getPosition());

    const projection = scoreMethronControl.createProjection(
      session,
      JSON.parse(session.serializeToJSON(action)),
    );
    expect(projection.getBoard().getTileAtPosition(point.getPosition(), true).getOwnerId())
      .to.equal(session.getPlayer1Id());
    projection.terminate();
    expect(ephemeral.getIsActive()).to.equal(true);
    expect(point.getOwnerId()).to.not.equal(session.getPlayer1Id());
    session.terminate();
  });

  it('chooses capture when it beats neutral movement and chooses strong combat when that is better', () => {
    const session = createSession();
    const board = session.getBoard();
    const point = board.getTiles(true, false).find((tile) => tile.getId() === SDK.Cards.Tile.MethronPoint);
    const sourcePosition = board.getHexNeighbors(point.getPosition()).find((position) =>
      board.hasTileAtPosition(position) && !board.getEntityAtPosition(position));
    const unit = addUnit(session, SDK.Cards.Neutral.SaberspineTiger, session.getPlayer1Id(), sourcePosition);
    unit.setReach(2);
    unit.refreshExhaustion();
    const ai = new StarterAI(session, session.getPlayer1Id(), 1);
    const selectedCapture = ai.nextAction();
    expect(selectedCapture).to.be.instanceOf(SDK.MoveAction);
    expect(board.getTileAtPosition(selectedCapture.getTargetPosition(), true).getId())
      .to.equal(SDK.Cards.Tile.MethronPoint);
    session.terminate();

    const combatSession = createSession();
    const combatBoard = combatSession.getBoard();
    const combatPoint = combatBoard.getTiles(true, false).find((tile) => tile.getId() === SDK.Cards.Tile.MethronPoint);
    const combatSource = combatBoard.getHexNeighbors(combatPoint.getPosition()).find((position) =>
      combatBoard.hasTileAtPosition(position) && !combatBoard.getEntityAtPosition(position));
    const attacker = addUnit(combatSession, SDK.Cards.Neutral.SaberspineTiger, combatSession.getPlayer1Id(), combatSource);
    attacker.atk = 30;
    attacker.maxHP = 30;
    attacker.setDamage(0);
    attacker.setReach(2);
    attacker.refreshExhaustion();
    const enemyPosition = combatBoard.getHexNeighbors(combatSource).find((position) =>
      combatBoard.hasTileAtPosition(position) && !combatBoard.getEntityAtPosition(position)
      && !combatBoard.positionsEqual(position, combatPoint.getPosition()));
    const enemy = addUnit(combatSession, SDK.Cards.Neutral.SaberspineTiger, combatSession.getPlayer2Id(), enemyPosition);
    enemy.atk = 0;
    enemy.maxHP = 3;
    enemy.setDamage(0);
    expect(attacker.getCanAttack()).to.equal(true);
    expect(attacker.getAttackRange().getValidTargets(combatBoard, attacker, attacker.getPosition())).to.include(enemy);
    const attackProjection = scoreMethronControl.createProjection(
      combatSession,
      JSON.parse(combatSession.serializeToJSON(attacker.actionAttack(enemy))),
    );
    attackProjection.terminate();
    expect(scoreMethronControl(combatSession, attacker.actionAttack(enemy), combatSession.getPlayer1Id()))
      .to.be.greaterThan(scoreMethronControl(combatSession, attacker.actionMove(combatPoint.getPosition()), combatSession.getPlayer1Id()));
    const combatAI = new StarterAI(combatSession, combatSession.getPlayer1Id(), 1);
    const selectedAttack = combatAI.nextAction();
    expect(selectedAttack).to.be.instanceOf(SDK.AttackAction);
    combatSession.terminate();
  });
});
