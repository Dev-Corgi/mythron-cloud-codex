const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const { expect } = require('chai');
const CONFIG = require('../../../../app/common/config');
const Logger = require('../../../../app/common/logger.coffee');
const SDK = require('../../../../app/sdk.coffee');
const UtilsSDK = require('../../../utils/utils_sdk');

Logger.enabled = false;

describe('unit stats', () => {
  let gameSession;

  beforeEach(() => {
    UtilsSDK.setupSession([
      { id: SDK.Cards.Faction1.General },
    ], [
      { id: SDK.Cards.Faction2.General },
    ], true, true);
    gameSession = SDK.GameSession.getInstance();
  });

  afterEach(() => {
    SDK.GameSession.reset();
  });

  const createUnit = () => gameSession.createCardForIdentifier(SDK.Cards.Neutral.GolemMetallurgist);

  it('provides walk, melee, distance, range, and level defaults', () => {
    const unit = createUnit();

    expect(unit.getMovementType()).to.equal('walk');
    expect(unit.getMovementDistance()).to.equal(CONFIG.SPEED_BASE);
    expect(unit.getAttackType()).to.equal('melee');
    expect(unit.getAttackRangeValue()).to.equal(CONFIG.REACH_MELEE);
    expect(unit.getLevel()).to.equal(1);
  });

  it('validates stat setters and preserves phase as a stat value', () => {
    const unit = createUnit();

    unit.setMovementType('phase');
    unit.setAttackType('area');
    unit.setLevel(3);
    expect(unit.getMovementType()).to.equal('phase');
    expect(unit.getAttackType()).to.equal('area');
    expect(unit.getLevel()).to.equal(3);

    unit.setMovementType('burrow');
    unit.setAttackType('splash');
    unit.setLevel(0);
    expect(unit.getMovementType()).to.equal('phase');
    expect(unit.getAttackType()).to.equal('area');
    expect(unit.getLevel()).to.equal(3);
  });

  it('accepts lobbed attacks while retaining the previous value for unsupported types', () => {
    const unit = createUnit();

    expect(unit.getAttackType()).to.equal('melee');
    unit.setAttackType('lobbed');
    expect(unit.getAttackType()).to.equal('lobbed');
    unit.setAttackType('splash');
    expect(unit.getAttackType()).to.equal('lobbed');
  });

  it('accepts the explicit none attack type and prevents attack eligibility', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    const unit = createUnit();
    unit.setActionPoints(1);
    expect(unit.getCanAttack()).to.equal(true);

    unit.setAttackType('none');
    expect(unit.getAttackType()).to.equal('none');
    expect(unit.getHasExplicitAttackType()).to.equal(true);
    expect(unit.getCanAttack()).to.equal(false);

    const cardData = unit.createCardData();
    expect(cardData.attackType).to.equal('none');
    const copy = gameSession.createCardForIdentifier(unit.getId());
    copy.applyCardData(cardData);
    copy.setActionPoints(1);
    expect(copy.getAttackType()).to.equal('none');
    expect(copy.getCanAttack()).to.equal(false);
  });

  it('keeps default and inferred attack types eligible to attack', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    const defaultUnit = createUnit();
    defaultUnit.setActionPoints(1);
    expect(defaultUnit.getAttackType()).to.equal('melee');
    expect(defaultUnit.getCanAttack()).to.equal(true);

    const inferredAreaUnit = UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction3.Pyromancer }, 0, 1, gameSession.getPlayer1Id());
    inferredAreaUnit.setActionPoints(1);
    expect(inferredAreaUnit.getAttackType()).to.equal('area');
    expect(inferredAreaUnit.getCanAttack()).to.equal(true);
  });

  it('reconstructs Phasing modifiers by their serialized type', () => {
    const modifier = SDK.ModifierFactory.modifierForType('ModifierPhasing', gameSession);
    expect(modifier).to.be.instanceOf(SDK.ModifierPhasing);
    expect(modifier.type).to.equal('ModifierPhasing');
    const contextObject = modifier.createContextObject();
    expect(contextObject.type).to.equal('ModifierPhasing');
    expect(SDK.ModifierFactory.modifierForType(contextObject.type, gameSession)).to.be.instanceOf(SDK.ModifierPhasing);

    const unit = createUnit();
    unit.hasModifierClass = (modifierClass) => modifierClass === SDK.ModifierPhasing;
    expect(unit.getMovementType()).to.equal('phase');
  });

  it('derives fly and area types from existing traits and ranged from reach', () => {
    const flyingUnit = UtilsSDK.applyCardToBoard(
      { id: SDK.Cards.Neutral.SpottedDragonlark }, 0, 1, gameSession.getPlayer1Id());
    const blastUnit = UtilsSDK.applyCardToBoard(
      { id: SDK.Cards.Faction3.Pyromancer }, 2, 2, gameSession.getPlayer1Id());

    expect(flyingUnit.getMovementType()).to.equal('fly');
    expect(blastUnit.getAttackType()).to.equal('area');

    const rangedUnit = createUnit();
    rangedUnit.setReach(CONFIG.REACH_RANGED);
    expect(rangedUnit.getAttackType()).to.equal('ranged');
  });

  it('counts only a configured attack type as explicit and copies it with the card data', () => {
    const blast = UtilsSDK.applyCardToBoard(
      { id: SDK.Cards.Faction3.Pyromancer }, 0, 1, gameSession.getPlayer1Id());
    expect(blast.getAttackType()).to.equal('area');
    expect(blast.getHasExplicitAttackType()).to.equal(false);
    expect(createUnit().getHasExplicitAttackType()).to.equal(false);

    const unit = createUnit();
    unit.setAttackType('ranged');
    expect(unit.getHasExplicitAttackType()).to.equal(true);
    const copy = gameSession.createCardForIdentifier(unit.getId());
    copy.applyCardData(unit.createCloneCardData());
    expect(copy.getHasExplicitAttackType()).to.equal(true);
    expect(copy.getAttackType()).to.equal('ranged');
    expect(unit.getCardDataKeysForCopy()).to.include.members(['speed', 'reach', 'movementType', 'attackType', 'level', 'actionPoints', 'actionPointsSpentThisTurn', 'activeAbilityState']);
  });

  it('lets an explicitly configured attack type override inferred traits', () => {
    const unit = UtilsSDK.applyCardToBoard(
      { id: SDK.Cards.Faction3.Pyromancer }, 0, 1, gameSession.getPlayer1Id());

    expect(unit.getAttackType()).to.equal('area');
    unit.setAttackType('melee');
    expect(unit.getAttackType()).to.equal('melee');

    unit.setReach(CONFIG.REACH_RANGED);
    const reconstructed = gameSession.createCardForIdentifier(unit.getId());
    reconstructed.applyCardData(unit.createCloneCardData());
    expect(reconstructed.getAttackType()).to.equal('melee');
  });

  it('retains configured stats through card-data copying and reconstruction', () => {
    const unit = createUnit();
    unit.setSpeed(4);
    unit.setReach(3);
    unit.setMovementType('phase');
    unit.setAttackType('area');
    unit.setLevel(2);

    const cardData = unit.createCardData();
    expect(cardData.speed).to.equal(4);
    expect(cardData.reach).to.equal(3);
    expect(cardData.movementType).to.equal('phase');
    expect(cardData.attackType).to.equal('area');
    expect(cardData.level).to.equal(2);

    const cloneData = unit.createCloneCardData();
    const reconstructed = gameSession.createCardForIdentifier(unit.getId());
    reconstructed.applyCardData(cloneData);
    expect(reconstructed.getMovementDistance()).to.equal(4);
    expect(reconstructed.getAttackRangeValue()).to.equal(3);
    expect(reconstructed.getMovementType()).to.equal('phase');
    expect(reconstructed.getAttackType()).to.equal('area');
    expect(reconstructed.getLevel()).to.equal(2);
  });

  it('tracks and serializes the version 2 action-point budget through exhaustion changes', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    const unit = gameSession.getGeneralForPlayer1();

    expect(unit.getActionPoints()).to.equal(0);
    expect(unit.getIsExhausted()).to.equal(true);
    unit.refreshExhaustion();
    expect(unit.getActionPoints()).to.equal(2);
    expect(unit.getCanMove()).to.equal(true);
    expect(unit.spendActionPoint()).to.equal(true);
    expect(unit.getActionPoints()).to.equal(1);
    expect(unit.getIsExhausted()).to.equal(false);

    gameSession.executeAction(gameSession.actionEndTurn());
    expect(unit.getActionPoints()).to.equal(1);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(unit.getActionPoints()).to.equal(2);

    unit.spendActionPoint();
    expect(unit.getActionPoints()).to.equal(1);
    const remainingPointData = unit.createCardData();
    expect(remainingPointData.actionPoints).to.equal(1);
    const reconstructed = gameSession.createCardForIdentifier(unit.getId());
    reconstructed.applyCardData(remainingPointData);
    expect(reconstructed.getActionPoints()).to.equal(1);

    unit.spendActionPoint();
    const spentOutData = unit.createCardData();
    expect(spentOutData.actionPoints).to.equal(0);
    expect(spentOutData.actionPointsSpentThisTurn).to.equal(true);
    const spentOutReconstruction = gameSession.createCardForIdentifier(unit.getId());
    spentOutReconstruction.applyCardData(spentOutData);
    expect(spentOutReconstruction.getActionPoints()).to.equal(0);
    expect(spentOutReconstruction.getHasSpentActionPointThisTurn()).to.equal(true);

    unit.applyExhaustion();
    expect(unit.getActionPoints()).to.equal(0);
    unit.setExhausted(false);
    expect(unit.getActionPoints()).to.equal(2);
  });

  it('maps explicit exhaustion actions to and from the version 2 point budget', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    const unit = gameSession.getGeneralForPlayer1();
    unit.refreshExhaustion();
    unit.spendActionPoint();

    const SetExhaustionAction = require('../../../../app/sdk/actions/setExhaustionAction.coffee');
    const exhaust = new SetExhaustionAction(gameSession);
    exhaust.setTarget(unit);
    exhaust.setExhausted(true);
    UtilsSDK.executeActionWithoutValidation(exhaust);
    expect(unit.getActionPoints()).to.equal(0);
    expect(unit.getIsExhausted()).to.equal(true);

    const RefreshExhaustionAction = require('../../../../app/sdk/actions/refreshExhaustionAction.coffee');
    const refresh = new RefreshExhaustionAction(gameSession);
    refresh.setTarget(unit);
    UtilsSDK.executeActionWithoutValidation(refresh);
    expect(unit.getActionPoints()).to.equal(2);
    expect(unit.getIsExhausted()).to.equal(false);
  });

  it('keeps a summoned unit at zero through the opponent turn and refreshes it on its owner turn', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    const summoned = gameSession.createCardForIdentifier(SDK.Cards.Neutral.GolemMetallurgist);
    summoned.setOwnerId(gameSession.getPlayer1Id());
    gameSession.applyCardToBoard(summoned, 1, 0, null, null);
    expect(summoned.getActionPoints()).to.equal(0);
    const active = gameSession.getGeneralForPlayer1();
    active.refreshExhaustion();
    active.spendActionPoint();

    gameSession.executeAction(gameSession.actionEndTurn());
    expect(summoned.getActionPoints()).to.equal(0);
    expect(active.getActionPoints()).to.equal(1);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(summoned.getActionPoints()).to.equal(2);
    expect(active.getActionPoints()).to.equal(2);
  });

  it('preserves remaining action points when a unit is transformed', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    const original = gameSession.createCardForIdentifier(SDK.Cards.Neutral.GolemMetallurgist);
    original.setOwnerId(gameSession.getPlayer1Id());
    const board = gameSession.getBoard();
    const general = gameSession.getGeneralForPlayer1();
    general.setPosition({ q: 4, r: 0 });
    const originalPosition = board.getHexNeighbors(general.getPosition()).find((position) =>
      board.hasTileAtPosition(position) && !board.getUnitAtPosition(position));
    gameSession.applyCardToBoard(original, originalPosition.q, originalPosition.r, null, null);
    expect(original.getIsActive()).to.equal(true);
    original.refreshExhaustion();
    original.spendActionPoint();
    const transformPosition = original.getPosition();
    const originalExhausted = original.getExhausted();
    const originalMovesMade = original.getMovesMade();
    const originalAttacksMade = original.getAttacksMade();
    const originalActionPoints = original.getActionPoints();
    const RemoveAction = require('../../../../app/sdk/actions/removeAction.coffee');
    const remove = new RemoveAction(gameSession);
    remove.setTarget(original);
    UtilsSDK.executeActionWithoutValidation(remove);
    expect(original.getIsRemoved()).to.equal(true);
    expect(gameSession.getBoard().getUnitAtPosition(originalPosition)).to.be.falsy;

    const transformedData = gameSession.createCardForIdentifier(SDK.Cards.Neutral.DragoneboneGolem).createCardData();
    transformedData.additionalInherentModifiersContextObjects = [
      SDK.ModifierTransformed.createContextObject(
        originalExhausted, originalMovesMade, originalAttacksMade, originalActionPoints,
        original.getHasSpentActionPointThisTurn()),
    ];
    const PlayCardAsTransformAction = require('../../../../app/sdk/actions/playCardAsTransformAction.coffee');
    const transform = new PlayCardAsTransformAction(
      gameSession, original.getOwnerId(), transformPosition, transformedData);
    UtilsSDK.executeActionWithoutValidation(transform);

    const replacement = transform.getCard();
    expect(transform.getIsValidApplication()).to.equal(true);
    expect(replacement.getId()).to.equal(SDK.Cards.Neutral.DragoneboneGolem);
    expect(replacement.hasModifierClass(SDK.ModifierTransformed)).to.equal(true);
    expect(replacement.getActionPoints()).to.equal(1);
    expect(replacement.getIsExhausted()).to.equal(false);
    expect(replacement.getHasSpentActionPointThisTurn()).to.equal(true);
  });

  it('preserves remaining action points when a building transformation completes', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    const original = gameSession.createCardForIdentifier(SDK.Cards.Neutral.GolemMetallurgist);
    original.setOwnerId(gameSession.getPlayer1Id());
    const board = gameSession.getBoard();
    const general = gameSession.getGeneralForPlayer1();
    general.setPosition({ q: 4, r: 0 });
    const position = board.getHexNeighbors(general.getPosition()).find((candidate) =>
      board.hasTileAtPosition(candidate) && !board.getUnitAtPosition(candidate));
    gameSession.applyCardToBoard(original, position.q, position.r, null, null);
    original.refreshExhaustion();
    original.spendActionPoint();

    const transformedData = gameSession.createCardForIdentifier(SDK.Cards.Neutral.DragoneboneGolem).createCardData();
    const ModifierBuilding = require('../../../../app/sdk/modifiers/modifierBuilding.coffee');
    gameSession.applyModifierContextObject(ModifierBuilding.createContextObject('Building test', transformedData, 1), original);
    const building = original.getActiveModifierByClass(ModifierBuilding);
    building.transformSelf();

    const transformedState = transformedData.additionalModifiersContextObjects.find((modifier) =>
      modifier.type === SDK.ModifierTransformed.type);
    expect(transformedState.actionPoints).to.equal(1);
    expect(transformedState.actionPointsSpentThisTurn).to.equal(true);
  });

  it('does not let Pseudo Rush restore spent version 2 points', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    const unit = gameSession.getGeneralForPlayer1();
    unit.refreshExhaustion();
    unit.spendActionPoint();
    unit.spendActionPoint();

    const ModifierPseudoRush = require('../../../../app/sdk/modifiers/modifierPseudoRush.coffee');
    gameSession.applyModifierContextObject(ModifierPseudoRush.createContextObject(), unit);

    expect(unit.getActionPoints()).to.equal(0);
    expect(unit.getHasSpentActionPointThisTurn()).to.equal(true);
  });

  it('does not let First Blood refresh after a version 2 action was spent', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    gameSession.wasActionExecutedDuringTurn = () => true;
    gameSession.getCanCardBeScheduledForRemoval = () => true;
    const unit = gameSession.getGeneralForPlayer1();
    unit.refreshExhaustion();
    unit.spendActionPoint();
    unit.spendActionPoint();

    const ModifierFirstBlood = require('../../../../app/sdk/modifiers/modifierFirstBlood.coffee');
    gameSession.applyModifierContextObject(ModifierFirstBlood.createContextObject(), unit);

    expect(unit.getActionPoints()).to.equal(0);
    expect(unit.getHasSpentActionPointThisTurn()).to.equal(true);
  });
});
