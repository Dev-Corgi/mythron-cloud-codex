const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const { expect } = require('chai');
const Logger = require('../../../../app/common/logger.coffee');
const SDK = require('../../../../app/sdk.coffee');
const UtilsSDK = require('../../../utils/utils_sdk');

Logger.enabled = false;

describe('active ability state', () => {
  let gameSession;

  beforeEach(() => {
    UtilsSDK.setupSession(
      [{ id: SDK.Cards.Faction1.General }, { id: SDK.Cards.Neutral.GolemMetallurgist }, { id: SDK.Cards.Neutral.PlanarScout }],
      [{ id: SDK.Cards.Faction2.General }],
      true,
      true,
    );
    gameSession = SDK.GameSession.getInstance();
    gameSession.setRuleset('practice-sandbox-hex', 2);
  });

  afterEach(() => SDK.GameSession.reset());

  const deployPhobies = (cardId, ownerId, position) => {
    const unit = gameSession.createCardForIdentifier(cardId);
    unit.setOwnerId(ownerId);
    gameSession.applyCardToBoard(unit, position.q, position.r, unit.createNewCardData(), null);
    expect(unit.getIsActive(), `Phobies card ${cardId} should deploy at ${position.q},${position.r}`).to.equal(true);
    unit.setActionPoints(2);
    const state = unit.getActiveAbilityState();
    if (state) {
      state.lockdown = 0;
      state.cooldown = 0;
    }
    return unit;
  };

  const hexDistance = (left, right) => Math.max(
    Math.abs(left.q - right.q),
    Math.abs(left.r - right.r),
    Math.abs((left.q + left.r) - (right.q + right.r)),
  );

  const findOpenPosition = (origin, minimumDistance, maximumDistance) => gameSession.getBoard().getPositions().find((position) => {
    const distance = hexDistance(origin, position);
    return distance >= minimumDistance && distance <= maximumDistance
      && !gameSession.getBoard().getCardAtPosition(position, SDK.CardType.Entity);
  });

  const useUnitAbility = (unit, position) => {
    const action = gameSession.getPlayerById(unit.getOwnerId()).actionUseActiveAbility(unit.getIndex(), position);
    gameSession.executeAction(action);
    return action;
  };

  // the Lyonar Bloodbound spell needs a friendly unit to target
  const addAlly = () => {
    const ally = gameSession.createCardForIdentifier(SDK.Cards.Neutral.GolemMetallurgist);
    ally.setOwnerId(gameSession.getPlayer1Id());
    gameSession.applyCardToBoard(ally, 3, 0, null, null);
    return ally;
  };

  it('defines Planar Scout Phoenix Fire and initializes per-instance Lockdown/Cooldown', () => {
    const scout = gameSession.createCardForIdentifier(SDK.Cards.Neutral.PlanarScout);
    expect(scout.activeAbility).to.deep.equal({ effectCardId: SDK.Cards.Spell.PhoenixFire, lockdown: 1, cooldown: 1 });

    const deployed = gameSession.createCardForIdentifier(SDK.Cards.Neutral.PlanarScout);
    deployed.setOwnerId(gameSession.getPlayer1Id());
    gameSession.applyCardToBoard(deployed, 0, 1, deployed.createNewCardData(), null);
    expect(deployed.getActiveAbilityState()).to.include({
      lockdown: 1, cooldown: 0, baseLockdown: 1, baseCooldown: 1,
    });
    const data = deployed.createCardData();
    expect(data.activeAbilityState).to.deep.equal(deployed.getActiveAbilityState());
  });

  it('resolves Monty against an enemy General with the caster as damage source', () => {
    const caster = deployPhobies(50014, gameSession.getPlayer1Id(), { q: 2, r: 2 });
    const allyPosition = findOpenPosition(caster.getPosition(), 1, 1);
    const ally = deployPhobies(50003, gameSession.getPlayer1Id(), allyPosition);
    const enemyGeneral = gameSession.getGeneralForPlayer2();
    enemyGeneral.setPosition({ q: 4, r: 2 });
    caster.setDamage(500);

    const valid = useUnitAbility(caster, enemyGeneral.getPosition());
    expect(valid.getIsValid(), valid.getValidationMessage()).to.equal(true);
    expect(enemyGeneral.getDamage()).to.equal(450);
    const damageAction = valid.getFlattenedActionTree().find((subAction) => subAction instanceof SDK.DamageAction);
    expect(damageAction.getSource()).to.equal(caster);
  });

  it('rejects Monty allies and enemy units outside its range', () => {
    const caster = deployPhobies(50014, gameSession.getPlayer1Id(), { q: 2, r: 2 });
    const allyPosition = findOpenPosition(caster.getPosition(), 1, 1);
    const ally = deployPhobies(50003, gameSession.getPlayer1Id(), allyPosition);
    const allyUse = useUnitAbility(caster, ally.getPosition());
    expect(allyUse.getIsValid()).to.equal(false);
    const distantPosition = findOpenPosition(caster.getPosition(), 3, 6);
    const distantEnemy = deployPhobies(50003, gameSession.getPlayer2Id(), distantPosition);
    const distantUse = useUnitAbility(caster, distantEnemy.getPosition());
    expect(distantUse.getIsValid()).to.equal(false);
  });

  it('heals and buffs only a friendly minion for I feel great!', () => {
    const caster = deployPhobies(50005, gameSession.getPlayer1Id(), { q: 2, r: 2 });
    const ally = deployPhobies(50003, gameSession.getPlayer1Id(), findOpenPosition(caster.getPosition(), 1, 1));
    const enemy = deployPhobies(50003, gameSession.getPlayer2Id(), findOpenPosition(caster.getPosition(), 1, 1));
    ally.setDamage(500);
    const attack = ally.getATK();

    const action = useUnitAbility(caster, ally.getPosition());
    expect(action.getIsValid(), action.getValidationMessage()).to.equal(true);
    expect(ally.getDamage()).to.equal(0);
    expect(ally.getATK()).to.equal(attack + 300);
    const healAction = action.getFlattenedActionTree().find((subAction) => subAction instanceof SDK.HealAction);
    expect(healAction.getSource()).to.equal(caster);
    const attackBuff = ally.getActiveModifiers().find((modifier) => modifier.attributeBuffs && modifier.attributeBuffs.atk === 300);
    expect(attackBuff.durationEndTurn).to.equal(1);
    expect(attackBuff.durationEndTurnPlayerId).to.equal(gameSession.getPlayer1Id());

    caster.getActiveAbilityState().cooldown = 0;
    const enemyUse = useUnitAbility(caster, enemy.getPosition());
    expect(enemyUse.getIsValid()).to.equal(false);
  });

  it('restores the full 650 and 1500 Health amounts, and rejects a General for Pure Adrenaline', () => {
    const feelGreat = deployPhobies(50005, gameSession.getPlayer1Id(), { q: 2, r: 2 });
    const ally = deployPhobies(50003, gameSession.getPlayer1Id(), findOpenPosition(feelGreat.getPosition(), 1, 1));
    ally.setDamage(1000);
    const first = useUnitAbility(feelGreat, ally.getPosition());
    expect(first.getIsValid(), first.getValidationMessage()).to.equal(true);
    expect(ally.getDamage()).to.equal(350);

    const pure = deployPhobies(50016, gameSession.getPlayer1Id(), { q: 1, r: 2 });
    const secondAlly = deployPhobies(50003, gameSession.getPlayer1Id(), findOpenPosition(pure.getPosition(), 1, 1));
    secondAlly.setDamage(2000);
    const second = useUnitAbility(pure, secondAlly.getPosition());
    expect(second.getIsValid(), second.getValidationMessage()).to.equal(true);
    expect(secondAlly.getDamage()).to.equal(500);
    pure.getActiveAbilityState().cooldown = 0;
    const generalUse = useUnitAbility(pure, gameSession.getGeneralForPlayer1().getPosition());
    expect(generalUse.getIsValid()).to.equal(false);
  });

  it('resolves Clang! Clang! and Helping Hand for +300 Attack through one owner turn', () => {
    for (const [casterId, targetDistance] of [[50017, 1], [50026, 2]]) {
      SDK.GameSession.reset();
      UtilsSDK.setupSession(
        [{ id: SDK.Cards.Faction1.General }, { id: SDK.Cards.Neutral.GolemMetallurgist }, { id: SDK.Cards.Neutral.PlanarScout }],
        [{ id: SDK.Cards.Faction2.General }],
        true,
        true,
      );
      gameSession = SDK.GameSession.getInstance();
      gameSession.setRuleset('practice-sandbox-hex', 2);
      const caster = deployPhobies(casterId, gameSession.getPlayer1Id(), { q: 2, r: 2 });
      const target = deployPhobies(50003, gameSession.getPlayer1Id(), findOpenPosition(caster.getPosition(), targetDistance, targetDistance));
      const baseAttack = target.getATK();
      const action = useUnitAbility(caster, target.getPosition());
      expect(action.getIsValid(), action.getValidationMessage()).to.equal(true);
      expect(target.getATK()).to.equal(baseAttack + 300);
      const modifier = target.getActiveModifiers().find((item) => item.attributeBuffs && item.attributeBuffs.atk === 300);
      expect(modifier.durationEndTurn).to.equal(1);
      expect(modifier.durationEndTurnPlayerId).to.equal(gameSession.getPlayer1Id());
      for (let turn = 0; turn < 4; turn++) {
        const endingPlayerId = gameSession.getCurrentPlayerId();
        gameSession.executeAction(gameSession.actionEndTurn());
        if (endingPlayerId === gameSession.getPlayer1Id()) break;
      }
      expect(target.getATK()).to.equal(baseAttack);
    }
  });

  it('rejects invalid side and range targets for friendly abilities and Peek-a-booOO!', () => {
    const clang = deployPhobies(50017, gameSession.getPlayer1Id(), { q: 2, r: 2 });
    const helping = deployPhobies(50026, gameSession.getPlayer1Id(), { q: 1, r: 2 });
    const feelGreat = deployPhobies(50005, gameSession.getPlayer1Id(), { q: 0, r: 2 });
    const peek = deployPhobies(50024, gameSession.getPlayer1Id(), { q: 3, r: 2 });
    const enemy = deployPhobies(50003, gameSession.getPlayer2Id(), findOpenPosition(clang.getPosition(), 1, 1));
    const ally = deployPhobies(50003, gameSession.getPlayer1Id(), findOpenPosition(peek.getPosition(), 1, 1));
    expect(useUnitAbility(clang, enemy.getPosition()).getIsValid()).to.equal(false);
    expect(useUnitAbility(helping, enemy.getPosition()).getIsValid()).to.equal(false);
    expect(useUnitAbility(peek, ally.getPosition()).getIsValid()).to.equal(false);
    expect(useUnitAbility(feelGreat, findOpenPosition(feelGreat.getPosition(), 2, 2)).getIsValid()).to.equal(false);
    expect(useUnitAbility(clang, findOpenPosition(clang.getPosition(), 3, 3)).getIsValid()).to.equal(false);
  });

  it('centers Group Hug on Zurael, excluding the caster and enemy units', () => {
    const caster = deployPhobies(50031, gameSession.getPlayer1Id(), { q: 2, r: 2 });
    const ally = deployPhobies(50019, gameSession.getPlayer1Id(), findOpenPosition(caster.getPosition(), 1, 1));
    const ally2 = deployPhobies(50019, gameSession.getPlayer1Id(), findOpenPosition(caster.getPosition(), 1, 1));
    const enemy = deployPhobies(50003, gameSession.getPlayer2Id(), findOpenPosition(caster.getPosition(), 1, 1));
    caster.setDamage(200);
    ally.setDamage(1500);
    ally2.setDamage(1700);
    enemy.setDamage(300);

    const action = useUnitAbility(caster, caster.getPosition());
    expect(action.getIsValid(), action.getValidationMessage()).to.equal(true);
    expect(ally.getDamage()).to.equal(400);
    expect(ally2.getDamage()).to.equal(600);
    const healActions = action.getFlattenedActionTree().filter((subAction) => subAction instanceof SDK.HealAction);
    expect(healActions).to.have.length(2);
    healActions.forEach((healAction) => expect(healAction.getSource()).to.equal(caster));
    expect(caster.getDamage()).to.equal(200);
    expect(enemy.getDamage()).to.equal(300);

    caster.getActiveAbilityState().cooldown = 0;
    const otherCenter = useUnitAbility(caster, ally.getPosition());
    expect(otherCenter.getIsValid()).to.equal(false);
  });

  it('applies Peek-a-booOO! to an enemy General for two affected-owner turns', () => {
    const caster = deployPhobies(50024, gameSession.getPlayer1Id(), { q: 2, r: 2 });
    const enemyGeneral = gameSession.getGeneralForPlayer2();
    enemyGeneral.setPosition({ q: 4, r: 2 });
    const attack = enemyGeneral.getATK();

    const action = useUnitAbility(caster, enemyGeneral.getPosition());
    expect(action.getIsValid(), action.getValidationMessage()).to.equal(true);
    expect(enemyGeneral.getATK()).to.equal(Math.max(0, attack - 300));
    const debuff = enemyGeneral.getActiveModifiers().find((modifier) => modifier.attributeBuffs && modifier.attributeBuffs.atk === -300);
    expect(debuff).to.exist;
    expect(debuff.durationEndTurn).to.equal(2);
    expect(debuff.durationEndTurnPlayerId).to.equal(gameSession.getPlayer2Id());

    const endOwnerTurn = (ownerId) => {
      for (let turn = 0; turn < 4; turn++) {
        const endingPlayerId = gameSession.getCurrentPlayerId();
        gameSession.executeAction(gameSession.actionEndTurn());
        if (endingPlayerId === ownerId) return;
      }
      throw new Error(`Could not reach end turn for ${ownerId}`);
    };
    endOwnerTurn(gameSession.getPlayer2Id());
    expect(enemyGeneral.getATK()).to.equal(Math.max(0, attack - 300));
    endOwnerTurn(gameSession.getPlayer2Id());
    expect(enemyGeneral.getATK()).to.equal(attack);
  });

  it('starts a non-General unit with fresh ability state even when it carries copied state', () => {
    const copy = gameSession.createCardForIdentifier(SDK.Cards.Neutral.PlanarScout);
    copy.setOwnerId(gameSession.getPlayer1Id());
    copy.activeAbilityState = {
      lockdown: 0, cooldown: 1, baseLockdown: 1, baseCooldown: 1, handSlotIndex: 5,
    };
    gameSession.applyCardToBoard(copy, 0, 1, copy.createNewCardData(), null);
    expect(copy.getActiveAbilityState()).to.deep.equal({
      lockdown: 1, cooldown: 0, baseLockdown: 1, baseCooldown: 1,
    });
  });

  it('lets UseActiveAbilityAction use the General, resolving the effect from its signature data', () => {
    const player = gameSession.getPlayer1();
    const general = gameSession.getGeneralForPlayer1();
    general.setPosition({ q: 4, r: 0 });
    gameSession.getGeneralForPlayer2().setPosition({ q: 4, r: 4 });
    addAlly();
    general.getActiveAbilityState().lockdown = 0;
    general.setActionPoints(2);
    general.getActiveAbilityState().cooldown = 0;
    const previousSignature = player.getCurrentSignatureCard();
    const target = previousSignature.getValidTargetPositions()[0];
    const mana = player.getRemainingMana();
    const actionPoints = general.getActionPoints();
    const action = player.actionUseActiveAbility(general.getIndex(), target);
    expect(action).to.be.instanceOf(SDK.UseActiveAbilityAction);
    gameSession.executeAction(action);
    expect(action.getIsValid(), action.getValidationMessage()).to.equal(true);
    expect(action.getCard().getId()).to.equal(previousSignature.getId());
    expect(general.getActionPoints()).to.equal(actionPoints - 1);
    expect(player.getRemainingMana()).to.equal(mana);
    expect(general.getActiveAbilityState()).to.include({ lockdown: 0, cooldown: 2 });
    expect(player.signatureCardActive).to.equal(false);
    const nextSignature = player.getCurrentSignatureCard();
    expect(nextSignature).to.not.equal(undefined);
    expect(nextSignature.getIndex()).to.not.equal(previousSignature.getIndex());
    expect(nextSignature.getId()).to.equal(previousSignature.getId());
  });

  it('rejects the General ability while Lockdown or Cooldown is above 0, silenced, out of points, or on a bad target', () => {
    const ModifierSilence = require('../../../../app/sdk/modifiers/modifierSilence.coffee');
    const player = gameSession.getPlayer1();
    const general = gameSession.getGeneralForPlayer1();
    general.setPosition({ q: 4, r: 0 });
    gameSession.getGeneralForPlayer2().setPosition({ q: 4, r: 4 });
    addAlly();
    const state = general.getActiveAbilityState();
    const target = player.getCurrentSignatureCard().getValidTargetPositions()[0];
    const tryUse = (position) => {
      const action = player.actionUseActiveAbility(general.getIndex(), position);
      gameSession.executeAction(action);
      return action;
    };
    state.lockdown = 1;
    expect(tryUse(target).getIsValid()).to.equal(false);
    state.lockdown = 0;
    state.cooldown = 1;
    expect(tryUse(target).getIsValid()).to.equal(false);
    state.cooldown = 0;
    expect(tryUse({ q: 99, r: 99 }).getIsValid()).to.equal(false);
    gameSession.applyModifierContextObject(ModifierSilence.createContextObject(), general);
    expect(tryUse(target).getIsValid()).to.equal(false);
    gameSession.removeModifierFromCardByClass(ModifierSilence, general);
    general.setActionPoints(0);
    expect(tryUse(target).getIsValid()).to.equal(false);
    expect(state).to.include({ lockdown: 0, cooldown: 0 });
    general.setActionPoints(2);
    const ok = tryUse(target);
    expect(ok.getIsValid(), ok.getValidationMessage()).to.equal(true);
  });

  it('rejects a stunned unit ability and preserves separate ability-origin and caster source data', () => {
    const ModifierStunned = require('../../../../app/sdk/modifiers/modifierStunned.coffee');
    const CardType = require('../../../../app/sdk/cards/cardType.coffee');
    const scout = gameSession.createCardForIdentifier(SDK.Cards.Neutral.GolemMetallurgist);
    scout.activeAbility = { effectCardId: SDK.Cards.Spell.PhoenixFire, lockdown: 1, cooldown: 1 };
    scout.setOwnerId(gameSession.getPlayer1Id());
    gameSession.applyCardToBoard(scout, 0, 1, scout.createNewCardData(), null);
    scout.setActionPoints(2);
    scout.getActiveAbilityState().lockdown = 0;
    gameSession.getGeneralForPlayer2().setPosition({ q: 4, r: 4 });
    const use = gameSession.getPlayer1().actionUseActiveAbility(scout.getIndex(), { q: 4, r: 4 });
    gameSession.applyModifierContextObject(ModifierStunned.createContextObject(), scout);
    gameSession.executeAction(use);
    expect(use.getIsValid()).to.equal(false);
    expect(scout.getActionPoints()).to.equal(2);

    const abilityUse = gameSession.getPlayer1().actionUseActiveAbility(scout.getIndex(), { q: 4, r: 4 });
    const CardEligibility = require('../../../../app/sdk/rulesets/cardEligibility.coffee');
    const effectCard = gameSession.createCardForIdentifier(SDK.Cards.Spell.PhoenixFire);
    effectCard.type = CardType.AbilityEffect;
    effectCard.setOwnerId(scout.getOwnerId());
    expect(CardEligibility.isDeckCardId(effectCard.getId(), gameSession)).to.equal(false);
    expect(CardEligibility.isAllowedRuntimeCard(gameSession, effectCard, null)).to.equal(false);
    expect(CardEligibility.isAllowedRuntimeCard(gameSession, effectCard, abilityUse)).to.equal(true);
    effectCard.setOwnerId(gameSession.getPlayer2Id());
    expect(CardEligibility.isAllowedRuntimeCard(gameSession, effectCard, abilityUse)).to.equal(false);
    effectCard.setOwnerId(scout.getOwnerId());
    const originalEffectCardId = scout.activeAbility.effectCardId;
    scout.activeAbility.effectCardId = -1;
    expect(CardEligibility.isAllowedRuntimeCard(gameSession, effectCard, abilityUse)).to.equal(false);
    scout.activeAbility.effectCardId = originalEffectCardId;
    expect(CardType.getIsAbilityEffectCardType(CardType.AbilityEffect)).to.equal(true);
    expect(CardType.getIsSpellCardType(CardType.AbilityEffect)).to.equal(false);
    const ValidatorPlayCard = require('../../../../app/sdk/validators/validatorPlayCard.coffee');
    const PlayCardFromHandAction = require('../../../../app/sdk/actions/playCardFromHandAction.coffee');
    const PlaySignatureCardAction = require('../../../../app/sdk/actions/playSignatureCardAction.coffee');
    const validator = new ValidatorPlayCard(gameSession);
    const handPlay = new PlayCardFromHandAction(gameSession, scout.getOwnerId(), { q: 4, r: 4 }, 0);
    handPlay.setCard(effectCard);
    validator.onValidateAction({ action: handPlay });
    expect(handPlay.getIsValid()).to.equal(false);
    const signaturePlay = new PlaySignatureCardAction(gameSession);
    signaturePlay.setOwnerId(scout.getOwnerId());
    signaturePlay.setCard(effectCard);
    validator.onValidateAction({ action: signaturePlay });
    expect(signaturePlay.getIsValid()).to.equal(false);
    // A serialized marker alone cannot make a normal action ability-originated.
    const forgedMove = scout.actionMove({ q: 1, r: 1 });
    forgedMove.setIsAbilityOrigin(true);
    expect(forgedMove.getIsAbilityOrigin()).to.equal(false);

    gameSession.removeModifierFromCardByClass(ModifierStunned, scout);
    abilityUse.getCard().type = CardType.AbilityEffect;
    gameSession.executeAction(abilityUse);
    expect(abilityUse.getIsValid(), abilityUse.getValidationMessage()).to.equal(true);
    expect(scout.getActionPoints()).to.equal(1);
    const staleParentMove = scout.actionMove({ q: 1, r: 1 });
    staleParentMove.setIsAbilityOrigin(true);
    staleParentMove.setParentAction(abilityUse);
    expect(staleParentMove.getIsAbilityOrigin()).to.equal(false);
    const embeddedMove = scout.actionMove({ q: 1, r: 1 });
    abilityUse.setAbilityOriginOn(embeddedMove);
    expect(embeddedMove.getIsAbilityOrigin()).to.equal(true);
    expect(embeddedMove.getSource()).to.equal(scout);
    const ModifierCannotMove = require('../../../../app/sdk/modifiers/modifierCannotMove.coffee');
    gameSession.applyModifierContextObject(ModifierCannotMove.createContextObject(), scout);
    expect(scout.getCanMove()).to.equal(false);
    expect(scout.getCanMove(true)).to.equal(true);
    const moveTarget = gameSession.getBoard().getHexNeighbors(scout.getPosition()).find((position) => gameSession.getBoard().hasTileAtPosition(position) && !gameSession.getBoard().getUnitAtPosition(position));
    expect(scout.getMovementRange().getIsPositionValid(gameSession.getBoard(), scout, moveTarget, true)).to.equal(true);
    gameSession.executeAction(embeddedMove);
    expect(embeddedMove.getIsValid(), embeddedMove.getValidationMessage()).to.equal(true);
    expect(scout.getActionPoints()).to.equal(1);
    expect(scout.getMovesMade()).to.equal(1);
    const enemyGeneral = gameSession.getGeneralForPlayer2();
    const attackPosition = gameSession.getBoard().getHexNeighbors(scout.getPosition()).find((position) => gameSession.getBoard().hasTileAtPosition(position) && !gameSession.getBoard().getUnitAtPosition(position));
    enemyGeneral.setPosition(attackPosition);
    const embeddedAttack = scout.actionAttack(enemyGeneral);
    abilityUse.setAbilityOriginOn(embeddedAttack);
    expect(embeddedAttack.getIsAbilityOrigin()).to.equal(true);
    gameSession.executeAction(embeddedAttack);
    expect(embeddedAttack.getIsValid(), embeddedAttack.getValidationMessage()).to.equal(true);
    expect(scout.getActionPoints()).to.equal(1);
    expect(scout.getAttacksMade()).to.equal(1);

    const DamageAction = require('../../../../app/sdk/actions/damageAction.coffee');
    const HealAction = require('../../../../app/sdk/actions/healAction.coffee');
    const damage = new DamageAction(gameSession);
    const heal = new HealAction(gameSession);
    abilityUse.setAbilityOriginOn(damage);
    abilityUse.setAbilityOriginOn(heal);
    expect(damage.getIsAbilityOrigin()).to.equal(true);
    expect(heal.getIsAbilityOrigin()).to.equal(true);
    expect(damage.getSource()).to.equal(scout);
    expect(heal.getSource()).to.equal(scout);
  });

  it('advances a timed modifier only through its configured owner end-turn event', () => {
    const Modifier = require('../../../../app/sdk/modifiers/modifier.coffee');
    const unit = gameSession.getGeneralForPlayer1();
    const affectedOwnerId = gameSession.getPlayer2Id();
    const duration = Modifier.createContextObject({
      durationEndTurn: 1,
      durationEndTurnPlayerId: affectedOwnerId,
    });
    gameSession.applyModifierContextObject(duration, unit);
    const applied = unit.getModifiers().find((modifier) => modifier.durationEndTurnPlayerId === affectedOwnerId);
    gameSession.executeAction(gameSession.actionEndTurn()); // player 1 end turn
    expect(unit.getModifiers()).to.include(applied);
    gameSession.executeAction(gameSession.actionEndTurn()); // player 2 end turn
    expect(unit.getModifiers()).to.not.include(applied);
  });

  it('rejects PlaySignatureCardAction in version 2', () => {
    const player = gameSession.getPlayer1();
    const general = gameSession.getGeneralForPlayer1();
    general.setPosition({ q: 4, r: 0 });
    gameSession.getGeneralForPlayer2().setPosition({ q: 4, r: 4 });
    addAlly();
    general.getActiveAbilityState().lockdown = 0;
    general.setActionPoints(2);
    const signature = player.getCurrentSignatureCard();
    const target = signature.getValidTargetPositions()[0];
    const old = new SDK.PlaySignatureCardAction(gameSession, player.getPlayerId(), target, signature.getIndex());
    gameSession.executeAction(old);
    expect(old.getIsValid()).to.equal(false);
    expect(general.getActiveAbilityState()).to.include({ lockdown: 0, cooldown: 0 });
    expect(general.getActionPoints()).to.equal(2);
  });

  it('returns a UseActiveAbilityAction from Player.actionPlaySignatureCard in version 2 only', () => {
    const player = gameSession.getPlayer1();
    const action = player.actionPlaySignatureCard({ q: 4, r: 1 });
    expect(action).to.be.instanceOf(SDK.UseActiveAbilityAction);
    expect(action.sourceUnitIndex).to.equal(gameSession.getGeneralForPlayer1().getIndex());
    gameSession.setRuleset('practice-sandbox-hex', 1);
    expect(player.actionPlaySignatureCard({ q: 4, r: 1 })).to.be.instanceOf(SDK.PlaySignatureCardAction);
  });

  it('resolves the effect of a prismatic General from its prismatic signature spell', () => {
    SDK.GameSession.reset();
    const prismaticGeneral = SDK.Cards.getPrismaticCardId(SDK.Cards.Faction1.General);
    UtilsSDK.setupSession([{ id: prismaticGeneral }], [{ id: SDK.Cards.Faction2.General }], true, true);
    gameSession = SDK.GameSession.getInstance();
    gameSession.setRuleset('practice-sandbox-hex', 2);
    const player = gameSession.getPlayer1();
    const general = gameSession.getGeneralForPlayer1();
    general.setPosition({ q: 4, r: 0 });
    gameSession.getGeneralForPlayer2().setPosition({ q: 4, r: 4 });
    addAlly();
    general.getActiveAbilityState().lockdown = 0;
    general.setActionPoints(2);
    const signatureId = player.getSignatureCardData().id;
    expect(SDK.Cards.getIsPrismaticCardId(signatureId)).to.equal(true);
    const target = player.getCurrentSignatureCard().getValidTargetPositions()[0];
    const action = player.actionPlaySignatureCard(target);
    gameSession.executeAction(action);
    expect(action.getIsValid(), action.getValidationMessage()).to.equal(true);
    expect(action.getCard().getId()).to.equal(signatureId);
    expect(general.getActiveAbilityState().cooldown).to.equal(2);
  });

  it('uses the signature spell changed by PlayerModifierChangeSignatureCard', () => {
    const PlayerModifierChangeSignatureCard = require('../../../../app/sdk/playerModifiers/playerModifierChangeSignatureCard.coffee');
    const player = gameSession.getPlayer1();
    const general = gameSession.getGeneralForPlayer1();
    general.setPosition({ q: 4, r: 0 });
    gameSession.getGeneralForPlayer2().setPosition({ q: 4, r: 4 });
    addAlly();
    general.getActiveAbilityState().lockdown = 0;
    general.setActionPoints(2);
    const originalId = player.getSignatureCardData().id;
    expect(SDK.Cards.Spell.PhoenixFire).to.not.equal(originalId);
    gameSession.applyModifierContextObject(PlayerModifierChangeSignatureCard.createContextObject({ id: SDK.Cards.Spell.PhoenixFire }), general);
    expect(player.getSignatureCardData().id).to.equal(SDK.Cards.Spell.PhoenixFire);
    // the changed spell is the effect (the signature card itself stays as generated)
    const action = player.actionPlaySignatureCard({ q: 4, r: 4 });
    gameSession.executeAction(action);
    expect(action.getIsValid(), action.getValidationMessage()).to.equal(true);
    expect(action.getCard().getId()).to.equal(SDK.Cards.Spell.PhoenixFire);
    expect(general.getActiveAbilityState().cooldown).to.equal(2);
  });

  it('still fires spell watchers and the signature-play matcher on the General ability use', () => {
    const ModifierSpellWatch = require('../../../../app/sdk/modifiers/modifierSpellWatch.coffee');
    const SignaturePlay = require('../../../../app/sdk/actions/signaturePlay.coffee');
    const player = gameSession.getPlayer1();
    const general = gameSession.getGeneralForPlayer1();
    general.setPosition({ q: 4, r: 0 });
    gameSession.getGeneralForPlayer2().setPosition({ q: 4, r: 4 });
    general.getActiveAbilityState().lockdown = 0;
    general.setActionPoints(2);
    const ally = gameSession.createCardForIdentifier(SDK.Cards.Neutral.GolemMetallurgist);
    ally.setOwnerId(player.getPlayerId());
    gameSession.applyCardToBoard(ally, 3, 0, null, null);
    gameSession.applyModifierContextObject(ModifierSpellWatch.createContextObject(), ally);
    const original = ModifierSpellWatch.prototype.onSpellWatch;
    const seen = [];
    ModifierSpellWatch.prototype.onSpellWatch = function (action) { seen.push(action); };
    try {
      const target = player.getCurrentSignatureCard().getValidTargetPositions()[0];
      const action = player.actionPlaySignatureCard(target);
      gameSession.executeAction(action);
      expect(action.getIsValid(), action.getValidationMessage()).to.equal(true);
      expect(seen).to.include(action);
      expect(SignaturePlay.matches(action)).to.equal(true);
    } finally {
      ModifierSpellWatch.prototype.onSpellWatch = original;
    }
  });

  describe('modifiers that react to a signature play', () => {
    let player;
    let general;

    beforeEach(() => {
      player = gameSession.getPlayer1();
      general = gameSession.getGeneralForPlayer1();
      general.setPosition({ q: 4, r: 0 });
      gameSession.getGeneralForPlayer2().setPosition({ q: 4, r: 4 });
      general.getActiveAbilityState().lockdown = 0;
      general.setActionPoints(2);
    });

    const addUnit = (ownerId, q, r) => {
      const unit = gameSession.createCardForIdentifier(SDK.Cards.Neutral.GolemMetallurgist);
      unit.setOwnerId(ownerId);
      gameSession.applyCardToBoard(unit, q, r, null, null);
      return unit;
    };
    const useAbility = () => {
      const target = player.getCurrentSignatureCard().getValidTargetPositions()[0];
      const action = player.actionPlaySignatureCard(target);
      gameSession.executeAction(action);
      return action;
    };

    it('triggers Synergize once on the General ability use', () => {
      const ModifierSynergizeBuffSelf = require('../../../../app/sdk/modifiers/modifierSynergizeBuffSelf.coffee');
      const Modifier = require('../../../../app/sdk/modifiers/modifier.coffee');
      const ally = addUnit(player.getPlayerId(), 3, 0);
      gameSession.applyModifierContextObject(ModifierSynergizeBuffSelf.createContextObject([Modifier.createContextObjectWithAttributeBuffs(2, 0)]), ally);
      const original = ModifierSynergizeBuffSelf.prototype.onSynergize;
      const seen = [];
      ModifierSynergizeBuffSelf.prototype.onSynergize = function (action) { seen.push(action); };
      try {
        const action = useAbility();
        expect(action.getIsValid(), action.getValidationMessage()).to.equal(true);
        expect(seen).to.deep.equal([action]);
      } finally {
        ModifierSynergizeBuffSelf.prototype.onSynergize = original;
      }
    });

    it('lets ModifierCannotCastBBS block the owner and ModifierEnemyCannotCastBBS block the opponent', () => {
      const ModifierCannotCastBBS = require('../../../../app/sdk/modifiers/modifierCannotCastBBS.coffee');
      const ModifierEnemyCannotCastBBS = require('../../../../app/sdk/modifiers/modifierEnemyCannotCastBBS.coffee');

      const ownBlocker = addUnit(player.getPlayerId(), 3, 0);
      gameSession.applyModifierContextObject(ModifierCannotCastBBS.createContextObject(), ownBlocker);
      const blocked = useAbility();
      expect(blocked.getIsValid()).to.equal(false);
      expect(general.getActiveAbilityState().cooldown).to.equal(0);
      gameSession.removeModifierFromCardByClass(ModifierCannotCastBBS, ownBlocker);

      const enemyBlocker = addUnit(gameSession.getPlayer2Id(), 5, 4);
      gameSession.applyModifierContextObject(ModifierEnemyCannotCastBBS.createContextObject(), enemyBlocker);
      const blockedByEnemy = useAbility();
      expect(blockedByEnemy.getIsValid()).to.equal(false);
      gameSession.removeModifierFromCardByClass(ModifierEnemyCannotCastBBS, enemyBlocker);

      const allowed = useAbility();
      expect(allowed.getIsValid(), allowed.getValidationMessage()).to.equal(true);
    });
  });

  it('does not treat a unit hand-slot ability as a signature play', () => {
    const SignaturePlay = require('../../../../app/sdk/actions/signaturePlay.coffee');
    const scout = gameSession.createCardForIdentifier(SDK.Cards.Neutral.PlanarScout);
    scout.setOwnerId(gameSession.getPlayer1Id());
    gameSession.applyCardToBoard(scout, 0, 1, scout.createNewCardData(), null);
    const action = gameSession.getPlayer1().actionUseActiveAbility(scout.getIndex(), { q: 4, r: 1 });
    expect(SignaturePlay.matches(action)).to.equal(false);
  });

  it('freezes unit counters while silenced and resumes them from the same values', () => {
    const ModifierSilence = require('../../../../app/sdk/modifiers/modifierSilence.coffee');
    const scout = gameSession.createCardForIdentifier(SDK.Cards.Neutral.PlanarScout);
    scout.setOwnerId(gameSession.getPlayer1Id());
    gameSession.applyCardToBoard(scout, 0, 1, scout.createNewCardData(), null);
    scout.getActiveAbilityState().cooldown = 1;
    gameSession.applyModifierContextObject(ModifierSilence.createContextObject(), scout);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(scout.getActiveAbilityState()).to.include({ lockdown: 1, cooldown: 1 });
    gameSession.executeAction(gameSession.actionEndTurn());
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(scout.getActiveAbilityState()).to.include({ lockdown: 1, cooldown: 1 });
    gameSession.removeModifierFromCardByClass(ModifierSilence, scout);
    gameSession.executeAction(gameSession.actionEndTurn()); // opponent's turn end: no change
    expect(scout.getActiveAbilityState()).to.include({ lockdown: 1, cooldown: 1 });
    gameSession.executeAction(gameSession.actionEndTurn()); // owner's turn end: resumes
    expect(scout.getActiveAbilityState()).to.include({ lockdown: 0, cooldown: 0 });
  });

  it('freezes the General counters while silenced', () => {
    const ModifierSilence = require('../../../../app/sdk/modifiers/modifierSilence.coffee');
    const general = gameSession.getGeneralForPlayer1();
    gameSession.applyModifierContextObject(ModifierSilence.createContextObject(), general);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(general.getActiveAbilityState()).to.include({ lockdown: 2, cooldown: 0 });
    gameSession.executeAction(gameSession.actionEndTurn());
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(general.getActiveAbilityState()).to.include({ lockdown: 2, cooldown: 0 });
    gameSession.removeModifierFromCardByClass(ModifierSilence, general);
    gameSession.executeAction(gameSession.actionEndTurn()); // opponent's turn end: no change
    expect(general.getActiveAbilityState()).to.include({ lockdown: 2, cooldown: 0 });
    gameSession.executeAction(gameSession.actionEndTurn()); // owner's turn end: resumes
    expect(general.getActiveAbilityState()).to.include({ lockdown: 1, cooldown: 0 });
  });

  it('counts counters down at the owning player end turn only', () => {
    const deployed = gameSession.createCardForIdentifier(SDK.Cards.Neutral.PlanarScout);
    deployed.setOwnerId(gameSession.getPlayer1Id());
    gameSession.applyCardToBoard(deployed, 0, 1, deployed.createNewCardData(), null);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(deployed.getActiveAbilityState().lockdown).to.equal(0);
    deployed.getActiveAbilityState().cooldown = 1;
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(deployed.getActiveAbilityState().lockdown).to.equal(0);
    expect(deployed.getActiveAbilityState().cooldown).to.equal(1);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(deployed.getActiveAbilityState().cooldown).to.equal(0);
  });

  it('retains card metadata but does not initialize active ability state outside Practice/Sandbox v2', () => {
    gameSession.setRuleset('practice-sandbox-hex', 1);
    const deployed = gameSession.createCardForIdentifier(SDK.Cards.Neutral.PlanarScout);
    expect(deployed.activeAbility).to.deep.equal({ effectCardId: SDK.Cards.Spell.PhoenixFire, lockdown: 1, cooldown: 1 });
    deployed.setOwnerId(gameSession.getPlayer1Id());
    gameSession.applyCardToBoard(deployed, 0, 1, deployed.createNewCardData(), null);
    expect(deployed.getActiveAbilityState()).to.equal(null);
  });

  it('plays the ability from its original hand slot for one AP and no mana', () => {
    const player = gameSession.getPlayer1();
    const opposingGeneral = gameSession.getGeneralForPlayer2();
    const general = gameSession.getGeneralForPlayer1();
    general.setPosition({ q: 4, r: 0 });
    opposingGeneral.setPosition({ q: 4, r: 4 });
    const position = gameSession.getBoard().getHexNeighbors(general.getPosition()).find((candidate) => gameSession.getBoard().hasTileAtPosition(candidate) && !gameSession.getBoard().getUnitAtPosition(candidate));
    let otherCardSlot = -1;
    let abilitySlot = -1;
    for (let slot = 0; slot < 8; slot++) {
      const handCard = player.getDeck().getCardInHandAtIndex(slot);
      if (handCard && handCard.getId() === SDK.Cards.Neutral.GolemMetallurgist) otherCardSlot = slot;
      if (handCard && handCard.getId() === SDK.Cards.Neutral.PlanarScout) abilitySlot = slot;
    }
    expect(otherCardSlot).to.be.at.least(0);
    expect(abilitySlot).to.be.at.least(0);
    const scoutInHand = player.getDeck().getCardInHandAtIndex(abilitySlot);
    scoutInHand.activeAbility = { effectCardId: SDK.Cards.Spell.PhoenixFire, lockdown: 1, cooldown: 1 };
    const otherCardIndex = player.getDeck().getCardIndexInHandAtIndex(otherCardSlot);
    const playScout = player.actionPlayCardFromHand(abilitySlot, position);
    gameSession.executeAction(playScout);

    expect(playScout.getIsValid(), playScout.getValidationMessage()).to.equal(true);
    const scout = gameSession.getBoard().getUnitAtPosition(position);
    const ability = player.getActiveAbilityForHandSlot(abilitySlot);
    expect(ability.unit).to.equal(scout);
    expect(player.getDeck().getCardIndexInHandAtIndex(abilitySlot)).to.equal(null);
    expect(player.getDeck().getCardIndexInHandAtIndex(otherCardSlot)).to.equal(otherCardIndex);

    gameSession.executeAction(gameSession.actionEndTurn());
    gameSession.executeAction(gameSession.actionEndTurn());
    const manaBefore = player.getRemainingMana();
    const useAbility = player.actionUseActiveAbility(scout.getIndex(), opposingGeneral.getPosition());
    gameSession.executeAction(useAbility);

    expect(useAbility.getIsValid(), useAbility.getValidationMessage()).to.equal(true);
    expect(useAbility.getIsValidApplication()).to.equal(true);
    expect(opposingGeneral.getDamage()).to.equal(3);
    expect(scout.getActionPoints()).to.equal(1);
    expect(player.getRemainingMana()).to.equal(manaBefore);
    expect(ability.state).to.include({ lockdown: 0, cooldown: 1 });

    const cooldownRetry = player.actionUseActiveAbility(scout.getIndex(), opposingGeneral.getPosition());
    gameSession.executeAction(cooldownRetry);
    expect(cooldownRetry.getIsValid()).to.equal(false);
    expect(scout.getActionPoints()).to.equal(1);
    expect(ability.state.cooldown).to.equal(1);

    ability.state.cooldown = 0;
    const ModifierSilence = require('../../../../app/sdk/modifiers/modifierSilence.coffee');
    gameSession.applyModifierContextObject(ModifierSilence.createContextObject(), scout);
    expect(player.getActiveAbilityForHandSlot(abilitySlot).silenced).to.equal(true);
    const silencedUse = player.actionUseActiveAbility(scout.getIndex(), opposingGeneral.getPosition());
    gameSession.executeAction(silencedUse);
    expect(silencedUse.getIsValid()).to.equal(false);
    expect(ability.state).to.include({ lockdown: 0, cooldown: 0 });
    expect(scout.getActionPoints()).to.equal(1);
    gameSession.removeModifierFromCardByClass(ModifierSilence, scout);
    expect(player.getActiveAbilityForHandSlot(abilitySlot).silenced).to.equal(false);

    gameSession.executeAction(gameSession.actionEndTurn());
    expect(ability.state.cooldown).to.equal(0);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(ability.state.cooldown).to.equal(0);

    UtilsSDK.executeActionWithoutValidation(scout.actionDie());
    expect(player.getActiveAbilityForHandSlot(abilitySlot)).to.equal(null);
  });

  it('rejects invalid targets and a fresh summon with no action points', () => {
    const player = gameSession.getPlayer1();
    const scout = gameSession.createCardForIdentifier(SDK.Cards.Neutral.PlanarScout);
    scout.setOwnerId(player.getPlayerId());
    gameSession.applyCardToBoard(scout, 1, 0, scout.createNewCardData(), null);
    const state = scout.getActiveAbilityState();
    state.lockdown = 0;
    const enemyGeneral = gameSession.getGeneralForPlayer2();
    const noPoints = player.actionUseActiveAbility(scout.getIndex(), enemyGeneral.getPosition());
    gameSession.executeAction(noPoints);
    expect(noPoints.getIsValid()).to.equal(false);
    expect(scout.getActionPoints()).to.equal(0);
    expect(state.cooldown).to.equal(0);

    scout.refreshExhaustion();
    const invalidTarget = player.actionUseActiveAbility(scout.getIndex(), { q: 99, r: 99 });
    gameSession.executeAction(invalidTarget);
    expect(invalidTarget.getIsValid()).to.equal(false);
    expect(scout.getActionPoints()).to.equal(2);
    expect(state.cooldown).to.equal(0);
  });

  it('resolves Special Delivery and Poof around the caster, damaging enemies only before self-destruction', () => {
    for (const [casterId, damage] of [[50001, 550], [50013, 1400]]) {
      const caster = deployPhobies(casterId, gameSession.getPlayer1Id(), { q: 2, r: 2 });
      const enemy = deployPhobies(50003, gameSession.getPlayer2Id(), findOpenPosition(caster.getPosition(), 1, 1));
      const ally = deployPhobies(50003, gameSession.getPlayer1Id(), findOpenPosition(caster.getPosition(), 1, 1));
      const distant = deployPhobies(50003, gameSession.getPlayer2Id(), findOpenPosition(caster.getPosition(), 2, 2));
      const use = useUnitAbility(caster, enemy.getPosition());
      expect(use.getIsValid(), use.getValidationMessage()).to.equal(true);
      expect(enemy.getDamage()).to.equal(damage);
      expect(ally.getDamage()).to.equal(0);
      expect(distant.getDamage()).to.equal(0);
      expect(caster.getIsActive()).to.equal(false);
      const damageAction = use.getFlattenedActionTree().find((action) => action instanceof SDK.DamageAction);
      expect(damageAction.getSource()).to.equal(caster);
      gameSession.executeAction(enemy.actionDie());
      gameSession.executeAction(ally.actionDie());
      gameSession.executeAction(distant.actionDie());
    }
  });

  it('destroys Rusty after immobilizing an adjacent enemy unit for its two end turns', () => {
    const caster = deployPhobies(50009, gameSession.getPlayer1Id(), { q: 2, r: 2 });
    const enemy = deployPhobies(50003, gameSession.getPlayer2Id(), { q: 3, r: 2 });
    const ModifierCannotMove = require('../../../../app/sdk/modifiers/modifierCannotMove.coffee');
    const use = useUnitAbility(caster, enemy.getPosition());
    expect(use.getIsValid(), use.getValidationMessage()).to.equal(true);
    expect(caster.getIsActive()).to.equal(false);
    expect(enemy.hasActiveModifierClass(ModifierCannotMove)).to.equal(true);
    gameSession.executeAction(gameSession.actionEndTurn());
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(enemy.hasActiveModifierClass(ModifierCannotMove)).to.equal(true);
    gameSession.executeAction(gameSession.actionEndTurn());
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(enemy.hasActiveModifierClass(ModifierCannotMove)).to.equal(false);
  });

  it('rejects Gotcha on an ally, a General, and an enemy outside range', () => {
    const caster = deployPhobies(50009, gameSession.getPlayer1Id(), { q: 2, r: 2 });
    const ally = deployPhobies(50003, gameSession.getPlayer1Id(), { q: 3, r: 2 });
    expect(useUnitAbility(caster, ally.getPosition()).getIsValid()).to.equal(false);
    const enemyGeneral = gameSession.getGeneralForPlayer2();
    enemyGeneral.setPosition({ q: 3, r: 2 });
    expect(useUnitAbility(caster, enemyGeneral.getPosition()).getIsValid()).to.equal(false);
    const enemy = deployPhobies(50003, gameSession.getPlayer2Id(), { q: 4, r: 2 });
    expect(useUnitAbility(caster, enemy.getPosition()).getIsValid()).to.equal(false);
    expect(caster.getIsActive()).to.equal(true);
  });

  it('applies Raising Hell damage tiers to directly deliverable enemies and ignores allies', () => {
    const caster = deployPhobies(50030, gameSession.getPlayer1Id(), { q: 2, r: 2 });
    const adjacent = deployPhobies(50003, gameSession.getPlayer2Id(), { q: 3, r: 2 });
    const distanceTwo = deployPhobies(50003, gameSession.getPlayer2Id(), { q: 4, r: 2 });
    const ally = deployPhobies(50003, gameSession.getPlayer1Id(), { q: 1, r: 2 });
    const use = useUnitAbility(caster, distanceTwo.getPosition());
    expect(use.getIsValid(), use.getValidationMessage()).to.equal(true);
    expect(adjacent.getDamage()).to.equal(600);
    expect(distanceTwo.getDamage()).to.equal(300);
    expect(ally.getDamage()).to.equal(0);
    expect(caster.getIsActive()).to.equal(false);
    const damageActions = use.getFlattenedActionTree().filter((action) => action instanceof SDK.DamageAction);
    expect(damageActions.length).to.equal(2);
    expect(damageActions.every((action) => action.getSource() === caster)).to.equal(true);
  });

  it('uses the shared Wall obstruction rule for Raising Hell distance-two targets', () => {
    const board = gameSession.getBoard();
    for (const tile of board.getTiles()) {
      if (tile.getId() === SDK.Cards.Tile.Wall) tile.setIsRemoved(true);
    }
    const caster = deployPhobies(50030, gameSession.getPlayer1Id(), { q: 2, r: 2 });
    const enemy = deployPhobies(50003, gameSession.getPlayer2Id(), { q: 4, r: 2 });
    const wall = gameSession.createCardForIdentifier(SDK.Cards.Tile.Wall);
    wall.setPosition({ q: 3, r: 2 });
    wall.setIsPlayed(true);
    wall.setIsRemoved(false);
    board.addCard(wall);
    const use = useUnitAbility(caster, enemy.getPosition());
    expect(use.getIsValid(), use.getValidationMessage()).to.equal(true);
    expect(enemy.getDamage()).to.equal(0);
    expect(caster.getIsActive()).to.equal(false);
  });

  it('resolves Caw Claw with one embedded move, one real attack, and one total AP', () => {
    const caster = deployPhobies(50004, gameSession.getPlayer1Id(), { q: 2, r: 2 });
    const enemy = deployPhobies(50003, gameSession.getPlayer2Id(), { q: 4, r: 2 });
    caster.setDamage(500);
    const use = useUnitAbility(caster, enemy.getPosition());
    expect(use.getIsValid(), use.getValidationMessage()).to.equal(true);
    expect(caster.getPosition()).to.deep.equal({ q: 3, r: 2 });
    expect(caster.getDamage()).to.equal(288); // AttackAction triggers Cassowary's 50% Lifegain.
    expect(enemy.getDamage()).to.equal(425);
    expect(caster.getActionPoints()).to.equal(1);
    const tree = use.getFlattenedActionTree();
    expect(tree.some((action) => action instanceof SDK.MoveAction && action.getIsAbilityOrigin())).to.equal(true);
    const attack = tree.find((action) => action instanceof SDK.AttackAction && action.getTarget() === enemy);
    expect(attack).to.exist;
    expect(attack.getIsAbilityOrigin()).to.equal(true);
    expect(attack.getSource()).to.equal(caster);
  });

  it('resolves Bull Rush along a preferred enemy path with attacks and dash moves', () => {
    const board = gameSession.getBoard();
    for (const tile of board.getTiles()) if (tile.getId() === SDK.Cards.Tile.Wall) tile.setIsRemoved(true);
    const caster = deployPhobies(50032, gameSession.getPlayer1Id(), { q: 3, r: 2 });
    const first = deployPhobies(50003, gameSession.getPlayer2Id(), { q: 4, r: 2 });
    const second = deployPhobies(50003, gameSession.getPlayer2Id(), { q: 5, r: 2 });
    const use = useUnitAbility(caster, { q: 6, r: 2 });
    expect(use.getIsValid(), use.getValidationMessage()).to.equal(true);
    expect(caster.getPosition()).to.deep.equal({ q: 6, r: 2 });
    expect(first.getDamage()).to.equal(550);
    expect(second.getDamage()).to.equal(550);
    expect(caster.getActionPoints()).to.equal(1);
    const tree = use.getFlattenedActionTree();
    const attacks = [...new Set(tree.filter((action) => action instanceof SDK.AttackAction && [first, second].includes(action.getTarget())))];
    const moves = [...new Set(tree.filter((action) => action instanceof SDK.MoveAction && action.getIsAbilityDashStep()))];
    expect(attacks).to.have.length(2);
    expect(attacks.every((action) => action.getIsAbilityOrigin() && action.getSource() === caster)).to.equal(true);
    expect(moves).to.have.length(3);
  });

  it('resolves Smashface damage when its straight push destination is blocked', () => {
    const caster = deployPhobies(50020, gameSession.getPlayer1Id(), { q: 2, r: 2 });
    const enemy = deployPhobies(50003, gameSession.getPlayer2Id(), { q: 3, r: 2 });
    deployPhobies(50003, gameSession.getPlayer1Id(), { q: 4, r: 2 });
    const use = useUnitAbility(caster, enemy.getPosition());
    expect(use.getIsValid(), use.getValidationMessage()).to.equal(true);
    expect(enemy.getDamage()).to.equal(350);
    expect(enemy.getPosition()).to.deep.equal({ q: 3, r: 2 });
    expect(caster.getActionPoints()).to.equal(1);
    const attack = use.getFlattenedActionTree().find((action) => action instanceof SDK.AttackAction && action.getTarget() === enemy);
    expect(attack.getIsAbilityOrigin()).to.equal(true);
    expect(attack.getSource()).to.equal(caster);
  });

  it('pushes an adjacent enemy one tile directly away when the destination is open', () => {
    const caster = deployPhobies(50020, gameSession.getPlayer1Id(), { q: 2, r: 2 });
    const enemy = deployPhobies(50003, gameSession.getPlayer2Id(), { q: 3, r: 2 });
    const use = useUnitAbility(caster, enemy.getPosition());
    expect(use.getIsValid(), use.getValidationMessage()).to.equal(true);
    expect(enemy.getDamage()).to.equal(350);
    expect(enemy.getPosition()).to.deep.equal({ q: 4, r: 2 });
    expect(caster.getActionPoints()).to.equal(1);
    const push = use.getFlattenedActionTree().find((action) => action instanceof SDK.PhobiesPushAction);
    expect(push.getIsAbilityOrigin()).to.equal(true);
    expect(push.getSource()).to.equal(caster);
    expect(push.getTarget()).to.equal(enemy);
  });

  it('rejects Bull Rush when its endpoint is occupied without partial movement or damage', () => {
    const caster = deployPhobies(50032, gameSession.getPlayer1Id(), { q: 3, r: 2 });
    const enemy = deployPhobies(50003, gameSession.getPlayer2Id(), { q: 6, r: 2 });
    const use = useUnitAbility(caster, enemy.getPosition());
    expect(use.getIsValid()).to.equal(false);
    expect(caster.getPosition()).to.deep.equal({ q: 3, r: 2 });
    expect(caster.getActionPoints()).to.equal(2);
    expect(enemy.getDamage()).to.equal(0);
  });

  it('rejects Bull Rush when every route to a free distance-three endpoint is blocked', () => {
    const board = gameSession.getBoard();
    for (const tile of board.getTiles()) if (tile.getId() === SDK.Cards.Tile.Wall) tile.setIsRemoved(true);
    const caster = deployPhobies(50032, gameSession.getPlayer1Id(), { q: 3, r: 2 });
    const enemy = deployPhobies(50003, gameSession.getPlayer2Id(), { q: 2, r: 2 });
    for (const position of board.getHexNeighbors(caster.getPosition())) {
      const wall = gameSession.createCardForIdentifier(SDK.Cards.Tile.Wall);
      wall.setPosition(position);
      wall.setIsPlayed(true);
      wall.setIsRemoved(false);
      board.addCard(wall);
    }
    const endpoint = { q: 6, r: 2 };
    const use = useUnitAbility(caster, endpoint);
    expect(use.getIsValid()).to.equal(false);
    expect(caster.getPosition()).to.deep.equal({ q: 3, r: 2 });
    expect(caster.getActionPoints()).to.equal(2);
    expect(enemy.getDamage()).to.equal(0);
  });

  it('uses each general Bloodbound Spell through its L2/C2 signature ability', () => {
    const player = gameSession.getPlayer1();
    const general = gameSession.getGeneralForPlayer1();
    general.setPosition({ q: 4, r: 0 });
    const enemyGeneral = gameSession.getGeneralForPlayer2();
    enemyGeneral.setPosition({ q: 4, r: 4 });
    const ally = gameSession.createCardForIdentifier(SDK.Cards.Neutral.GolemMetallurgist);
    ally.setOwnerId(player.getPlayerId());
    gameSession.applyCardToBoard(ally, 3, 0, null, null);
    const state = general.getActiveAbilityState();
    const generalSignatureData = general.getSignatureCardData();
    const generalSignatureManaCost = generalSignatureData.manaCost;
    expect(state).to.include({
      lockdown: 2, cooldown: 0, baseLockdown: 2, baseCooldown: 2,
    });
    expect(player.getSignatureCardData().activeAbility).to.include({ lockdown: 2, cooldown: 2 });
    expect(player.getSignatureCardData().manaCost).to.equal(0);
    expect(general.getSignatureCardData()).to.equal(generalSignatureData);
    expect(generalSignatureData.activeAbility).to.equal(undefined);
    expect(generalSignatureData.manaCost).to.equal(generalSignatureManaCost);

    gameSession.executeAction(gameSession.actionEndTurn());
    expect(state.lockdown).to.equal(1);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(state.lockdown).to.equal(1);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(state.lockdown).to.equal(0);
    gameSession.executeAction(gameSession.actionEndTurn());

    const signature = player.getCurrentSignatureCard();
    const targetPosition = signature.getValidTargetPositions()[0];
    const manaBefore = player.getRemainingMana();
    const use = player.actionPlaySignatureCard(targetPosition);
    expect(use).to.be.instanceOf(SDK.UseActiveAbilityAction);
    gameSession.executeAction(use);

    expect(use.getIsValid(), use.getValidationMessage()).to.equal(true);
    expect(state.cooldown).to.equal(2);
    expect(general.getActionPoints()).to.equal(1);
    expect(player.getRemainingMana()).to.equal(manaBefore);
    expect(player.getIsSignatureCardActive()).to.equal(false);

    gameSession.executeAction(gameSession.actionEndTurn());
    expect(state.cooldown).to.equal(1);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(state.cooldown).to.equal(1);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(state.cooldown).to.equal(0);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(state.cooldown).to.equal(0);

    const serialized = JSON.parse(gameSession.serializeToJSON(gameSession));
    const generalData = serialized.cardsByIndex[general.getIndex()];
    expect(generalData.activeAbilityState).to.deep.equal(state);
    const playerData = serialized.players.find((candidate) => candidate.playerId === player.getPlayerId());
    expect(playerData).to.not.have.property('signatureAbilityState');
    // the opponent's counters are untouched by this player's turn ends
    expect(gameSession.getGeneralForPlayer2().getActiveAbilityState()).to.include({ lockdown: 0, cooldown: 0 });
  });
});
