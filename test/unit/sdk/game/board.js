const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');
const { expect } = require('chai');
const _ = require('underscore');
const CONFIG = require('../../../../app/common/config');
const Logger = require('../../../../app/common/logger.coffee');
const SDK = require('../../../../app/sdk.coffee');
const UtilsSDK = require('../../../utils/utils_sdk');
const PlayCardAction = require('../../../../app/sdk/actions/playCardAction.coffee');
const Spell = require('../../../../app/sdk/spells/spell.coffee');
const SpellWrathOfGod = require('../../../../app/sdk/spells/spellWrathOfGod.coffee');
const UtilsGameSession = require('../../../../app/common/utils/utils_game_session.coffee');
const ModifierOpeningGambitDamageNearby = require('../../../../app/sdk/modifiers/modifierOpeningGambitDamageNearby.coffee');
const ModifierDyingWishDamageNearbyEnemies = require('../../../../app/sdk/modifiers/modifierDyingWishDamageNearbyEnemies.coffee');
const ValidatorApplyCardToBoard = require('../../../../app/sdk/validators/validatorApplyCardToBoard.coffee');
const RandomPlayCardSilentlyAction = require('../../../../app/sdk/actions/randomPlayCardSilentlyAction.coffee');

// disable the logger for cleaner test output
Logger.enabled = false;

describe('board', () => {
  beforeEach(() => {
    SDK.GameSession.reset();
    const player1Deck = [
      { id: SDK.Cards.Faction1.General },
    ];

    const player2Deck = [
      { id: SDK.Cards.Faction4.General },
    ];

    UtilsSDK.setupSession(player1Deck, player2Deck, true, true);

    const player1Id = SDK.GameSession.getInstance().getPlayer1Id();
    const player2Id = SDK.GameSession.getInstance().getPlayer2Id();

    UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction1.SilverguardSquire }, 4, 3, player1Id);
    UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction1.SilverguardSquire }, 5, 3, player1Id);
    UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction1.SilverguardSquire }, 4, 4, player1Id);
    UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction1.SilverguardSquire }, 7, 4, player1Id);
    UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction1.SilverguardSquire }, 8, 4, player1Id);

    UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction4.Wraithling }, 3, 1, player2Id);
    UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction4.Wraithling }, 4, 0, player2Id);
    UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction4.Wraithling }, 1, 0, player2Id);
    UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction4.Wraithling }, 0, 0, player2Id);
    UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction4.Wraithling }, 0, 1, player2Id);
    UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction4.Wraithling }, 0, 3, player2Id);
    UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction4.Wraithling }, 1, 1, player1Id);
    UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction4.Wraithling }, 1, 2, player1Id);

    UtilsSDK.applyCardToBoard({ id: SDK.Cards.Tile.Shadow }, 8, 2, player2Id);
  });

  afterEach(() => {
    SDK.GameSession.reset();
  });

  it('expect 0, 0 to be on 9x5 board', () => {
    expect(SDK.GameSession.getInstance().getBoard().isOnBoard({ x: 0, y: 0 })).to.equal(true);
  });

  it('expect 0, 4 to be on 9x5 board', () => {
    expect(SDK.GameSession.getInstance().getBoard().isOnBoard({ x: 0, y: 4 })).to.equal(true);
  });

  it('expect 8, 4 to be on 9x5 board', () => {
    expect(SDK.GameSession.getInstance().getBoard().isOnBoard({ x: 8, y: 4 })).to.equal(true);
  });

  it('expect 8, 0 to be on 9x5 board', () => {
    expect(SDK.GameSession.getInstance().getBoard().isOnBoard({ x: 8, y: 0 })).to.equal(true);
  });

  it('keeps non-hex physical tile enumeration equal to its legacy positions', () => {
    const board = SDK.GameSession.getInstance().getBoard();
    expect(board.getTilePositions()).to.deep.equal(board.getPositions());
  });

  it('expect -1, -1 to be off 9x5 board', () => {
    expect(SDK.GameSession.getInstance().getBoard().isOnBoard({ x: -1, y: -1 })).to.equal(false);
  });

  it('expect 9, 5 to be off 9x5 board', () => {
    expect(SDK.GameSession.getInstance().getBoard().isOnBoard({ x: 9, y: 5 })).to.equal(false);
  });

  it('keeps legacy unit spawn positions around all allied units', () => {
    const session = SDK.GameSession.getInstance();
    const playerId = session.getPlayer1Id();
    UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction4.Wraithling }, 6, 2, playerId);
    const unit = session.createCardForIdentifier(SDK.Cards.Faction1.SilverguardSquire);
    unit.setOwnerId(playerId);

    expect(unit.getValidTargetPositions()).to.deep.include({ x: 7, y: 2 });
  });

  it('enumerates and bounds the 43 axial cells for the hex ruleset', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 1);
    const board = session.getBoard();
    const positions = board.getPositions();
    expect(positions).to.have.length(43);
    expect(new Set(positions.map((position) => `${position.q},${position.r}`)).size).to.equal(43);
    expect(positions.every((position) => board.isOnBoard(position))).to.equal(true);
    expect(board.isOnBoard({ q: 0, r: 0 })).to.equal(true);
    expect(board.isOnBoard({ q: 7, r: 4 })).to.equal(false);
    expect(board.isOnBoard({ q: 0.5, r: 0 })).to.equal(false);
    expect(board.isOnBoard({ x: 0, y: 0 })).to.equal(false);
    expect(board.getTilePositions()).to.have.length(43);
    expect(board.getTilePositions().every((position) => board.hasTileAtPosition(position))).to.equal(true);
  });

  it('keeps version 2 holes logical while excluding them from the tile mask', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const board = session.getBoard();
    const topology = SDK.HexTopology;
    const positions = board.getPositions();
    const tiles = board.getTilePositions();
    const firstHole = topology.renderedToAxial(2, 0);
    const secondHole = topology.renderedToAxial(6, 4);

    expect(positions).to.have.length(43);
    expect(new Set(positions.map((position) => `${position.q},${position.r}`)).size).to.equal(43);
    expect(positions.every((position) => board.isOnBoard(position))).to.equal(true);
    expect(tiles).to.have.length(41);
    expect(board.isOnBoard(firstHole)).to.equal(true);
    expect(board.isOnBoard(secondHole)).to.equal(true);
    expect(board.hasTileAtPosition(firstHole)).to.equal(false);
    expect(board.hasTileAtPosition(secondHole)).to.equal(false);
    expect(board.hasTileAtPosition({ q: 3, r: 2 })).to.equal(true);
    expect(board.hasTileAtPosition({ q: 8, r: 1 })).to.equal(false);
    expect(tiles).not.to.deep.include(firstHole);
    expect(tiles).not.to.deep.include(secondHole);

    const center = topology.renderedToAxial(4, 2);
    const neighborCells = board.getHexNeighbors(center).map((position) => topology.axialToRendered(position))
      .map(({ c, k }) => `${k},${c}`).sort();
    expect(neighborCells).to.deep.equal(['1,3', '1,4', '2,3', '2,5', '3,3', '3,4']);
    expect(board.getHexDistance(firstHole, center)).to.equal(3);
    expect(board.getHexPositionsInRange(firstHole, 1)).to.deep.include(firstHole);
    const path = board.getHexPath(firstHole, center);
    expect(path).to.have.length(board.getHexDistance(firstHole, center));
    expect(path.every((position) => board.isOnBoard(position))).to.equal(true);
    expect(board.isOnBoard({ q: 8, r: 1 })).to.equal(false);
  });

  it('clips open segments against hex interiors without counting vertex contact', () => {
    const topology = SDK.HexTopology;
    const center = { q: 0, r: 0 };
    expect(topology.segmentEntersHexInterior({ q: -2, r: 0 }, { q: 2, r: 0 }, center)).to.equal(true);
    expect(topology.segmentEntersHexInterior({ q: -2, r: 1 }, { q: 2, r: 1 }, center)).to.equal(false);
    expect(topology.segmentEntersHexInterior({ q: 0, r: 1 }, { q: 1, r: -1 }, center)).to.equal(false);
    expect(topology.segmentEntersHexInterior({ q: 0, r: -2 }, { q: 0, r: 2 }, center)).to.equal(true);
    expect(topology.isOnHexAxis({ q: 0, r: 0 }, { q: 3, r: 0 })).to.equal(true);
    expect(topology.isOnHexAxis({ q: 0, r: 0 }, { q: 2, r: 1 })).to.equal(false);
  });

  it('restricts v2 ranged attacks to six axes and blocks intervening Walls', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const board = session.getBoard();
    const attacker = board.getUnits().find((unit) => unit.getOwnerId() === session.getPlayer1Id());
    attacker.setPosition({ q: 4, r: 0 });
    attacker.setReach(3);
    attacker.setAttackType('ranged');
    const enemy = session.createCardForIdentifier(SDK.Cards.Faction4.Wraithling);
    enemy.setOwnerId(session.getPlayer2Id());
    enemy.setPosition({ q: 7, r: 0 });
    enemy.setIsPlayed(true);
    enemy.setIsRemoved(false);
    board.addCard(enemy);
    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, enemy)).to.equal(true);
    const beyondReach = session.createCardForIdentifier(SDK.Cards.Faction4.Wraithling);
    beyondReach.setOwnerId(session.getPlayer2Id());
    beyondReach.setPosition({ q: 8, r: 0 });
    beyondReach.setIsPlayed(true);
    beyondReach.setIsRemoved(false);
    board.addCard(beyondReach);
    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, beyondReach)).to.equal(false);

    const offAxis = session.createCardForIdentifier(SDK.Cards.Faction4.Wraithling);
    offAxis.setOwnerId(session.getPlayer2Id());
    offAxis.setPosition({ q: 6, r: 1 });
    offAxis.setIsPlayed(true);
    offAxis.setIsRemoved(false);
    board.addCard(offAxis);
    attacker.getAttackRange().flushCachedState();
    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, offAxis)).to.equal(false);

    const wall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    session.applyCardToBoard(wall, 6, 0);
    attacker.getAttackRange().flushCachedState();
    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, enemy)).to.equal(false);
    enemy.setPosition({ q: 6, r: 0 });
    attacker.getAttackRange().flushCachedState();
    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, enemy)).to.equal(true);
    const interveningWall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    session.applyCardToBoard(interveningWall, 5, 0);
    attacker.getAttackRange().flushCachedState();
    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, enemy)).to.equal(false);
    interveningWall.setIsRemoved(true);

    offAxis.setIsRemoved(true);
    attacker.setPosition({ q: 4, r: 1 });
    enemy.setPosition({ q: 7, r: 1 });
    const oddRowWall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    session.applyCardToBoard(oddRowWall, 6, 1);
    attacker.getAttackRange().flushCachedState();
    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, enemy)).to.equal(false);
    enemy.setPosition({ q: 6, r: 1 });
    attacker.getAttackRange().flushCachedState();
    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, enemy)).to.equal(true);
  });

  it('lets v2 lobbed attacks target in-range tiles through units and Walls', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const board = session.getBoard();
    const attacker = session.getGeneralForPlayer1();
    attacker.setPosition({ q: 4, r: 0 });
    attacker.setReach(3);
    attacker.setAttackType('lobbed');
    const adjacent = session.createCardForIdentifier(SDK.Cards.Faction4.Wraithling);
    adjacent.setOwnerId(session.getPlayer2Id());
    adjacent.setPosition({ q: 5, r: 0 });
    adjacent.setIsPlayed(true);
    adjacent.setIsRemoved(false);
    board.addCard(adjacent);
    const blocked = session.createCardForIdentifier(SDK.Cards.Faction4.Wraithling);
    blocked.setOwnerId(session.getPlayer2Id());
    blocked.setPosition({ q: 7, r: 0 });
    blocked.setIsPlayed(true);
    blocked.setIsRemoved(false);
    board.addCard(blocked);
    const wall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    session.applyCardToBoard(wall, 6, 0);

    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, adjacent)).to.equal(true);
    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, blocked)).to.equal(true);
    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, wall)).to.equal(true);
    wall.setIsRemoved(true);
    const blocker = session.createCardForIdentifier(SDK.Cards.Faction1.SilverguardSquire);
    blocker.setOwnerId(session.getPlayer1Id());
    blocker.setPosition({ q: 6, r: 0 });
    blocker.setIsPlayed(true);
    blocker.setIsRemoved(false);
    board.addCard(blocker);
    attacker.getAttackRange().flushCachedState();
    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, blocked)).to.equal(true);
  });

  it('resolves v2 stat-driven area attacks per victim with radius and Wall obstruction', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const board = session.getBoard();
    const attacker = session.getGeneralForPlayer1();
    attacker.setPosition({ q: 4, r: 0 });
    attacker.setReach(3);
    attacker.setAttackType('area');
    attacker.atk = 2;
    attacker.refreshExhaustion();
    for (const unit of board.getUnits()) {
      if (unit !== attacker) unit.setIsRemoved(true);
    }
    const addUnit = (ownerId, position) => {
      const unit = session.createCardForIdentifier(SDK.Cards.Faction4.Wraithling);
      unit.setOwnerId(ownerId);
      unit.setPosition(position);
      unit.setIsPlayed(true);
      unit.setIsRemoved(false);
      board.addCard(unit);
      return unit;
    };
    const initiator = addUnit(session.getPlayer2Id(), { q: 5, r: 0 });
    const wallOccupant = addUnit(session.getPlayer2Id(), { q: 6, r: 0 });
    const blockedEnemy = addUnit(session.getPlayer2Id(), { q: 7, r: 0 });
    const distantEnemy = addUnit(session.getPlayer2Id(), { q: 8, r: 0 });
    const offAxisEnemy = addUnit(session.getPlayer2Id(), { q: 5, r: 2 });
    const ally = addUnit(session.getPlayer1Id(), { q: 5, r: 1 });
    const neutralUnit = addUnit(null, { q: 4, r: 2 });
    const wall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    wall.setPosition({ q: 6, r: 0 });
    wall.setIsPlayed(true);
    wall.setIsRemoved(false);
    board.addCard(wall);
    const hpBefore = [initiator.getHP(), wallOccupant.getHP(), blockedEnemy.getHP(), ally.getHP(), wall.getHP()];

    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, initiator)).to.equal(true);
    const action = attacker.actionAttack(initiator);
    session.executeAction(action);

    expect(initiator.getHP()).to.equal(Math.max(hpBefore[0] - 2, 0));
    expect(wallOccupant.getHP()).to.equal(Math.max(hpBefore[1] - 2, 0));
    expect(wall.getHP()).to.equal(hpBefore[4] - 2);
    expect(blockedEnemy.getHP()).to.equal(hpBefore[2]);
    expect(ally.getHP()).to.equal(hpBefore[3]);
    expect(neutralUnit.getHP()).to.equal(neutralUnit.getMaxHP());
    expect(distantEnemy.getHP()).to.equal(distantEnemy.getMaxHP());
    expect(offAxisEnemy.getHP()).to.equal(Math.max(offAxisEnemy.getMaxHP() - 2, 0));
    expect(attacker.getAttacksMade()).to.equal(1);
  });

  it('allows a neutral Wall to initiate a v2 area attack', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const board = session.getBoard();
    const attacker = session.getGeneralForPlayer1();
    attacker.setPosition({ q: 4, r: 0 });
    attacker.setReach(2);
    attacker.setAttackType('area');
    attacker.atk = 2;
    attacker.refreshExhaustion();
    for (const unit of board.getUnits()) {
      if (unit !== attacker) unit.setIsRemoved(true);
    }
    const enemy = session.createCardForIdentifier(SDK.Cards.Faction4.Wraithling);
    enemy.setOwnerId(session.getPlayer2Id());
    enemy.setPosition({ q: 5, r: 0 });
    enemy.setIsPlayed(true);
    enemy.setIsRemoved(false);
    board.addCard(enemy);
    const wall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    wall.setPosition({ q: 6, r: 0 });
    wall.setIsPlayed(true);
    wall.setIsRemoved(false);
    board.addCard(wall);
    const enemyHp = enemy.getHP();
    const wallHp = wall.getHP();

    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, wall)).to.equal(true);
    session.executeAction(attacker.actionAttack(wall));

    expect(enemy.getHP()).to.equal(Math.max(enemyHp - 2, 0));
    expect(wall.getHP()).to.equal(wallHp - 2);
    expect(attacker.getAttacksMade()).to.equal(1);
  });

  it('does not let a boundary-only Wall contact block an area victim', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const board = session.getBoard();
    const topology = SDK.HexTopology;
    const origin = { q: 2, r: 1 };
    const targetPosition = { q: 6, r: 1 };
    const boundaryWallPosition = { q: 4, r: 0 };
    expect(topology.segmentEntersHexInterior(origin, targetPosition, boundaryWallPosition)).to.equal(false);
    const attacker = session.getGeneralForPlayer1();
    attacker.setPosition(origin);
    attacker.setReach(4);
    attacker.setAttackType('area');
    attacker.atk = 2;
    attacker.refreshExhaustion();
    for (const unit of board.getUnits()) {
      if (unit !== attacker) unit.setIsRemoved(true);
    }
    const target = session.createCardForIdentifier(SDK.Cards.Faction4.Wraithling);
    target.setOwnerId(session.getPlayer2Id());
    target.setPosition(targetPosition);
    target.setIsPlayed(true);
    target.setIsRemoved(false);
    board.addCard(target);
    const wall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    wall.setPosition(boundaryWallPosition);
    wall.setIsPlayed(true);
    wall.setIsRemoved(false);
    board.addCard(wall);
    const targetHp = target.getHP();

    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, target)).to.equal(true);
    session.executeAction(attacker.actionAttack(target));

    expect(target.getHP()).to.equal(Math.max(targetHp - 2, 0));
  });

  it('preserves v1 single-target behavior for explicitly configured area stats', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 1);
    const board = session.getBoard();
    const attacker = session.getGeneralForPlayer1();
    attacker.setPosition({ q: 4, r: 0 });
    attacker.setReach(3);
    attacker.setAttackType('area');
    attacker.atk = 2;
    attacker.refreshExhaustion();
    for (const unit of board.getUnits()) {
      if (unit !== attacker) unit.setIsRemoved(true);
    }
    const addEnemy = (position) => {
      const unit = session.createCardForIdentifier(SDK.Cards.Faction4.Wraithling);
      unit.setOwnerId(session.getPlayer2Id());
      unit.setPosition(position);
      unit.setIsPlayed(true);
      unit.setIsRemoved(false);
      board.addCard(unit);
      return unit;
    };
    const target = addEnemy({ q: 5, r: 0 });
    const otherEnemy = addEnemy({ q: 6, r: 0 });
    const targetHp = target.getHP();
    const otherHp = otherEnemy.getHP();

    session.executeAction(attacker.actionAttack(target));

    expect(target.getHP()).to.equal(Math.max(targetHp - 2, 0));
    expect(otherEnemy.getHP()).to.equal(otherHp);
  });

  it('preserves legacy Blast line collateral without treating it as stat-driven area', () => {
    const session = SDK.GameSession.getInstance();
    const board = session.getBoard();
    for (const unit of board.getUnits()) unit.setIsRemoved(true);
    const attacker = UtilsSDK.applyCardToBoard(
      { id: SDK.Cards.Faction3.Pyromancer }, 4, 0, session.getPlayer1Id());
    const addEnemy = (position) => {
      const unit = session.createCardForIdentifier(SDK.Cards.Faction4.Wraithling);
      unit.setOwnerId(session.getPlayer2Id());
      unit.setPosition(position);
      unit.setIsPlayed(true);
      unit.setIsRemoved(false);
      board.addCard(unit);
      return unit;
    };
    attacker.setReach(3);
    attacker.refreshExhaustion();
    const primary = addEnemy({ x: 5, y: 0 });
    const lineCollateral = addEnemy({ x: 6, y: 0 });
    const offAxis = addEnemy({ x: 5, y: 1 });
    const hpBefore = [primary.getHP(), lineCollateral.getHP(), offAxis.getHP()];

    expect(attacker.getAttackType()).to.equal('area');
    expect(attacker.hasOwnProperty('attackType')).to.equal(false);
    session.executeAction(attacker.actionAttack(primary));

    expect(primary.getHP()).to.equal(Math.max(hpBefore[0] - attacker.getATK(), 0));
    expect(lineCollateral.getHP()).to.equal(Math.max(hpBefore[1] - attacker.getATK(), 0));
    expect(offAxis.getHP()).to.equal(hpBefore[2]);
  });

  it('resolves Maw follow-up damage to an adjacent enemy Unit sharing a Wall', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const board = session.getBoard();
    const maw = session.createCardForIdentifier(SDK.Cards.Neutral.Maw);
    maw.setOwnerId(session.getPlayer1Id());
    maw.setPosition({ q: 4, r: 2 });
    maw.setIsPlayed(true);
    maw.setIsRemoved(false);
    board.addCard(maw);

    const targetPosition = { q: 5, r: 2 };
    const target = session.createCardForIdentifier(SDK.Cards.Faction1.SilverguardSquire);
    target.setOwnerId(session.getPlayer2Id());
    target.setPosition(targetPosition);
    target.setIsPlayed(true);
    target.setIsRemoved(false);
    board.addCard(target);
    const wall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    session.applyCardToBoard(wall, targetPosition.q, targetPosition.r);

    const followup = maw.getCurrentFollowupCard();
    expect(followup.getValidTargetPositions()).to.deep.include(targetPosition);
    const initialWallHp = wall.getHP();
    let queuedDamageAction = null;
    const executeAction = session.executeAction;
    session.executeAction = (action) => { queuedDamageAction = action; };
    try {
      followup.onApplyEffectToBoardTile(board, targetPosition.q, targetPosition.r, null);
    } finally {
      session.executeAction = executeAction;
    }
    expect(queuedDamageAction.getTarget()).to.equal(target);
    expect(queuedDamageAction.getDamageAmount()).to.equal(2);
    expect(wall.getHP()).to.equal(initialWallHp);
  });

  it('delivers circular area effects along direct segments while allowing off-axis candidates', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const board = session.getBoard();
    const wall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    session.applyCardToBoard(wall, 6, 0);
    const spell = new Spell(session);
    spell.radius = 3;
    const center = { q: 4, r: 0 };
    const positions = spell._findApplyEffectPositions(center, null);
    expect(positions).not.to.deep.include({ q: 7, r: 0 });
    expect(positions).to.deep.include({ q: 6, r: 0 });
    expect(positions).to.deep.include({ q: 5, r: 2 });
    expect(board.getHexDistance(center, { q: 5, r: 2 })).to.equal(3);
  });

  it('blocks ordinary version 2 movement through or onto holes while Flying can use them', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const board = session.getBoard();
    const hole = { q: 2, r: 0 };
    const beyondHole = { q: 3, r: 0 };
    const ordinary = session.createCardForIdentifier(SDK.Cards.Faction1.SilverguardSquire);
    ordinary.setOwnerId(session.getPlayer1Id());
    ordinary.setPosition({ q: 1, r: 0 });
    ordinary.setSpeed(2);
    const ordinaryRange = ordinary.getMovementRange();

    expect(ordinaryRange.getIsPositionValid(board, ordinary, hole)).to.equal(false);
    expect(ordinaryRange.getPathTo(board, ordinary, hole)).to.deep.equal([]);
    expect(ordinaryRange.getIsPositionValid(board, ordinary, beyondHole)).to.equal(false);
    expect(ordinaryRange.getPathTo(board, ordinary, beyondHole)).to.deep.equal([]);

    const flying = session.createCardForIdentifier(SDK.Cards.Faction1.SilverguardSquire);
    flying.setOwnerId(session.getPlayer1Id());
    flying.setPosition({ q: 1, r: 0 });
    flying.setSpeed(2);
    flying.hasActiveModifierClass = (modifierClass) => modifierClass === SDK.ModifierFlying;
    const flyingRange = flying.getMovementRange();
    expect(flyingRange.getIsPositionValid(board, flying, hole)).to.equal(true);
    expect(flyingRange.getPathTo(board, flying, hole)).to.deep.equal([{ q: 1, r: 0 }, hole]);
    expect(flyingRange.getIsPositionValid(board, flying, beyondHole)).to.equal(true);
    expect(flyingRange.getPathTo(board, flying, beyondHole)).to.deep.equal([{ q: 1, r: 0 }, hole, beyondHole]);

    const secondHole = { q: 4, r: 4 };
    const secondBeyondHole = { q: 5, r: 4 };
    const ordinaryNearSecondHole = session.createCardForIdentifier(SDK.Cards.Faction1.SilverguardSquire);
    ordinaryNearSecondHole.setPosition({ q: 3, r: 4 });
    ordinaryNearSecondHole.setSpeed(2);
    const ordinaryNearSecondHoleRange = ordinaryNearSecondHole.getMovementRange();
    expect(ordinaryNearSecondHoleRange.getIsPositionValid(board, ordinaryNearSecondHole, secondHole)).to.equal(false);
    expect(ordinaryNearSecondHoleRange.getPathTo(board, ordinaryNearSecondHole, secondBeyondHole)).to.deep.equal([]);

    const flyingNearSecondHole = session.createCardForIdentifier(SDK.Cards.Faction1.SilverguardSquire);
    flyingNearSecondHole.setPosition({ q: 3, r: 4 });
    flyingNearSecondHole.setSpeed(2);
    flyingNearSecondHole.hasActiveModifierClass = (modifierClass) => modifierClass === SDK.ModifierFlying;
    const flyingNearSecondHoleRange = flyingNearSecondHole.getMovementRange();
    expect(flyingNearSecondHoleRange.getIsPositionValid(board, flyingNearSecondHole, secondHole)).to.equal(true);
    expect(flyingNearSecondHoleRange.getPathTo(board, flyingNearSecondHole, secondBeyondHole)).to.deep.equal([
      { q: 3, r: 4 }, secondHole, secondBeyondHole,
    ]);
  });

  it('blocks ordinary movement on living Walls and reopens the retained tile after death', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const board = session.getBoard();
    const wallPosition = { q: 6, r: 0 };
    const wall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    session.applyCardToBoard(wall, wallPosition.q, wallPosition.r);
    const ordinary = board.getUnits().find((unit) => unit.getOwnerId() === session.getPlayer1Id());
    ordinary.setPosition({ q: 5, r: 0 });
    ordinary.setSpeed(2);
    expect(ordinary.getMovementRange().getIsPositionValid(board, ordinary, wallPosition)).to.equal(false);
    expect(ordinary.getMovementRange().getPathTo(board, ordinary, { q: 7, r: 0 }).some((position) => board.positionsEqual(position, wallPosition))).to.equal(false);
    const blockedMove = ordinary.actionMove(wallPosition);
    session.validateAction(blockedMove, false);
    expect(blockedMove.getIsValid()).to.equal(false);

    const flying = board.getUnits().find((unit) => unit.getOwnerId() === session.getPlayer1Id() && unit !== ordinary);
    flying.setPosition({ q: 5, r: 0 });
    flying.setSpeed(2);
    flying.hasActiveModifierClass = (modifierClass) => modifierClass === SDK.ModifierFlying;
    expect(flying.getMovementRange().getPathTo(board, flying, { q: 7, r: 0 })).to.deep.equal([
      { q: 5, r: 0 }, wallPosition, { q: 7, r: 0 },
    ]);

    const summon = session.createCardForIdentifier(SDK.Cards.Faction1.SilverguardSquire);
    summon.setOwnerId(session.getPlayer1Id());
    session.getGeneralForPlayer1().setPosition({ q: 5, r: 1 });
    expect(board.isValidGeneralAdjacentSpawnPosition(summon, wallPosition)).to.equal(false);
    const damageWall = new SDK.DamageAction(session);
    damageWall.setTarget(wall);
    damageWall.setDamageAmount(10);
    UtilsSDK.executeActionWithoutValidation(damageWall);
    expect(board.getTileAtPosition(wallPosition) == null).to.equal(true);
    expect(board.hasTileAtPosition(wallPosition)).to.equal(true);
    expect(board.isValidGeneralAdjacentSpawnPosition(summon, wallPosition)).to.equal(true);
    expect(ordinary.getAttackRange().getIsValidTarget(board, ordinary, wall)).to.equal(false);
    ordinary.getMovementRange().flushCachedState();
    expect(ordinary.getMovementRange().getPathTo(board, ordinary, wallPosition)).not.to.deep.equal([]);
  });

  it('lets both players legally attack a neutral Wall without Barrier effects', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const board = session.getBoard();
    const wallPosition = { q: 6, r: 0 };
    const wall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    session.applyCardToBoard(wall, wallPosition.q, wallPosition.r);
    expect(wall.getInherentModifiers()).to.have.length(0);

    const attackers = [
      { ownerId: session.getPlayer1Id(), position: { q: 5, r: 0 } },
      { ownerId: session.getPlayer2Id(), position: { q: 7, r: 0 } },
    ];
    for (const { ownerId, position } of attackers) {
      session.getPlayer1().setIsCurrentPlayer(ownerId === session.getPlayer1Id());
      session.getPlayer2().setIsCurrentPlayer(ownerId === session.getPlayer2Id());
      const attacker = board.getUnits().find((unit) => unit.getOwnerId() === ownerId);
      attacker.atk = 2;
      attacker.setReach(2);
      attacker.setPosition(position);
      attacker.refreshExhaustion();
      expect(attacker.getAttackRange().getIsValidTarget(board, attacker, wall)).to.equal(true);

      const hpBefore = wall.getHP();
      const attack = attacker.actionAttack(wall);
      session.executeAction(attack);
      expect(attack.getIsValid()).to.equal(true);
      expect(wall.getHP()).to.equal(hpBefore - 2);
    }
  });

  it('allows Flying to stop on a Wall and resolves direct attacks by co-located target priority', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const board = session.getBoard();
    const attacker = session.getGeneralForPlayer1();
    const enemy = board.getUnits().find((unit) => unit.getOwnerId() === session.getPlayer2Id());
    const wall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    session.applyCardToBoard(wall, 6, 0);

    attacker.setPosition({ q: 5, r: 0 });
    attacker.setSpeed(1);
    attacker.hasActiveModifierClass = (modifierClass) => modifierClass === SDK.ModifierFlying;
    attacker.getMovementRange().flushCachedState();
    expect(attacker.getMovementRange().getIsPositionValid(board, attacker, { q: 6, r: 0 })).to.equal(true);

    enemy.setPosition({ q: 6, r: 0 });
    attacker.setReach(2);
    attacker.refreshExhaustion();
    expect(attacker.getAttackRange().getValidTargets(board, attacker)).to.include(enemy);
    expect(attacker.getAttackRange().getValidTargets(board, attacker)).not.to.include(wall);
    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, wall)).to.equal(false);
    const explicitWallAttack = attacker.actionAttack(wall);
    session.validateAction(explicitWallAttack, false);
    expect(explicitWallAttack.getIsValid()).to.equal(false);
    expect(attacker.actionAttackEntityAtPosition({ q: 6, r: 0 }).getTarget()).to.equal(enemy);

    enemy.setOwnerId(session.getPlayer1Id());
    attacker.getAttackRange().flushCachedState();
    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, enemy)).to.equal(false);
    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, wall)).to.equal(true);
    expect(attacker.actionAttackEntityAtPosition({ q: 6, r: 0 }).getTarget()).to.equal(wall);

    enemy.setPosition({ q: 7, r: 0 });
    attacker.getAttackRange().flushCachedState();
    expect(attacker.getAttackRange().getIsValidTarget(board, attacker, enemy)).to.equal(false);
    expect(attacker.getAttackRange().getTargetAtPosition(board, attacker, { q: 7, r: 0 })).to.equal(null);
  });

  it('damages co-located enemy Units and Walls independently while excluding allied Units from v2 area damage', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const board = session.getBoard();
    const source = session.getGeneralForPlayer1();
    const enemy = session.getGeneralForPlayer2();
    const ally = board.getUnits().find((unit) => unit.getOwnerId() === session.getPlayer1Id() && !unit.getIsGeneral());
    const wallPosition = { q: 6, r: 0 };
    const allyPosition = { q: 5, r: 0 };
    source.setPosition({ q: 5, r: 1 });
    enemy.setPosition(wallPosition);
    ally.setPosition(allyPosition);
    const wall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    wall.setPosition(wallPosition);
    wall.setIsPlayed(true);
    wall.setIsRemoved(false);
    board.addCard(wall);
    const adjacentWallPosition = { q: 6, r: 1 };
    const adjacentWall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    adjacentWall.setPosition(adjacentWallPosition);
    adjacentWall.setIsPlayed(true);
    adjacentWall.setIsRemoved(false);
    board.addCard(adjacentWall);

    const enemyHp = enemy.getHP();
    const allyHp = ally.getHP();
    const wallHp = wall.getHP();
    const modifier = new ModifierOpeningGambitDamageNearby();
    modifier.setGameSession(session);
    modifier.setCard(source);
    modifier.damageAmount = 2;
    const queuedActions = [];
    const executeAction = session.executeAction;
    session.executeAction = (action) => queuedActions.push(action);
    try {
      modifier.onOpeningGambit();
    } finally {
      session.executeAction = executeAction;
    }
    expect(queuedActions.map((action) => action.getTarget())).to.include.members([enemy, wall, adjacentWall]);
    for (const action of queuedActions) {
      UtilsSDK.executeActionWithoutValidation(action);
    }

    expect(enemy.getHP()).to.equal(enemyHp - 2);
    expect(wall.getHP()).to.equal(wallHp - 2);
    expect(ally.getHP()).to.equal(allyHp);
  });

  it('damages neighboring enemy Units and Walls with Dying Wish while excluding allied Units in v2', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const board = session.getBoard();
    const source = session.getGeneralForPlayer1();
    const enemy = session.getGeneralForPlayer2();
    const ally = board.getUnits().find((unit) => unit.getOwnerId() === session.getPlayer1Id() && !unit.getIsGeneral());
    source.setPosition({ q: 5, r: 1 });
    enemy.setPosition({ q: 6, r: 0 });
    ally.setPosition({ q: 5, r: 0 });
    const wall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    wall.setPosition({ q: 6, r: 1 });
    wall.setIsPlayed(true);
    wall.setIsRemoved(false);
    board.addCard(wall);

    const hpBefore = [enemy.getHP(), ally.getHP(), wall.getHP()];
    const modifier = new ModifierDyingWishDamageNearbyEnemies();
    modifier.setGameSession(session);
    modifier.setCard(source);
    modifier.damageAmount = 2;
    const queuedActions = [];
    const executeAction = session.executeAction;
    session.executeAction = (action) => queuedActions.push(action);
    try {
      modifier.onDyingWish();
    } finally {
      session.executeAction = executeAction;
    }
    expect(queuedActions.map((action) => action.getTarget())).to.include.members([enemy, wall]);
    expect(queuedActions.map((action) => action.getTarget())).not.to.include(ally);
    for (const action of queuedActions) UtilsSDK.executeActionWithoutValidation(action);
    expect(enemy.getHP()).to.equal(hpBefore[0] - 2);
    expect(wall.getHP()).to.equal(hpBefore[2] - 2);
    expect(ally.getHP()).to.equal(hpBefore[1]);
  });

  it('applies hole movement permissions in validation and move action resolution', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const ordinary = session.createCardForIdentifier(SDK.Cards.Faction1.SilverguardSquire);
    ordinary.setOwnerId(session.getPlayer1Id());
    ordinary.setPosition({ q: 1, r: 0 });
    ordinary.setSpeed(1);
    ordinary.refreshExhaustion();
    const invalidMove = ordinary.actionMove({ q: 2, r: 0 });
    session.validateAction(invalidMove, false);
    expect(invalidMove.getIsValid()).to.equal(false);

    const flying = session.getGeneralForPlayer1();
    flying.setPosition({ q: 3, r: 0 });
    flying.setSpeed(1);
    flying.refreshExhaustion();
    flying.hasActiveModifierClass = (modifierClass) => modifierClass === SDK.ModifierFlying;
    const flyingMove = flying.actionMove({ q: 2, r: 0 });
    session.validateAction(flyingMove, false);
    expect(flyingMove.getIsValid()).to.equal(true);
    const serializedMove = JSON.parse(session.serializeToJSON(flyingMove));
    const replayedMove = session.deserializeActionFromFirebase(serializedMove);
    expect(replayedMove.getTargetPosition()).to.deep.equal({ q: 2, r: 0 });
    expect(replayedMove.getPath()).to.deep.equal([{ q: 3, r: 0 }, { q: 2, r: 0 }]);
    session.executeAction(replayedMove);
    expect(replayedMove.getIsValid()).to.equal(true);
    expect(flying.getPosition()).to.deep.equal({ q: 2, r: 0 });
    expect(session.getBoard().getUnitAtPosition({ q: 2, r: 0 })).to.equal(flying);
    expect(session.getBoard().hasTileAtPosition({ q: 2, r: 0 })).to.equal(false);
  });

  it('rejects hole summons for every movement class while preserving adjacency rules', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const board = session.getBoard();
    const hole = { q: 2, r: 0 };
    const general = session.getGeneralForPlayer1();
    general.setPosition({ q: 0, r: 0 });
    const unit = session.createCardForIdentifier(SDK.Cards.Faction1.SilverguardSquire);
    unit.setOwnerId(session.getPlayer1Id());

    expect(board.hasTileAtPosition(hole)).to.equal(false);
    expect(board.isValidGeneralAdjacentSpawnPosition(unit, hole)).to.equal(false);
    general.setPosition({ q: 1, r: 0 });
    expect(board.isValidGeneralAdjacentSpawnPosition(unit, hole)).to.equal(false);

    for (const movementClass of [SDK.ModifierFlying, SDK.ModifierPhasing]) {
      unit.hasActiveModifierClass = (modifierClass) => modifierClass === movementClass;
      expect(board.isValidGeneralAdjacentSpawnPosition(unit, hole)).to.equal(false);
    }
    unit.hasActiveModifierClass = () => false;
    expect(board.isValidGeneralAdjacentSpawnPosition(unit, { q: 0, r: 0 })).to.equal(true);
  });

  it('rejects version 2 summon actions on holes and preserves version 1 hole placement', () => {
    const session = SDK.GameSession.getInstance();
    const playerId = session.getPlayer1Id();
    const hole = { q: 2, r: 0 };
    const unit = session.createCardForIdentifier(SDK.Cards.Neutral.BloodtearAlchemist);
    unit.setOwnerId(playerId);
    const action = new SDK.PlayCardAction(session, playerId, hole, { id: unit.getId() });
    const validator = new ValidatorApplyCardToBoard(session);

    session.setRuleset('practice-sandbox-hex', 2);
    validator.onValidateAction({ action });
    expect(action.getIsValid()).to.equal(false);

    const randomAction = new RandomPlayCardSilentlyAction(session, playerId, { id: unit.getId() });
    randomAction.setTargetPosition(hole);
    validator.onValidateAction({ action: randomAction });
    expect(randomAction.getIsValid()).to.equal(false);

    const missingCardAction = new SDK.ApplyCardToBoardAction(session, playerId, hole, null);
    expect(() => validator.onValidateAction({ action: missingCardAction })).not.to.throw();
    expect(missingCardAction.getIsValid()).to.equal(false);

    session.setRuleset('practice-sandbox-hex', 1);
    session.getGeneralForPlayerId(playerId).setPosition({ q: 1, r: 0 });
    expect(session.getBoard().hasTileAtPosition(hole)).to.equal(true);
    expect(session.getBoard().getValidGeneralAdjacentSpawnPositions(unit)).to.include.deep.members([hole]);
    const legacyHoleAction = new PlayCardAction(session, playerId, hole, { id: unit.getId() });
    validator.onValidateAction({ action: legacyHoleAction });
    expect(legacyHoleAction.getIsValid(), legacyHoleAction.getValidationMessage()).to.equal(true);
  });

  it('excludes version 2 holes from shared smart Unit spawn candidates', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const unit = session.createCardForIdentifier(SDK.Cards.Neutral.BloodtearAlchemist);
    unit.setOwnerId(session.getPlayer1Id());
    expect(UtilsGameSession.getSmartSpawnPositionsFromPattern(session, { q: 0, r: 0 }, [{ q: 2, r: 0 }], unit)).to.deep.equal([]);
  });

  it('lets Flying traverse an occupied hole but does not allow ending there', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const board = session.getBoard();
    const hole = { q: 2, r: 0 };
    const flying = session.createCardForIdentifier(SDK.Cards.Faction1.SilverguardSquire);
    flying.setPosition({ q: 1, r: 0 });
    flying.setSpeed(2);
    flying.hasActiveModifierClass = (modifierClass) => modifierClass === SDK.ModifierFlying;
    const range = flying.getMovementRange();
    const getObstructionAtPositionForEntity = board.getObstructionAtPositionForEntity;
    const occupant = { getIsSameTeamAs: () => false };
    board.getObstructionAtPositionForEntity = (position, entity) =>
      position.q === hole.q && position.r === hole.r ? occupant : getObstructionAtPositionForEntity.call(board, position, entity);
    try {
      expect(range.getPathTo(board, flying, hole)).to.deep.equal([]);
      expect(range.getPathTo(board, flying, { q: 3, r: 0 })).to.deep.equal([
        { q: 1, r: 0 }, hole, { q: 3, r: 0 },
      ]);
    } finally {
      board.getObstructionAtPositionForEntity = getObstructionAtPositionForEntity;
    }
  });

  it('lets Phasing cross enemy units in version 2 without allowing occupied endpoints', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const board = session.getBoard();
    const enemyPosition = { q: 2, r: 0 };
    const destination = { q: 3, r: 0 };
    const wallPosition = { q: 1, r: 1 };
    const phasing = session.createCardForIdentifier(SDK.Cards.Faction1.SilverguardSquire);
    phasing.setPosition({ q: 1, r: 0 });
    phasing.setSpeed(2);
    phasing.hasActiveModifierClass = (modifierClass) => modifierClass === SDK.ModifierPhasing;
    const enemy = { getType: () => SDK.CardType.Unit, getIsSameTeamAs: () => false };
    const wall = {
      getType: () => SDK.CardType.Tile,
      getId: () => SDK.Cards.Tile.Wall,
      getIsSameTeamAs: () => false,
    };
    const originalGetObstruction = board.getObstructionAtPositionForEntity;
    board.getObstructionAtPositionForEntity = (position, entity) =>
      position.q === enemyPosition.q && position.r === enemyPosition.r ? enemy
        : position.q === wallPosition.q && position.r === wallPosition.r ? wall
          : originalGetObstruction.call(board, position, entity);

    try {
      const range = phasing.getMovementRange();
      expect(range.getPathTo(board, phasing, enemyPosition)).to.deep.equal([]);
      expect(range.getPathTo(board, phasing, destination)).to.deep.equal([
        { q: 1, r: 0 }, enemyPosition, destination,
      ]);
      expect(range.getPathTo(board, phasing, wallPosition)).to.deep.equal([
        { q: 1, r: 0 }, wallPosition,
      ]);

      phasing.hasActiveModifierClass = (modifierClass) => modifierClass === SDK.ModifierFlying;
      phasing.getMovementRange().flushCachedState();
      expect(phasing.getMovementRange().getPathTo(board, phasing, destination)).to.deep.equal([]);
    } finally {
      board.getObstructionAtPositionForEntity = originalGetObstruction;
    }
  });

  it('keeps the Phasing movement buff inactive in version 1 and legacy rules', () => {
    const session = SDK.GameSession.getInstance();
    const phasingModifier = new SDK.ModifierPhasing(session);
    expect(phasingModifier.getIsAllowedToBeActiveForCache()).to.equal(false);
    session.setRuleset('practice-sandbox-hex', 1);
    expect(phasingModifier.getIsAllowedToBeActiveForCache()).to.equal(false);

    session.setRuleset('practice-sandbox-hex', 2);
    expect(phasingModifier.getIsAllowedToBeActiveForCache()).to.equal(true);
  });

  it('preserves version 1 movement onto positions that are holes in version 2', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 1);
    const board = session.getBoard();
    const unit = session.createCardForIdentifier(SDK.Cards.Faction1.SilverguardSquire);
    unit.setPosition({ q: 1, r: 0 });
    unit.setSpeed(1);

    expect(board.hasTileAtPosition({ q: 2, r: 0 })).to.equal(true);
    expect(unit.getMovementRange().getIsPositionValid(board, unit, { q: 2, r: 0 })).to.equal(true);
    expect(unit.getMovementRange().getPathTo(board, unit, { q: 2, r: 0 })).to.deep.equal([
      { q: 1, r: 0 }, { q: 2, r: 0 },
    ]);

    const wall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    session.applyCardToBoard(wall, 3, 0);
    unit.setPosition({ q: 2, r: 0 });
    expect(unit.getMovementRange().getIsPositionValid(board, unit, { q: 3, r: 0 })).to.equal(false);
    expect(unit.getAttackRange().getIsValidTarget(board, unit, wall)).to.equal(false);
    const enemy = session.getGeneralForPlayer2();
    enemy.setPosition({ q: 3, r: 0 });
    expect(unit.getAttackRange().getIsValidTarget(board, unit, enemy)).to.equal(true);
  });

  it('limits hex unit spawn prediction to unobstructed neighbors of its own general', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 1);
    const board = session.getBoard();
    const playerId = session.getPlayer1Id();
    const general = session.getGeneralForPlayerId(playerId);
    general.setPosition({ q: -2, r: 4 });

    const unit = session.createCardForIdentifier(SDK.Cards.Faction1.SilverguardSquire);
    unit.setOwnerId(playerId);
    const alliedOnlyPosition = { q: 1, r: 2 };
    const alliedUnit = session.createCardForIdentifier(SDK.Cards.Neutral.BloodtearAlchemist);
    alliedUnit.setOwnerId(playerId);
    session.applyCardToBoard(alliedUnit, 0, 2, null, null);
    const blockedPosition = { q: -1, r: 4 };
    const enemyUnit = session.createCardForIdentifier(SDK.Cards.Neutral.BloodtearAlchemist);
    enemyUnit.setOwnerId(session.getPlayer2Id());
    session.applyCardToBoard(enemyUnit, blockedPosition.q, blockedPosition.r, null, null);

    const validPositions = unit.getValidTargetPositions();
    expect(validPositions).to.deep.equal([
      { q: -1, r: 4 }, { q: -1, r: 3 },
    ].filter((position) => position.q !== blockedPosition.q || position.r !== blockedPosition.r));
    expect(validPositions).to.not.deep.include(alliedOnlyPosition);
    expect(board.isValidGeneralAdjacentSpawnPosition(unit, alliedOnlyPosition)).to.equal(false);
    expect(board.isValidGeneralAdjacentSpawnPosition(unit, { q: 50, r: 50 })).to.equal(false);

    const airdropTemplate = SDK.GameSession.getCardCaches().getType(SDK.CardType.Unit).getCards()
      .find((card) => card.hasModifierClass(SDK.ModifierAirdrop));
    expect(airdropTemplate).not.to.equal(undefined);
    const airdropUnit = session.createCardForIdentifier(airdropTemplate.getId());
    airdropUnit.setOwnerId(playerId);
    airdropUnit.canBeAppliedAnywhere = true;
    expect(airdropUnit.getCanBeAppliedAnywhere()).to.equal(true);
    expect(airdropUnit.getValidTargetPositions()).to.deep.equal(validPositions);
  });

  it('returns no hex unit spawn destinations when its general cannot be resolved on board', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 1);
    const playerId = session.getPlayer1Id();
    session.getGeneralForPlayerId(playerId).setPosition({ q: 50, r: 50 });
    const unit = session.createCardForIdentifier(SDK.Cards.Faction1.SilverguardSquire);
    unit.setOwnerId(playerId);
    expect(unit.getValidTargetPositions()).to.deep.equal([]);
  });

  it('allows actionless hex board setup to restore units away from the general', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 1);
    const playerId = session.getPlayer1Id();
    const unit = session.createCardForIdentifier(SDK.Cards.Neutral.BloodtearAlchemist);
    unit.setOwnerId(playerId);

    const isApplied = session.applyCardToBoard(unit, 0, 2, unit.createCardData(), null);

    expect(isApplied).to.equal(true);
    expect(session.getBoard().getUnitAtPosition({ q: 0, r: 2 })).not.to.equal(undefined);
  });

  it('accepts general-adjacent hex summons and rejects action-backed invalid destinations', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 1);
    const playerId = session.getPlayer1Id();
    session.getGeneralForPlayerId(playerId).setPosition({ q: -2, r: 4 });
    const ally = session.createCardForIdentifier(SDK.Cards.Neutral.BloodtearAlchemist);
    ally.setOwnerId(playerId);
    session.applyCardToBoard(ally, 0, 2, null, null);

    expect(session.getBoard().isValidGeneralAdjacentSpawnPosition(ally, { q: -1, r: 4 })).to.equal(true);
    const legalUnit = session.createCardForIdentifier(SDK.Cards.Neutral.BloodtearAlchemist);
    legalUnit.setOwnerId(playerId);
    const legalAction = new SDK.PlayCardAction(session, playerId, { q: -1, r: 4 }, { id: SDK.Cards.Faction4.Wraithling });
    const legalApplication = session.applyCardToBoard(legalUnit, -1, 4, legalUnit.createCardData(), legalAction);
    expect(legalApplication).to.equal(true);
    expect(session.getBoard().getUnitAtPosition({ q: -1, r: 4 })).not.to.equal(undefined);

    const invalidUnit = session.createCardForIdentifier(SDK.Cards.Neutral.BloodtearAlchemist);
    invalidUnit.setOwnerId(playerId);
    const action = new SDK.PlayCardAction(session, playerId, { q: 1, r: 2 }, { id: SDK.Cards.Faction4.Wraithling });
    const invalidApplication = session.applyCardToBoard(invalidUnit, 1, 2, invalidUnit.createCardData(), action);
    expect(invalidApplication).to.equal(false);
    expect(session.getBoard().getUnitAtPosition({ q: 1, r: 2 })).to.equal(undefined);

    const occupiedUnit = session.createCardForIdentifier(SDK.Cards.Neutral.BloodtearAlchemist);
    occupiedUnit.setOwnerId(playerId);
    const occupiedAction = new SDK.PlayCardAction(session, playerId, { q: -1, r: 4 }, { id: SDK.Cards.Faction4.Wraithling });
    const occupiedApplication = session.applyCardToBoard(occupiedUnit, -1, 4, occupiedUnit.createCardData(), occupiedAction);
    expect(occupiedApplication).to.equal(false);
    expect(session.getBoard().getCardsAtPosition({ q: -1, r: 4 }, SDK.CardType.Unit)).to.have.length(1);
  });

  it('round trips every rendered hex cell and exposes bounded six-neighbor topology', () => {
    const Topology = SDK.HexTopology;
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 1);
    const board = session.getBoard();
    for (let k = 0; k <= 4; k++) {
      for (let c = 0; c <= (k % 2 === 0 ? 8 : 7); c++) {
        const axial = Topology.renderedToAxial(c, k);
        expect(Topology.axialToRendered(axial)).to.deep.equal({ c, k });
      }
    }
    expect(board.getHexNeighbors({ q: 0, r: 2 })).to.deep.equal([
      { q: 1, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 3 },
      { q: 0, r: 1 }, { q: 1, r: 1 }, { q: -1, r: 3 },
    ]);
    expect(board.getHexNeighbors({ q: -2, r: 4 })).to.have.length(2);
    expect(board.getHexNeighbors({ q: 50, r: 50 })).to.deep.equal([]);
    expect(board.getHexDistance({ q: -2, r: 4 }, { q: 2, r: 4 })).to.equal(4);
    expect(board.getHexPositionsInRange({ q: -2, r: 4 }, 1)).to.have.length(3);
    expect(board.getHexPath({ q: -2, r: 4 }, { q: 2, r: 4 })).to.have.length(4);
    expect(board.getHexPositionAtRenderedOffset({ q: 8, r: 0 }, 1, 0)).to.equal(null);
    expect(board.getHexPositionAtRenderedOffset({ q: 8, r: 0 }, -1, 0)).to.deep.equal({ q: 7, r: 0 });
  });

  it('queues Wrath of God Hallowed at the axial target position', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 1);
    const playerId = session.getPlayer1Id();
    const targetPosition = { q: -1, r: 4 };
    const spell = new SpellWrathOfGod(session);
    spell.setOwnerId(playerId);
    const queuedActions = [];
    const executeAction = session.executeAction;
    const board = session.getBoard();
    const getUnitAtPosition = board.getUnitAtPosition;
    session.executeAction = (action) => queuedActions.push(action);
    board.getUnitAtPosition = (position) => {
      expect(position).to.deep.equal(targetPosition);
      return { getIsGeneral: () => false };
    };
    try {
      spell.onApplyEffectToBoardTile(board, targetPosition.q, targetPosition.r, null);
    } finally {
      session.executeAction = executeAction;
      board.getUnitAtPosition = getUnitAtPosition;
    }

    const hallowedAction = queuedActions.find((action) => action.getCardDataOrIndex()?.id === SDK.Cards.Tile.Hallowed);
    expect(hallowedAction).to.exist;
    expect(hallowedAction.getTargetPosition()).to.deep.equal(targetPosition);
  });

  it('uses axial movement steps and rejects square-shaped or out-of-speed destinations', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 1);
    const general = session.getGeneralForPlayer1();
    general.setPosition({ q: -2, r: 4 });
    general.setSpeed(1);
    const range = general.getMovementRange();
    const board = session.getBoard();

    expect(range.getIsPositionValid(board, general, { q: -1, r: 3 })).to.equal(true);
    expect(range.getPathTo(board, general, { q: -1, r: 3 })).to.deep.equal([{ q: -2, r: 4 }, { q: -1, r: 3 }]);
    expect(range.getIsPositionValid(board, general, { x: -1, y: 3 })).to.equal(false);
    expect(range.getIsPositionValid(board, general, { q: 0, r: 4 })).to.equal(false);
    expect(range.getPathTo(board, general, { q: 0, r: 4 })).to.deep.equal([]);
  });

  it('uses axial attack distance and rejects square-only target coordinates', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 1);
    const general = session.getGeneralForPlayer1();
    general.setPosition({ q: -2, r: 4 });
    general.setReach(1);
    const range = general.getAttackRange();
    const board = session.getBoard();

    expect(range.getIsPositionValid(board, general, { q: -1, r: 4 })).to.equal(true);
    expect(range.getIsPositionValid(board, general, { x: -1, y: 4 })).to.equal(false);
    expect(range.getIsPositionValid(board, general, { q: -1, r: 5 })).to.equal(false);
  });

  it('serializes and reconstructs axial action targets without coordinate conversion', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 1);
    const general = session.getGeneralForPlayer1();
    general.setPosition({ q: -2, r: 4 });
    const action = general.actionMove({ q: -1, r: 4 });
    const serialized = JSON.parse(session.serializeToJSON(action));
    const replayAction = session.deserializeActionFromFirebase(serialized);

    expect(serialized.targetPosition).to.deep.equal({ q: -1, r: 4 });
    expect(replayAction.getTargetPosition()).to.deep.equal({ q: -1, r: 4 });
    expect(general.getMovementRange().getIsPositionValid(session.getBoard(), general, replayAction.getTargetPosition())).to.equal(true);
  });

  it('preserves axial producer positions and rejects numeric or square action coordinates', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 1);
    const playerId = session.getPlayer1Id();
    const spell = new Spell(session);
    const effectPosition = spell.getEffectPositionFromCoordinates(3, 2);
    expect(effectPosition).to.deep.equal({ q: 3, r: 2 });

    const axialAction = new PlayCardAction(session, playerId, { q: -1, r: 4 }, { id: SDK.Cards.Faction1.SilverguardSquire });
    expect(axialAction.getTargetPosition()).to.deep.equal({ q: -1, r: 4 });
    expect(session.getBoard().isOnBoard(axialAction.getTargetPosition())).to.equal(true);

    const numericAction = new PlayCardAction(session, playerId, 2, 3, { id: SDK.Cards.Faction1.SilverguardSquire });
    expect(numericAction.getTargetPosition()).to.deep.equal({ x: 2, y: 3 });
    expect(session.getBoard().isOnBoard(numericAction.getTargetPosition())).to.equal(false);
    expect(UtilsGameSession.getSmartSpawnPositionsFromPattern(session, { q: 0, r: 0 }, [{ q: -1, r: 4 }], session.getGeneralForPlayer1())).to.deep.equal([{ q: -1, r: 4 }]);
    expect(UtilsGameSession.getSmartSpawnPositionsFromPattern(session, { q: 0, r: 0 }, [{ x: -1, y: 4 }], session.getGeneralForPlayer1())).to.deep.equal([]);
  });

  it('finds a shortest in-bounds route when the straight hex line leaves the board', () => {
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 1);
    const board = session.getBoard();
    const path = board.getHexPath({ q: 4, r: 0 }, { q: 3, r: 2 });
    expect(path).to.have.length(2);
    expect(path[path.length - 1]).to.deep.equal({ q: 3, r: 2 });
    expect(path.every((position) => board.isOnBoard(position))).to.equal(true);
    expect(board.getHexPath({ q: 4, r: 0 }, { q: 4, r: 0 })).to.deep.equal([]);
  });

  it('returns axial components from coordinate accessors only for the hex ruleset', () => {
    const session = SDK.GameSession.getInstance();
    const card = session.getGeneralForPlayer1();
    session.setRuleset('practice-sandbox-hex', 1);
    card.setPosition({ q: -2, r: 4 });
    expect(card.getPositionX()).to.equal(-2);
    expect(card.getPositionY()).to.equal(4);
    session.setRuleset('legacy', 1);
    card.setPosition({ x: 0, y: 2 });
    expect(card.getPositionX()).to.equal(0);
    expect(card.getPositionY()).to.equal(2);
  });

  it('expect board.getCardAtPosition to find card at 0, 2', () => {
    expect(SDK.GameSession.getInstance().getBoard().getCardAtPosition({ x: 0, y: 2 }) instanceof SDK.Card).to.equal(true);
  });

  it('expect board.getEntityAtPosition to find entity at 4, 3', () => {
    console.log(SDK.GameSession.getInstance().getBoard().getUnits().length);
    expect(SDK.GameSession.getInstance().getBoard().getEntityAtPosition({ x: 4, y: 3 }) instanceof SDK.Entity).to.equal(true);
  });

  it('expect board.getUnitAtPosition to find unit at 5, 3', () => {
    expect(SDK.GameSession.getInstance().getBoard().getUnitAtPosition({ x: 5, y: 3 }) instanceof SDK.Unit).to.equal(true);
  });

  it('expect board.getEntityAtPosition to find unit and not tile at 8, 2', () => {
    expect(SDK.GameSession.getInstance().getBoard().getEntityAtPosition({ x: 8, y: 2 }) instanceof SDK.Unit).to.equal(true);
  });

  it('expect board.getTileAtPosition to not find tile at 8, 2', () => {
    expect(SDK.GameSession.getInstance().getBoard().getTileAtPosition({ x: 8, y: 2 }) == null).to.equal(true);
  });

  it('expect board.getTileAtPosition, allowing untargetable, to find tile at 8, 2', () => {
    expect(SDK.GameSession.getInstance().getBoard().getTileAtPosition({ x: 8, y: 2 }, true) instanceof SDK.Tile).to.equal(true);
  });

  it('expect board.getCardsAtPosition to find unit but not tile at 8, 2', () => {
    const entites = SDK.GameSession.getInstance().getBoard().getCardsAtPosition({ x: 8, y: 2 });
    expect(entites[0] instanceof SDK.Unit && entites.length === 1).to.equal(true);
  });

  it('expect board.getCardsAtPosition, allowing untargetable, to find unit and tile at 8, 2', () => {
    const entites = SDK.GameSession.getInstance().getBoard().getCardsAtPosition({ x: 8, y: 2 }, null, true);
    expect(entites[0] instanceof SDK.Unit && entites[1] instanceof SDK.Tile).to.equal(true);
  });

  it('expect board.getEntitiesAtPosition to find unit but not tile at 8, 2', () => {
    const entites = SDK.GameSession.getInstance().getBoard().getEntitiesAtPosition({ x: 8, y: 2 });
    expect(entites[0] instanceof SDK.Unit && entites.length === 1).to.equal(true);
  });

  it('expect board.getEntitiesAtPosition, allowing untargetable, to find unit and tile at 8, 2', () => {
    const entites = SDK.GameSession.getInstance().getBoard().getEntitiesAtPosition({ x: 8, y: 2 }, true);
    expect(entites[0] instanceof SDK.Unit && entites[1] instanceof SDK.Tile).to.equal(true);
  });

  it('expect board.getObstructionAtPosition to find obstruction at 5, 3', () => {
    expect(SDK.GameSession.getInstance().getBoard().getObstructionAtPosition({ x: 5, y: 3 }) != null).to.equal(true);
  });

  it('expect board.getObstructionAtPositionForEntity to find obstruction for unit at 3, 1', () => {
    const entity = SDK.GameSession.getInstance().getBoard().getUnitAtPosition({ x: 0, y: 2 });
    expect(SDK.GameSession.getInstance().getBoard().getObstructionAtPositionForEntity({ x: 3, y: 1 }, entity) != null).to.equal(true);
  });

  it('expect board.getCardsWithinRadiusOfPosition with radius of 1 to find 5 cards at 0, 2', () => {
    const entites = SDK.GameSession.getInstance().getBoard().getCardsWithinRadiusOfPosition({ x: 0, y: 2 });
    expect(entites.length).to.equal(5);
  });

  it('expect board.getCardsWithinRadiusOfPosition with radius of entire board to find 15 cards at 0, 2', () => {
    const entites = SDK.GameSession.getInstance().getBoard().getCardsWithinRadiusOfPosition({ x: 0, y: 2 }, null, CONFIG.WHOLE_BOARD_RADIUS);
    expect(entites.length).to.equal(15);
  });

  it('expect board.getCardsAroundPosition with radius of 1 to find 4 cards at 0, 2', () => {
    const entites = SDK.GameSession.getInstance().getBoard().getCardsAroundPosition({ x: 0, y: 2 });
    expect(entites.length).to.equal(4);
  });

  it('expect board.getEntitiesAroundEntity with radius of 1 to find 4 cards at 0, 2', () => {
    const entity = SDK.GameSession.getInstance().getBoard().getUnitAtPosition({ x: 0, y: 2 });
    const entites = SDK.GameSession.getInstance().getBoard().getEntitiesAroundEntity(entity);
    expect(entites.length).to.equal(4);
  });

  it('expect board.getFriendlyEntitiesAroundEntity with radius of 1 to find 2 cards at 0, 2', () => {
    const entity = SDK.GameSession.getInstance().getBoard().getUnitAtPosition({ x: 0, y: 2 });
    const entites = SDK.GameSession.getInstance().getBoard().getFriendlyEntitiesAroundEntity(entity);
    expect(entites.length).to.equal(2);
  });

  it('expect board.getFriendlyEntitiesAroundEntity with radius of entire board to find 7 cards at 0, 2', () => {
    const entity = SDK.GameSession.getInstance().getBoard().getUnitAtPosition({ x: 0, y: 2 });
    const entites = SDK.GameSession.getInstance().getBoard().getFriendlyEntitiesAroundEntity(entity, null, CONFIG.WHOLE_BOARD_RADIUS);
    expect(entites.length).to.equal(7);
  });

  it('expect board.getEnemyEntitiesAroundEntity with radius of 1 to find 2 cards at 0, 2', () => {
    const entity = SDK.GameSession.getInstance().getBoard().getUnitAtPosition({ x: 0, y: 2 });
    const entites = SDK.GameSession.getInstance().getBoard().getEnemyEntitiesAroundEntity(entity);
    expect(entites.length).to.equal(2);
  });

  it('expect board.getEnemyEntitiesAroundEntity with radius of entire board to find 7 cards at 0, 2', () => {
    const entity = SDK.GameSession.getInstance().getBoard().getUnitAtPosition({ x: 0, y: 2 });
    const entites = SDK.GameSession.getInstance().getBoard().getEnemyEntitiesAroundEntity(entity, null, CONFIG.WHOLE_BOARD_RADIUS);
    expect(entites.length).to.equal(7);
  });

  it('expect board.getEntitiesInRow to find 3 cards at the first row', () => {
    const entites = SDK.GameSession.getInstance().getBoard().getEntitiesInRow(0);
    expect(entites.length).to.equal(3);
  });

  it('expect board.getEntitiesInColumn to find 3 cards at the middle column', () => {
    const entites = SDK.GameSession.getInstance().getBoard().getEntitiesInColumn(4);
    expect(entites.length).to.equal(3);
  });

  it('expect board.getEntitiesInfrontOf to find 2 cards at 4, 4', () => {
    const entity = SDK.GameSession.getInstance().getBoard().getUnitAtPosition({ x: 4, y: 4 });
    const entites = SDK.GameSession.getInstance().getBoard().getEntitiesInfrontOf(entity);
    expect(entites.length).to.equal(2);
  });

  it('expect board.getEntitiesInfrontOf to find 0 cards at 0, 0', () => {
    const entity = SDK.GameSession.getInstance().getBoard().getUnitAtPosition({ x: 0, y: 0 });
    const entites = SDK.GameSession.getInstance().getBoard().getEntitiesInfrontOf(entity);
    expect(entites.length).to.equal(0);
  });

  it('expect board.getEntitiesOnCardinalAxisFromEntityToPosition to find 2 cards at 0, 2 to 8, 2', () => {
    const entity = SDK.GameSession.getInstance().getBoard().getUnitAtPosition({ x: 0, y: 2 });
    const entites = SDK.GameSession.getInstance().getBoard().getEntitiesOnCardinalAxisFromEntityToPosition(entity, { x: 8, y: 2 });
    expect(entites.length).to.equal(2);
  });

  it('expect board.getEntitiesOnCardinalAxisFromEntityToPosition to find 2 cards at 0, 0 to 8, 0', () => {
    const entity = SDK.GameSession.getInstance().getBoard().getUnitAtPosition({ x: 0, y: 0 });
    const entites = SDK.GameSession.getInstance().getBoard().getEntitiesOnCardinalAxisFromEntityToPosition(entity, { x: 8, y: 0 });
    expect(entites.length).to.equal(2);
  });

  it('expect board.getEntitiesOnCardinalAxisFromEntityToPosition to find 2 cards at 0, 2 to 0, 0', () => {
    const entity = SDK.GameSession.getInstance().getBoard().getUnitAtPosition({ x: 0, y: 2 });
    const entites = SDK.GameSession.getInstance().getBoard().getEntitiesOnCardinalAxisFromEntityToPosition(entity, { x: 0, y: 0 });
    expect(entites.length).to.equal(2);
  });
});
