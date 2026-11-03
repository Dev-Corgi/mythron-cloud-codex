const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const { expect } = require('chai');
const Logger = require('../../../../app/common/logger.coffee');
const SDK = require('../../../../app/sdk.coffee');
const UtilsSDK = require('../../../utils/utils_sdk');

Logger.enabled = false;

// Characterization tests for the action-point (AP) rules: they describe observable
// behavior only, so they hold both before and after AP checks move behind Entity accessors.
describe('action point accessors', () => {
  let gameSession;

  beforeEach(() => {
    UtilsSDK.setupSession(
      [{ id: SDK.Cards.Faction1.General }],
      [{ id: SDK.Cards.Faction2.General }], true, true);
    gameSession = SDK.GameSession.getInstance();
  });

  afterEach(() => SDK.GameSession.reset());

  // modifier activation normally runs inside an action; run it without validators so its sub-actions apply
  const activate = (unit, modifierClass) => {
    const validators = gameSession.getValidators();
    gameSession.setValidators([]);
    unit.getActiveModifierByClass(modifierClass).onActivate();
    gameSession.setValidators(validators);
  };

  const addEnemy = (position) => {
    const target = gameSession.createCardForIdentifier(SDK.Cards.Faction4.Wraithling);
    target.setOwnerId(gameSession.getPlayer2Id());
    target.setPosition(position);
    target.setIsPlayed(true);
    target.setIsRemoved(false);
    gameSession.getBoard().addCard(target);
    return target;
  };

  const placeFriendly = (cardId) => {
    const unit = gameSession.createCardForIdentifier(cardId);
    unit.setOwnerId(gameSession.getPlayer1Id());
    const board = gameSession.getBoard();
    const general = gameSession.getGeneralForPlayer1();
    general.setPosition({ q: 4, r: 0 });
    const position = board.getHexNeighbors(general.getPosition()).find((candidate) =>
      board.hasTileAtPosition(candidate) && !board.getUnitAtPosition(candidate));
    gameSession.applyCardToBoard(unit, position.q, position.r, null, null);
    return unit;
  };

  describe('V2_MOVE_ATTACK', () => {
    it('spends one point per move then attack and rejects a third explicit action', () => {
      gameSession.setRuleset('practice-sandbox-hex', 2);
      const unit = gameSession.getGeneralForPlayer1();
      unit.setPosition({ q: 3, r: 2 });
      unit.setSpeed(1);
      unit.refreshExhaustion();
      const target = addEnemy({ q: 5, r: 2 });

      const move = unit.actionMove({ q: 4, r: 2 });
      gameSession.executeAction(move);
      expect(move.getIsValid()).to.equal(true);
      expect(unit.getActionPoints()).to.equal(1);
      expect(unit.getMovesMade()).to.equal(1);

      const attack = unit.actionAttack(target);
      gameSession.executeAction(attack);
      expect(attack.getIsValid()).to.equal(true);
      expect(unit.getActionPoints()).to.equal(0);
      expect(unit.getAttacksMade()).to.equal(1);
      expect(unit.getIsExhausted()).to.equal(true);
      expect(unit.getCanMove()).to.equal(false);
      expect(unit.getCanAttack()).to.equal(false);

      const third = unit.actionMove({ q: 3, r: 2 });
      gameSession.validateAction(third, false);
      expect(third.getIsValid()).to.equal(false);
      const thirdAttack = unit.actionAttack(target);
      gameSession.validateAction(thirdAttack, false);
      expect(thirdAttack.getIsValid()).to.equal(false);
    });
  });

  describe('IMPLICIT_ATTACK', () => {
    it('spends no point and no attack count for an implicit attack', () => {
      gameSession.setRuleset('practice-sandbox-hex', 2);
      const unit = gameSession.getGeneralForPlayer1();
      unit.setPosition({ q: 3, r: 2 });
      unit.refreshExhaustion();
      const target = addEnemy({ q: 4, r: 2 });

      const attack = unit.actionAttack(target);
      const parent = new SDK.Action(gameSession);
      UtilsSDK.executeActionWithoutValidation(parent);
      attack.setParentAction(parent);
      expect(attack.getIsImplicit()).to.equal(true);
      UtilsSDK.executeActionWithoutValidation(attack);
      expect(target.getDamage()).to.be.above(0);
      expect(unit.getActionPoints()).to.equal(2);
      expect(unit.getHasSpentActionPointThisTurn()).to.equal(false);
      expect(unit.getAttacksMade()).to.equal(0);
    });
  });

  describe('FIRST_BLOOD', () => {
    beforeEach(() => {
      gameSession.setRuleset('practice-sandbox-hex', 2);
      gameSession.wasActionExecutedDuringTurn = () => true;
      gameSession.getCanCardBeScheduledForRemoval = () => true;
    });

    it('treats a version 2 unit with unspent points as not yet acted (FirstBlood)', () => {
      const unit = gameSession.getGeneralForPlayer1();
      unit.setActionPoints(0);
      unit.setHasSpentActionPointThisTurn(false);
      const ModifierFirstBlood = require('../../../../app/sdk/modifiers/modifierFirstBlood.coffee');
      gameSession.applyModifierContextObject(ModifierFirstBlood.createContextObject(), unit);
      activate(unit, ModifierFirstBlood);
      expect(unit.getActionPoints()).to.equal(2);
    });

    it('treats a version 2 unit as acted after one spend (FirstBlood)', () => {
      const unit = gameSession.getGeneralForPlayer1();
      unit.refreshExhaustion();
      unit.spendActionPoint();
      unit.spendActionPoint();
      const ModifierFirstBlood = require('../../../../app/sdk/modifiers/modifierFirstBlood.coffee');
      gameSession.applyModifierContextObject(ModifierFirstBlood.createContextObject(), unit);
      activate(unit, ModifierFirstBlood);
      expect(unit.getActionPoints()).to.equal(0);
    });

    it('treats a version 2 unit with unspent points as not yet acted (PseudoRush)', () => {
      const unit = gameSession.getGeneralForPlayer1();
      unit.setActionPoints(0);
      unit.setHasSpentActionPointThisTurn(false);
      const ModifierPseudoRush = require('../../../../app/sdk/modifiers/modifierPseudoRush.coffee');
      gameSession.applyModifierContextObject(ModifierPseudoRush.createContextObject(), unit);
      activate(unit, ModifierPseudoRush);
      expect(unit.getActionPoints()).to.equal(2);
    });

    it('treats a version 2 unit as acted after one spend (PseudoRush)', () => {
      const unit = gameSession.getGeneralForPlayer1();
      unit.refreshExhaustion();
      unit.spendActionPoint();
      unit.spendActionPoint();
      const ModifierPseudoRush = require('../../../../app/sdk/modifiers/modifierPseudoRush.coffee');
      gameSession.applyModifierContextObject(ModifierPseudoRush.createContextObject(), unit);
      activate(unit, ModifierPseudoRush);
      expect(unit.getActionPoints()).to.equal(0);
    });

    it('uses moves and attacks in version 1 (FirstBlood and PseudoRush)', () => {
      gameSession.setRuleset('practice-sandbox-hex', 1);
      const ModifierFirstBlood = require('../../../../app/sdk/modifiers/modifierFirstBlood.coffee');
      const ModifierPseudoRush = require('../../../../app/sdk/modifiers/modifierPseudoRush.coffee');
      const fresh = gameSession.getGeneralForPlayer1();
      fresh.setExhausted(true);
      gameSession.applyModifierContextObject(ModifierFirstBlood.createContextObject(), fresh);
      activate(fresh, ModifierFirstBlood);
      expect(fresh.getExhausted()).to.equal(false);

      const acted = gameSession.getGeneralForPlayer2();
      acted.setExhausted(true);
      acted.setMovesMade(1);
      gameSession.applyModifierContextObject(ModifierPseudoRush.createContextObject(), acted);
      activate(acted, ModifierPseudoRush);
      expect(acted.getExhausted()).to.equal(true);
    });
  });

  describe('TRANSFORM', () => {
    it('carries one point and the spent flag to the transformed unit', () => {
      gameSession.setRuleset('practice-sandbox-hex', 2);
      const original = placeFriendly(SDK.Cards.Neutral.GolemMetallurgist);
      original.refreshExhaustion();
      original.spendActionPoint();
      const position = original.getPosition();
      const state = SDK.ModifierTransformed.createContextObject(
        original.getExhausted(), original.getMovesMade(), original.getAttacksMade(),
        original.getActionPoints(), original.getHasSpentActionPointThisTurn());
      const RemoveAction = require('../../../../app/sdk/actions/removeAction.coffee');
      const remove = new RemoveAction(gameSession);
      remove.setTarget(original);
      UtilsSDK.executeActionWithoutValidation(remove);

      const data = gameSession.createCardForIdentifier(SDK.Cards.Neutral.DragoneboneGolem).createCardData();
      data.additionalInherentModifiersContextObjects = [state];
      const PlayCardAsTransformAction = require('../../../../app/sdk/actions/playCardAsTransformAction.coffee');
      const transform = new PlayCardAsTransformAction(gameSession, original.getOwnerId(), position, data);
      UtilsSDK.executeActionWithoutValidation(transform);
      const replacement = transform.getCard();
      expect(replacement.getActionPoints()).to.equal(1);
      expect(replacement.getHasSpentActionPointThisTurn()).to.equal(true);
      expect(replacement.getIsExhausted()).to.equal(false);
    });

    it('carries one point and the spent flag through a completed building', () => {
      gameSession.setRuleset('practice-sandbox-hex', 2);
      const original = placeFriendly(SDK.Cards.Neutral.GolemMetallurgist);
      original.refreshExhaustion();
      original.spendActionPoint();
      const data = gameSession.createCardForIdentifier(SDK.Cards.Neutral.DragoneboneGolem).createCardData();
      const ModifierBuilding = require('../../../../app/sdk/modifiers/modifierBuilding.coffee');
      gameSession.applyModifierContextObject(ModifierBuilding.createContextObject('Building test', data, 1), original);
      original.getActiveModifierByClass(ModifierBuilding).transformSelf();
      const carried = data.additionalModifiersContextObjects.find((m) => m.type === SDK.ModifierTransformed.type);
      expect(carried.actionPoints).to.equal(1);
      expect(carried.actionPointsSpentThisTurn).to.equal(true);
    });
  });

  describe('ABILITY', () => {
    const readyUnitAbility = () => {
      const scout = gameSession.createCardForIdentifier(SDK.Cards.Neutral.PlanarScout);
      scout.setOwnerId(gameSession.getPlayer1Id());
      gameSession.applyCardToBoard(scout, 1, 0, scout.createNewCardData(), null);
      scout.getActiveAbilityState().lockdown = 0;
      return scout;
    };

    it('rejects a unit ability at 0 points and accepts it at 1 point', () => {
      gameSession.setRuleset('practice-sandbox-hex', 2);
      const player = gameSession.getPlayer1();
      const scout = readyUnitAbility();
      const enemy = gameSession.getGeneralForPlayer2();
      enemy.setPosition({ q: 4, r: 4 });

      scout.setActionPoints(0);
      const rejected = player.actionUseActiveAbility(scout.getIndex(), enemy.getPosition());
      gameSession.executeAction(rejected);
      expect(rejected.getIsValid()).to.equal(false);
      expect(scout.getActionPoints()).to.equal(0);
      expect(scout.getActiveAbilityState().cooldown).to.equal(0);

      scout.setActionPoints(1);
      const accepted = player.actionUseActiveAbility(scout.getIndex(), enemy.getPosition());
      gameSession.executeAction(accepted);
      expect(accepted.getIsValid(), accepted.getValidationMessage()).to.equal(true);
      expect(scout.getActionPoints()).to.equal(0);
      expect(scout.getHasSpentActionPointThisTurn()).to.equal(true);
      expect(scout.getActiveAbilityState().cooldown).to.equal(1);
    });

    it('rejects Bloodbound at 0 points and accepts it at 1 point', () => {
      gameSession.setRuleset('practice-sandbox-hex', 2);
      const player = gameSession.getPlayer1();
      const general = gameSession.getGeneralForPlayer1();
      general.setPosition({ q: 4, r: 0 });
      gameSession.getGeneralForPlayer2().setPosition({ q: 4, r: 4 });
      const ally = gameSession.createCardForIdentifier(SDK.Cards.Neutral.GolemMetallurgist);
      ally.setOwnerId(player.getPlayerId());
      gameSession.applyCardToBoard(ally, 3, 0, null, null);
      for (let i = 0; i < 4; i++) gameSession.executeAction(gameSession.actionEndTurn());
      const state = general.getActiveAbilityState();
      expect(state).to.include({ lockdown: 0, cooldown: 0 });
      const target = player.getCurrentSignatureCard().getValidTargetPositions()[0];

      general.setActionPoints(0);
      const rejected = player.actionPlaySignatureCard(target);
      gameSession.executeAction(rejected);
      expect(rejected.getIsValid()).to.equal(false);
      expect(state.cooldown).to.equal(0);

      general.setActionPoints(1);
      const accepted = player.actionPlaySignatureCard(target);
      gameSession.executeAction(accepted);
      expect(accepted.getIsValid(), accepted.getValidationMessage()).to.equal(true);
      expect(general.getActionPoints()).to.equal(0);
      expect(state.cooldown).to.equal(2);
    });
  });

  describe('V1_LEGACY', () => {
    it('keeps old move/attack/exhaustion behavior and reports no action points', () => {
      gameSession.setRuleset('practice-sandbox-hex', 1);
      const unit = gameSession.getGeneralForPlayer1();
      unit.setPosition({ q: 3, r: 2 });
      unit.setSpeed(1);
      unit.refreshExhaustion();
      const target = addEnemy({ q: 5, r: 2 });
      expect(unit.getUsesActionPoints()).to.equal(false);
      expect(unit.getActionPoints()).to.equal(0);
      expect(unit.getHasSpentActionPointThisTurn()).to.equal(false);
      expect(unit.getCanMove()).to.equal(true);
      expect(unit.getCanAttack()).to.equal(true);

      const move = unit.actionMove({ q: 4, r: 2 });
      gameSession.executeAction(move);
      expect(move.getIsValid()).to.equal(true);
      expect(unit.getMovesMade()).to.equal(1);
      expect(unit.getCanMove()).to.equal(false);
      expect(unit.getCanAttack()).to.equal(true);

      const attack = unit.actionAttack(target);
      gameSession.executeAction(attack);
      expect(attack.getIsValid()).to.equal(true);
      expect(unit.getAttacksMade()).to.equal(1);
      expect(unit.getActionPoints()).to.equal(0);
      expect(unit.getCanAttack()).to.equal(false);
      expect(unit.getIsExhausted()).to.equal(true);
    });

    it('serializes an identical Transformed context for a version 1 building transform', () => {
      gameSession.setRuleset('practice-sandbox-hex', 1);
      const original = placeFriendly(SDK.Cards.Neutral.GolemMetallurgist);
      original.setExhausted(true);
      original.setMovesMade(1);
      original.setAttacksMade(1);
      const data = gameSession.createCardForIdentifier(SDK.Cards.Neutral.DragoneboneGolem).createCardData();
      const ModifierBuilding = require('../../../../app/sdk/modifiers/modifierBuilding.coffee');
      gameSession.applyModifierContextObject(ModifierBuilding.createContextObject('Building test', data, 1), original);
      original.getActiveModifierByClass(ModifierBuilding).transformSelf();
      const carried = data.additionalModifiersContextObjects.find((m) => m.type === SDK.ModifierTransformed.type);
      const expected = JSON.parse(JSON.stringify(SDK.ModifierTransformed.createContextObject(false, 0, 0)));
      expect(JSON.parse(JSON.stringify(carried))).to.deep.equal(expected);
    });

    it('keeps the version 1 Transformed context free of action-point data when built from an entity', () => {
      gameSession.setRuleset('practice-sandbox-hex', 1);
      const unit = gameSession.getGeneralForPlayer1();
      const context = JSON.parse(JSON.stringify(SDK.ModifierTransformed.createContextObject(
        unit.getExhausted(), unit.getMovesMade(), unit.getAttacksMade(),
        unit.getActionPoints(), unit.getHasSpentActionPointThisTurn())));
      expect(context.actionPoints).to.equal(0);
      expect(context.actionPointsSpentThisTurn).to.equal(false);
      expect(context.exhausted).to.equal(unit.getExhausted());
    });
  });

  describe('accessor edge cases', () => {
    it('reports out-of-points and ability readiness from the point count in version 2 only', () => {
      gameSession.setRuleset('practice-sandbox-hex', 2);
      const unit = gameSession.getGeneralForPlayer1();
      unit.refreshExhaustion();
      expect([unit.getIsOutOfActionPoints(), unit.getCanUseActiveAbility()]).to.deep.equal([false, true]);
      unit.spendActionPoint();
      expect([unit.getIsOutOfActionPoints(), unit.getCanUseActiveAbility()]).to.deep.equal([false, true]);
      unit.spendActionPoint();
      expect([unit.getIsOutOfActionPoints(), unit.getCanUseActiveAbility()]).to.deep.equal([true, false]);
      expect(unit.recordActiveAbilityUse()).to.equal(false);
      gameSession.setRuleset('practice-sandbox-hex', 1);
      expect([unit.getIsOutOfActionPoints(), unit.getCanUseActiveAbility()]).to.deep.equal([false, false]);
    });

    it('rejects an automatic attack from a unit with no points left', () => {
      gameSession.setRuleset('practice-sandbox-hex', 2);
      const unit = gameSession.getGeneralForPlayer1();
      unit.setPosition({ q: 3, r: 2 });
      const target = addEnemy({ q: 4, r: 2 });
      unit.setActionPoints(0);
      const attack = unit.actionAttack(target);
      attack.setIsAutomatic(true);
      gameSession.validateAction(attack, false);
      expect(attack.getIsValid()).to.equal(false);
    });

    it('tracks whether a unit has acted this turn in both rule sets', () => {
      gameSession.setRuleset('practice-sandbox-hex', 1);
      const legacyUnit = gameSession.getGeneralForPlayer1();
      expect(legacyUnit.getHasActedThisTurn()).to.equal(false);
      legacyUnit.setAttacksMade(1);
      expect(legacyUnit.getHasActedThisTurn()).to.equal(true);

      gameSession.setRuleset('practice-sandbox-hex', 2);
      const unit = gameSession.getGeneralForPlayer2();
      unit.refreshExhaustion();
      expect(unit.getHasActedThisTurn()).to.equal(false);
      unit.spendActionPoint();
      expect(unit.getHasActedThisTurn()).to.equal(true);
    });

    it('restores action-point state in version 2, skips nulls, and ignores it in version 1', () => {
      gameSession.setRuleset('practice-sandbox-hex', 2);
      const unit = gameSession.getGeneralForPlayer1();
      unit.refreshExhaustion();
      unit.restoreActionPointState(1, true);
      expect([unit.getActionPoints(), unit.getHasSpentActionPointThisTurn()]).to.deep.equal([1, true]);
      unit.restoreActionPointState(undefined, null);
      expect([unit.getActionPoints(), unit.getHasSpentActionPointThisTurn()]).to.deep.equal([1, true]);

      gameSession.setRuleset('practice-sandbox-hex', 1);
      const before = [unit.getActionPoints(), unit.getHasSpentActionPointThisTurn(), unit.actionPoints];
      unit.restoreActionPointState(0, true);
      expect([unit.getActionPoints(), unit.getHasSpentActionPointThisTurn(), unit.actionPoints]).to.deep.equal(before);
    });
  });
});
