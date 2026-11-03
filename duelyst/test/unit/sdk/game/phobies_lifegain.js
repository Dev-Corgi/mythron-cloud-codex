const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const { expect } = require('chai');
const SDK = require('../../../../app/sdk.coffee');
const UtilsSDK = require('../../../utils/utils_sdk');
const ModifierHealSelfWhenDealingDamage = require('../../../../app/sdk/modifiers/modifierHealSelfWhenDealingDamage.coffee');
const ModifierImmuneToDamage = require('../../../../app/sdk/modifiers/modifierImmuneToDamage.coffee');

describe('Phobies Lifegain', () => {
  let gameSession;

  beforeEach(() => {
    UtilsSDK.setupSession(
      [{ id: SDK.Cards.Faction1.General }],
      [{ id: SDK.Cards.Faction2.General }],
      true,
      true,
    );
    gameSession = SDK.GameSession.getInstance();
  });

  afterEach(() => SDK.GameSession.reset());

  const applyDamage = (source, target, amount, multiplier = 1, abilityOrigin = false) => {
    const action = new SDK.DamageAction(gameSession);
    if (abilityOrigin) {
      const abilityAction = new SDK.UseActiveAbilityAction(
        gameSession,
        source.getOwnerId(),
        source.getIndex(),
        target.getPosition(),
      );
      abilityAction.setAbilityOriginOn(action);
    } else {
      action.setSource(source);
    }
    action.setTarget(target);
    action.setDamageAmount(amount);
    action.setDamageMultiplier(multiplier);
    action.setIsAbilityOrigin(abilityOrigin);
    UtilsSDK.executeActionWithoutValidation(action);
    return action;
  };

  it('applies configured Lifegain to ability damage after defenses, floored and excluding overkill', () => {
    const source = UtilsSDK.applyCardToBoard({ id: 50002 }, 3, 1, gameSession.getPlayer1Id());
    const target = UtilsSDK.applyCardToBoard({ id: 50003 }, 4, 1, gameSession.getPlayer2Id());
    source.setDamage(20);

    const defaultContext = ModifierHealSelfWhenDealingDamage.createContextObject();
    expect(defaultContext.healRatio).to.be.undefined;
    expect(source.getActiveModifierByType('ModifierHealSelfWhenDealingDamage').healRatio).to.equal(0.5);
    const lifegainContext = source.getActiveModifierByType('ModifierHealSelfWhenDealingDamage').contextObject;
    expect(ModifierHealSelfWhenDealingDamage.getDescription(lifegainContext)).to.equal('Lifegain — Whenever this minion deals damage, restore Health to it equal to 50% of the damage dealt (rounded down).');

    // The adjusted amount is floor(9 × 0.5) = 4; Lifegain then floors 4 × 0.5 = 2.
    const abilityDamage = applyDamage(source, target, 9, 0.5, true);
    expect(abilityDamage.isAbilityOrigin).to.equal(true);
    expect(abilityDamage.getSource()).to.equal(source);
    expect(target.getDamage()).to.equal(4);
    expect(source.getDamage()).to.equal(18);

    // A defense that prevents damage leaves no damage for Lifegain to restore.
    gameSession.applyModifierContextObject(ModifierImmuneToDamage.createContextObject(), target);
    source.setDamage(20);
    applyDamage(source, target, 9);
    expect(target.getDamage()).to.equal(4);
    expect(source.getDamage()).to.equal(20);

    // A 9-damage hit against 5 remaining HP restores half of the 5 actually applied.
    const overkillTarget = UtilsSDK.applyCardToBoard({ id: 50003 }, 5, 1, gameSession.getPlayer2Id());
    overkillTarget.setDamage(overkillTarget.getMaxHP() - 5);
    source.setDamage(1);
    applyDamage(source, overkillTarget, 9);
    expect(source.getDamage()).to.equal(0);
  });

  it('keeps the default 1.0 modifier behavior for existing cards', () => {
    const source = UtilsSDK.applyCardToBoard({ id: SDK.Cards.Neutral.GolemMetallurgist }, 3, 1, gameSession.getPlayer1Id());
    const target = UtilsSDK.applyCardToBoard({ id: SDK.Cards.Neutral.GolemMetallurgist }, 4, 1, gameSession.getPlayer2Id());
    gameSession.applyModifierContextObject(
      ModifierHealSelfWhenDealingDamage.createContextObject(),
      source,
    );
    source.setDamage(10);

    applyDamage(source, target, 7);

    expect(source.getDamage()).to.equal(3);
  });
});
