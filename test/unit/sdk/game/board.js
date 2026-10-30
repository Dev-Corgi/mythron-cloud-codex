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
