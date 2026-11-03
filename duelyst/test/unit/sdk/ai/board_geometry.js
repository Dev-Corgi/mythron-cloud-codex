const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const { expect } = require('chai');
const SDK = require('../../../../app/sdk.coffee');
const UtilsSDK = require('../../../utils/utils_sdk');
const BoardGeometry = require('../../../../server/ai/scoring/utils/utils_boardGeometry');
const StarterAI = require('../../../../server/ai/starter_ai');
const scoreWallRouteBenefit = require('../../../../server/ai/scoring/utils/utils_scoreWallRouteBenefit');
const ModifierOpeningGambitDamageNearby = require('../../../../app/sdk/modifiers/modifierOpeningGambitDamageNearby.coffee');

describe('Practice AI board geometry', () => {
  beforeEach(() => {
    UtilsSDK.setupSession(
      [{ id: SDK.Cards.Faction1.General }],
      [{ id: SDK.Cards.Faction4.General }],
      true,
      true,
    );
    SDK.GameSession.getInstance().setRuleset('practice-sandbox-hex', 2);
  });

  afterEach(() => {
    SDK.GameSession.reset();
  });

  it('uses shared version 2 row, column, and distance geometry', () => {
    const session = SDK.GameSession.getInstance();
    const board = session.getBoard();
    const center = SDK.HexTopology.renderedToAxial(4, 2);
    const farColumn = SDK.HexTopology.renderedToAxial(8, 2);

    expect(BoardGeometry.isHex(session)).to.equal(true);
    expect(BoardGeometry.column(session, center)).to.equal(4);
    expect(BoardGeometry.row(session, center)).to.equal(2);
    expect(BoardGeometry.distanceFromColumn(session, center, farColumn)).to.equal(4);
    expect(BoardGeometry.maxDistance(session, 0)).to.equal(10);
    expect(board.getHexNeighbors(center)).to.have.length(6);
  });

  it('scores only the enemy Unit when it shares a position with a Wall', () => {
    const session = SDK.GameSession.getInstance();
    const board = session.getBoard();
    const source = session.getGeneralForPlayer1();
    const enemy = session.getGeneralForPlayer2();
    const position = { q: 6, r: 0 };
    source.setPosition({ q: 5, r: 0 });
    source.setReach(2);
    source.refreshExhaustion();
    enemy.setPosition(position);
    const wall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    wall.setOwnerId(session.getPlayer2Id());
    wall.setPosition(position);
    wall.setIsPlayed(true);
    wall.setIsRemoved(false);
    board.addCard(wall);

    const ai = new StarterAI(session, session.getPlayer1Id(), 1);
    const objectives = ai._findSortedFilteredAttackObjectivesAndScoresForUnit(source, source.getPosition(), false, false);
    expect(objectives.map((entry) => entry.objective)).to.deep.equal([enemy]);
    expect(ai._findSortedFilteredAttackObjectivesAndScoresForUnit(source, source.getPosition(), false, false)
      .some((entry) => entry.objective === wall)).to.equal(false);

    const area = new ModifierOpeningGambitDamageNearby();
    area.setGameSession(session);
    area.setCard(source);
    area.damageAmount = 1;
    const queued = [];
    const execute = session.executeAction;
    session.executeAction = (action) => queued.push(action);
    try {
      area.onOpeningGambit();
    } finally {
      session.executeAction = execute;
    }
    expect(queued.map((action) => action.getTarget())).to.include.members([enemy, wall]);
  });

  it('simulates Wall damage in an isolated version 2 session and rewards only newly opened movement endpoints', () => {
    const session = SDK.GameSession.create();
    session.setRuleset('practice-sandbox-hex', 2);
    const roster = [10979, 19052, 19038, 10205, 10001, 19051, 10954, 10206];
    const deck = [{ id: SDK.Cards.Faction1.General }, ...roster.map((id) => ({ id }))];
    const opponentDeck = [{ id: SDK.Cards.Faction4.AltGeneral }, ...roster.map((id) => ({ id }))];
    SDK.GameSetup.setupNewSession(
      session,
      { userId: 'route-player-1', name: 'Route Player 1', deck },
      { userId: 'route-player-2', name: 'Route Player 2', deck: opponentDeck },
      true,
    );

    const board = session.getBoard();
    const wall = board.getTiles().find((tile) => tile.getId() === SDK.Cards.Tile.Wall);
    const wallPosition = wall.getPosition();
    const attackPosition = board.getHexNeighbors(wallPosition).find((position) => board.hasTileAtPosition(position) && !board.getEntityAtPosition(position));
    const unit = session.createCardForIdentifier(SDK.Cards.Neutral.SaberspineTiger);
    unit.setOwnerId(session.getPlayer1Id());
    session._indexCardAsNeeded(unit);
    unit.setPosition(attackPosition);
    unit.setIsPlayed(true);
    unit.setIsRemoved(false);
    board.addCard(unit);

    const originalWallHp = wall.getHP();
    const expectedHit = Math.min(unit.getATK(), originalWallHp);
    const nonlethalScore = scoreWallRouteBenefit(session, unit, wall);
    expect(nonlethalScore).to.equal(expectedHit * 2);
    expect(wall.getHP()).to.equal(originalWallHp);
    expect(wall.getIsActive()).to.equal(true);

    const lethalOnly = new StarterAI(session, session.getPlayer1Id(), 1)
      ._findSortedFilteredAttackObjectivesAndScoresForUnit(unit, unit.getPosition(), true, true);
    expect(lethalOnly.map((entry) => entry.objective)).not.to.include(wall);

    wall.setDamage(originalWallHp - 1);
    const lethalBefore = wall.getHP();
    const lethalScore = scoreWallRouteBenefit(session, unit, wall);
    expect(lethalScore).to.be.greaterThan((lethalBefore) * 2);
    expect(wall.getHP()).to.equal(lethalBefore);
    expect(wall.getIsActive()).to.equal(true);
    wall.setIsRemoved(true);
    expect(scoreWallRouteBenefit(session, unit, wall)).to.equal(0);
  });

  it('allows the General to select an isolated low-health Wall', () => {
    const session = SDK.GameSession.create();
    session.setRuleset('practice-sandbox-hex', 2);
    const roster = [10979, 19052, 19038, 10205, 10001, 19051, 10954, 10206];
    const deck = [{ id: SDK.Cards.Faction1.General }, ...roster.map((id) => ({ id }))];
    const opponentDeck = [{ id: SDK.Cards.Faction4.AltGeneral }, ...roster.map((id) => ({ id }))];
    SDK.GameSetup.setupNewSession(
      session,
      { userId: 'general-wall-player-1', name: 'General Wall Player 1', deck },
      { userId: 'general-wall-player-2', name: 'General Wall Player 2', deck: opponentDeck },
      true,
    );

    const board = session.getBoard();
    const general = session.getGeneralForPlayer1();
    const wall = board.getTileAtPosition({ q: 1, r: 0 });
    general.setPosition({ q: 0, r: 0 });
    general.setReach(2);
    general.refreshExhaustion();
    wall.setDamage(wall.getHP() - 1);
    const ai = new StarterAI(session, session.getPlayer1Id(), 1);
    const objectives = ai._findSortedFilteredAttackObjectivesAndScoresForUnit(general, general.getPosition(), false, false);
    expect(objectives.map((entry) => entry.objective)).to.include(wall);
  });

  it('selects a route-opening lethal Wall over a higher-damage Wall alternative', () => {
    const session = SDK.GameSession.create();
    session.setRuleset('practice-sandbox-hex', 2);
    const roster = [10979, 19052, 19038, 10205, 10001, 19051, 10954, 10206];
    const deck = [{ id: SDK.Cards.Faction1.General }, ...roster.map((id) => ({ id }))];
    const opponentDeck = [{ id: SDK.Cards.Faction4.AltGeneral }, ...roster.map((id) => ({ id }))];
    SDK.GameSetup.setupNewSession(
      session,
      { userId: 'selection-player-1', name: 'Selection Player 1', deck },
      { userId: 'selection-player-2', name: 'Selection Player 2', deck: opponentDeck },
      true,
    );

    const board = session.getBoard();
    const wallA = board.getTileAtPosition({ q: 1, r: 0 });
    const wallB = board.getTileAtPosition({ q: 1, r: 2 });
    expect(wallA.getId()).to.equal(SDK.Cards.Tile.Wall);
    expect(wallB.getId()).to.equal(SDK.Cards.Tile.Wall);
    wallA.setDamage(wallA.getHP() - 1);
    wallB.setDamage(wallB.getHP() - 1);

    const unit = session.createCardForIdentifier(SDK.Cards.Neutral.SaberspineTiger);
    unit.setOwnerId(session.getPlayer1Id());
    session._indexCardAsNeeded(unit);
    unit.setPosition({ q: 0, r: 0 });
    unit.setIsPlayed(true);
    unit.setIsRemoved(false);
    unit.setReach(2);
    unit.refreshExhaustion();
    board.addCard(unit);

    const scoreA = scoreWallRouteBenefit(session, unit, wallA);
    const scoreB = scoreWallRouteBenefit(session, unit, wallB);
    expect(scoreA).to.be.greaterThan(scoreB);
    const ai = new StarterAI(session, session.getPlayer1Id(), 1);
    ai._nextActions = [];
    ai._findAttackActionsForUnit(unit, false);
    expect(ai._nextActions[0]).to.be.instanceOf(SDK.AttackAction);
    expect(ai._nextActions[0].getTarget()).to.equal(wallA);
  });

  it('keeps lethal General attacks ahead of a route-opening Wall', () => {
    const session = SDK.GameSession.create();
    session.setRuleset('practice-sandbox-hex', 2);
    const roster = [10979, 19052, 19038, 10205, 10001, 19051, 10954, 10206];
    const deck = [{ id: SDK.Cards.Faction1.General }, ...roster.map((id) => ({ id }))];
    const opponentDeck = [{ id: SDK.Cards.Faction4.AltGeneral }, ...roster.map((id) => ({ id }))];
    SDK.GameSetup.setupNewSession(
      session,
      { userId: 'lethal-player-1', name: 'Lethal Player 1', deck },
      { userId: 'lethal-player-2', name: 'Lethal Player 2', deck: opponentDeck },
      true,
    );

    const board = session.getBoard();
    const wall = board.getTileAtPosition({ q: 6, r: 0 });
    const attacker = session.createCardForIdentifier(SDK.Cards.Neutral.SaberspineTiger);
    attacker.setOwnerId(session.getPlayer1Id());
    session._indexCardAsNeeded(attacker);
    attacker.setPosition({ q: 7, r: 0 });
    attacker.setIsPlayed(true);
    attacker.setIsRemoved(false);
    attacker.setReach(2);
    attacker.refreshExhaustion();
    board.addCard(attacker);
    wall.setDamage(wall.getHP() - 1);
    const enemyGeneral = session.getGeneralForPlayer2();
    enemyGeneral.setDamage(enemyGeneral.getHP() - 1);

    const ai = new StarterAI(session, session.getPlayer1Id(), 1);
    ai._nextActions = [];
    ai._findAttackActionsForUnit(attacker, true);
    expect(ai._nextActions[0]).to.be.instanceOf(SDK.AttackAction);
    expect(ai._nextActions[0].getTarget()).to.equal(enemyGeneral);
  });

  it('returns the existing legal EndTurn when no non-ending action is available', () => {
    const session = SDK.GameSession.getInstance();
    const playerId = session.getCurrentPlayerId();
    const general = session.getGeneralForPlayerId(playerId);
    general.setExhausted(true);
    const ai = new StarterAI(session, playerId, 1);

    const action = ai.nextAction();
    expect(action).to.be.instanceOf(SDK.EndTurnAction);
    session.validateAction(action, false);
    expect(action.getIsValid()).to.equal(true);
  });
});
