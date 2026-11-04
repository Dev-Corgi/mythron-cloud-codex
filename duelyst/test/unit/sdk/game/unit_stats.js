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
    unit.refreshExhaustion();
    expect(unit.getCanAttack()).to.equal(true);

    unit.setAttackType('none');
    expect(unit.getAttackType()).to.equal('none');
    expect(unit.getHasExplicitAttackType()).to.equal(true);
    expect(unit.getCanAttack()).to.equal(false);

    const cardData = unit.createCardData();
    expect(cardData.attackType).to.equal('none');
    const copy = gameSession.createCardForIdentifier(unit.getId());
    copy.applyCardData(cardData);
    copy.refreshExhaustion();
    expect(copy.getAttackType()).to.equal('none');
    expect(copy.getCanAttack()).to.equal(false);
  });

  it('keeps default and inferred attack types eligible to attack', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    const defaultUnit = createUnit();
    defaultUnit.refreshExhaustion();
    expect(defaultUnit.getAttackType()).to.equal('melee');
    expect(defaultUnit.getCanAttack()).to.equal(true);

    const inferredAreaUnit = UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction3.Pyromancer }, 0, 1, gameSession.getPlayer1Id());
    inferredAreaUnit.refreshExhaustion();
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
    const flyingUnit = UtilsSDK.applyCardToBoard({ id: SDK.Cards.Neutral.SpottedDragonlark }, 0, 1, gameSession.getPlayer1Id());
    const blastUnit = UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction3.Pyromancer }, 2, 2, gameSession.getPlayer1Id());

    expect(flyingUnit.getMovementType()).to.equal('fly');
    expect(blastUnit.getAttackType()).to.equal('area');

    const rangedUnit = createUnit();
    rangedUnit.setReach(CONFIG.REACH_RANGED);
    expect(rangedUnit.getAttackType()).to.equal('ranged');
  });

  it('counts only a configured attack type as explicit and copies it with the card data', () => {
    const blast = UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction3.Pyromancer }, 0, 1, gameSession.getPlayer1Id());
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
    expect(unit.getCardDataKeysForCopy()).to.include.members(['speed', 'reach', 'movementType', 'attackType', 'level', 'activeAbilityState']);
  });

  it('lets an explicitly configured attack type override inferred traits', () => {
    const unit = UtilsSDK.applyCardToBoard({ id: SDK.Cards.Faction3.Pyromancer }, 0, 1, gameSession.getPlayer1Id());

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

  it('serializes move and attack slots with entity card data', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    const unit = gameSession.getGeneralForPlayer1();
    unit.refreshExhaustion();
    unit.recordMove();
    unit.recordAttack();
    const entityIndex = unit.getIndex();
    const snapshot = JSON.parse(gameSession.serializeToJSON(gameSession));
    gameSession.deserializeSessionFromFirebase(snapshot);
    const restored = gameSession.getCardByIndex(entityIndex);
    expect([restored.getMovesMade(), restored.getAttacksMade()]).to.deep.equal([1, 1]);
  });

  it('carries slot state through an ordinary transformation', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    gameSession.getGeneralForPlayer1().setPosition({ q: 4, r: 0 });
    gameSession.getGeneralForPlayer2().setPosition({ q: 4, r: 4 });
    const original = gameSession.createCardForIdentifier(SDK.Cards.Phobies.RazorMouth);
    original.setOwnerId(gameSession.getPlayer1Id());
    gameSession.applyCardToBoard(original, 3, 0, original.createNewCardData(), null);
    expect(original.getIsActive()).to.equal(true);
    original.refreshExhaustion();
    original.recordMove();
    original.recordAttack();
    original.applyExhaustion();
    const originalPosition = original.getPosition();
    const ModifierTransformed = require('../../../../app/sdk/modifiers/modifierTransformed.coffee');
    const transformedData = gameSession.createCardForIdentifier(50003).createNewCardData();
    transformedData.additionalInherentModifiersContextObjects = [ModifierTransformed.createContextObject(original.getExhausted(), original.getMovesMade(), original.getAttacksMade())];
    const RemoveAction = require('../../../../app/sdk/actions/removeAction.coffee');
    const remove = new RemoveAction(gameSession);
    remove.setTarget(original);
    UtilsSDK.executeActionWithoutValidation(remove);
    const PlayCardAsTransformAction = require('../../../../app/sdk/actions/playCardAsTransformAction.coffee');
    const transform = new PlayCardAsTransformAction(gameSession, original.getOwnerId(), originalPosition, transformedData);
    UtilsSDK.executeActionWithoutValidation(transform);
    const replacement = transform.getCard();
    expect(transform.getIsValidApplication()).to.equal(true);
    expect([replacement.getMovesMade(), replacement.getAttacksMade(), replacement.getExhausted()])
      .to.deep.equal([1, 1, true]);
  });

  it('preserves copied exhaustion and slots when transforming into Rush Rock Pulverizer', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    gameSession.getGeneralForPlayer1().setPosition({ q: 4, r: 0 });
    gameSession.getGeneralForPlayer2().setPosition({ q: 4, r: 4 });
    const original = gameSession.createCardForIdentifier(SDK.Cards.Phobies.RazorMouth);
    original.setOwnerId(gameSession.getPlayer1Id());
    gameSession.applyCardToBoard(original, 3, 0, original.createNewCardData(), null);
    original.recordMove();
    original.recordAttack();
    original.applyExhaustion();
    const originalPosition = original.getPosition();
    const ModifierTransformed = require('../../../../app/sdk/modifiers/modifierTransformed.coffee');
    const transformedData = gameSession.createCardForIdentifier(SDK.Cards.Phobies.Cassowary).createNewCardData();
    transformedData.additionalInherentModifiersContextObjects = [
      ModifierTransformed.createContextObject(original.getExhausted(), original.getMovesMade(), original.getAttacksMade()),
    ];
    const RemoveAction = require('../../../../app/sdk/actions/removeAction.coffee');
    const remove = new RemoveAction(gameSession);
    remove.setTarget(original);
    UtilsSDK.executeActionWithoutValidation(remove);
    const PlayCardAsTransformAction = require('../../../../app/sdk/actions/playCardAsTransformAction.coffee');
    const transform = new PlayCardAsTransformAction(gameSession, original.getOwnerId(), originalPosition, transformedData);
    UtilsSDK.executeActionWithoutValidation(transform);
    const replacement = transform.getCard();
    expect([replacement.getMovesMade(), replacement.getAttacksMade(), replacement.getExhausted()])
      .to.deep.equal([1, 1, true]);
  });

  it('restores copied exhaustion after Rush activation when transforming into Rock Pulverizer', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    gameSession.getGeneralForPlayer1().setPosition({ q: 4, r: 0 });
    gameSession.getGeneralForPlayer2().setPosition({ q: 4, r: 4 });
    const original = gameSession.createCardForIdentifier(SDK.Cards.Phobies.RazorMouth);
    original.setOwnerId(gameSession.getPlayer1Id());
    gameSession.applyCardToBoard(original, 3, 0, original.createNewCardData(), null);
    original.applyExhaustion();
    const originalPosition = original.getPosition();
    const ModifierTransformed = require('../../../../app/sdk/modifiers/modifierTransformed.coffee');
    const transformedData = gameSession.createCardForIdentifier(SDK.Cards.Phobies.Cassowary).createNewCardData();
    transformedData.additionalInherentModifiersContextObjects = [
      ModifierTransformed.createContextObject(true, 0, 0),
    ];
    const RemoveAction = require('../../../../app/sdk/actions/removeAction.coffee');
    const remove = new RemoveAction(gameSession);
    remove.setTarget(original);
    UtilsSDK.executeActionWithoutValidation(remove);
    const PlayCardAsTransformAction = require('../../../../app/sdk/actions/playCardAsTransformAction.coffee');
    const transform = new PlayCardAsTransformAction(gameSession, original.getOwnerId(), originalPosition, transformedData);
    UtilsSDK.executeActionWithoutValidation(transform);
    const replacement = transform.getCard();
    expect(transform.getIsValidApplication()).to.equal(true);
    expect(replacement.hasModifierClass(SDK.ModifierFirstBlood)).to.equal(true);
    expect([replacement.getExhausted(), replacement.getMovesMade(), replacement.getAttacksMade()])
      .to.deep.equal([true, 0, 0]);
  });

  it('starts building transformations with fresh slot state', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    gameSession.getGeneralForPlayer1().setPosition({ q: 4, r: 0 });
    gameSession.getGeneralForPlayer2().setPosition({ q: 4, r: 4 });
    const unit = gameSession.createCardForIdentifier(SDK.Cards.Phobies.RazorMouth);
    unit.setOwnerId(gameSession.getPlayer1Id());
    gameSession.applyCardToBoard(unit, 3, 0, unit.createNewCardData(), null);
    expect(unit.getIsActive()).to.equal(true);
    unit.refreshExhaustion();
    unit.recordMove();
    unit.recordAttack();
    const originalPosition = unit.getPosition();
    const transformedData = gameSession.createCardForIdentifier(50003).createNewCardData();
    const ModifierBuilding = require('../../../../app/sdk/modifiers/modifierBuilding.coffee');
    gameSession.applyModifierContextObject(ModifierBuilding.createContextObject('Building test', transformedData, 1), unit);
    const building = unit.getActiveModifierByClass(ModifierBuilding);
    const validators = gameSession.getValidators();
    gameSession.setValidators([]);
    try {
      building.progressBuild();
    } finally {
      gameSession.setValidators(validators);
    }
    const replacement = gameSession.getBoard().getUnitAtPosition(originalPosition);
    expect(replacement.getId()).to.equal(50003);
    expect([replacement.getMovesMade(), replacement.getAttacksMade(), replacement.getExhausted()])
      .to.deep.equal([0, 0, false]);
  });
});
