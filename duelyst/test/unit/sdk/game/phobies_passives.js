const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const { expect } = require('chai');
const SDK = require('../../../../app/sdk.coffee');
const UtilsSDK = require('../../../utils/utils_sdk');

describe('Phobies passives', () => {
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

  const damage = (source, target, amount, abilityOrigin = false) => {
    const action = new SDK.DamageAction(gameSession);
    if (abilityOrigin) {
      const ability = new SDK.UseActiveAbilityAction(
        gameSession,
        source.getOwnerId(),
        source.getIndex(),
        target.getPosition(),
      );
      ability.setAbilityOriginOn(action);
    } else if (source) {
      action.setSource(source);
    }
    action.setTarget(target);
    action.setDamageAmount(amount);
    UtilsSDK.executeActionWithoutValidation(action);
    return action;
  };

  it('attaches only the five passives to their imported card ids with roster text', () => {
    const expected = new Map([
      [50018, ['ModifierPhobiesBodyCount', 'Whenever this minion destroys an enemy by attacking, it permanently gains +200 Attack.']],
      [50027, ['ModifierPhobiesCounterAttack', 'Whenever this minion takes damage, deal 35% of that damage (rounded down) to the damage source.']],
      [50028, ['ModifierPhobiesRegatorate', 'At the start of your turn, restore 400 Health to this minion.']],
      [50033, ['ModifierPhobiesRage', 'When your General has 3000 or less Health, this minion permanently gains +300 Attack.']],
      [50034, ['ModifierPhobiesHeartAttack', 'Deals +400 damage when attacking the enemy General.']],
    ]);
    for (const id of [50018, 50027, 50028, 50033, 50034]) {
      const card = SDK.CardFactory.cardForIdentifier(id, gameSession);
      const modifiers = card.getInherentModifiersContextObjects();
      const passive = modifiers.find((modifier) => modifier.type === expected.get(id)[0]);
      expect(passive, `${id} modifier`).to.exist;
      const ModifierClass = gameSession.getModifierClassForType(passive.type);
      expect(ModifierClass.getDescription(passive)).to.equal(expected.get(id)[1]);
    }
    for (const id of [50001, 50019, 50035, SDK.Cards.Neutral.GolemMetallurgist]) {
      const card = SDK.CardFactory.cardForIdentifier(id, gameSession);
      const types = card.getInherentModifiersContextObjects().map((modifier) => modifier.type);
      expect(types.filter((type) => type.startsWith('ModifierPhobies'))).to.have.length(0);
    }
  });

  it('permanently gains 200 Attack when it directly kills an enemy, including ability damage', () => {
    const dioltas = UtilsSDK.applyCardToBoard({ id: 50018 }, 3, 1, gameSession.getPlayer1Id());
    const target = UtilsSDK.applyCardToBoard({ id: 50003 }, 4, 1, gameSession.getPlayer2Id());
    target.setDamage(target.getMaxHP() - 10);
    damage(dioltas, target, 10, true);
    expect(dioltas.getATK()).to.equal(600);
    damage(dioltas, UtilsSDK.applyCardToBoard({ id: 50003 }, 5, 1, gameSession.getPlayer2Id()), 1);
    expect(dioltas.getATK()).to.equal(600);
  });

  it('reflects 35% of damage actually applied and does not chain reflected Counter Attack damage', () => {
    const needler = UtilsSDK.applyCardToBoard({ id: 50027 }, 3, 1, gameSession.getPlayer1Id());
    const attacker = UtilsSDK.applyCardToBoard({ id: 50027 }, 4, 1, gameSession.getPlayer2Id());
    damage(attacker, needler, 10);
    expect(needler.getDamage()).to.equal(10);
    expect(attacker.getDamage()).to.equal(3);

    const nearDeadNeedler = UtilsSDK.applyCardToBoard({ id: 50027 }, 5, 1, gameSession.getPlayer1Id());
    nearDeadNeedler.setDamage(nearDeadNeedler.getMaxHP() - 5);
    damage(attacker, nearDeadNeedler, 100);
    expect(attacker.getDamage()).to.equal(4); // floor(5 × 0.35)

    const immuneNeedler = UtilsSDK.applyCardToBoard({ id: 50027 }, 6, 1, gameSession.getPlayer1Id());
    gameSession.applyModifierContextObject(
      require('../../../../app/sdk/modifiers/modifierImmuneToDamage.coffee').createContextObject(),
      immuneNeedler,
    );
    damage(attacker, immuneNeedler, 10);
    expect(attacker.getDamage()).to.equal(4);
  });

  it('restores up to 400 Health at the start of its owner turn without changing poison modifiers', () => {
    const kolossus = UtilsSDK.applyCardToBoard({ id: 50028 }, 3, 1, gameSession.getPlayer1Id());
    kolossus.setDamage(600);
    const modifierCount = kolossus.getModifiers().length;
    gameSession.executeAction(gameSession.actionEndTurn());
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(kolossus.getDamage()).to.equal(200);
    expect(kolossus.getModifiers()).to.have.length(modifierCount);
    kolossus.setDamage(0);
    gameSession.executeAction(gameSession.actionEndTurn());
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(kolossus.getDamage()).to.equal(0);
  });

  it('triggers Rage once when its General crosses 3000 Health and keeps it after healing', () => {
    const rogueWarden = UtilsSDK.applyCardToBoard({ id: 50033 }, 3, 1, gameSession.getPlayer1Id());
    const general = gameSession.getGeneralForPlayer1();
    general.maxHP = 6000;
    general.flushCachedAttribute('maxHP');
    expect(general.getMaxHP()).to.equal(6000);
    expect(general.getWasGeneral()).to.equal(true);
    general.setDamage(2500);
    damage(gameSession.getGeneralForPlayer2(), general, 200);
    expect(rogueWarden.getATK()).to.equal(400);
    damage(gameSession.getGeneralForPlayer2(), general, 300);
    expect(rogueWarden.getATK()).to.equal(700);
    const heal = new SDK.HealAction(gameSession);
    heal.setTarget(general);
    heal.setHealAmount(1000);
    UtilsSDK.executeActionWithoutValidation(heal);
    damage(gameSession.getGeneralForPlayer2(), general, 1000);
    expect(rogueWarden.getATK()).to.equal(700);
  });

  it('adds 400 damage only to the enemy General, including damage sourced by an ability', () => {
    const hamon = UtilsSDK.applyCardToBoard({ id: 50034 }, 3, 1, gameSession.getPlayer1Id());
    const enemyGeneral = gameSession.getGeneralForPlayer2();
    enemyGeneral.maxHP = 6000;
    enemyGeneral.flushCachedAttribute('maxHP');
    expect(enemyGeneral.getMaxHP()).to.equal(6000);
    const enemyMinion = UtilsSDK.applyCardToBoard({ id: 50003 }, 4, 1, gameSession.getPlayer2Id());
    damage(hamon, enemyGeneral, 500, true);
    damage(hamon, enemyMinion, 500);
    expect(enemyGeneral.getDamage()).to.equal(900);
    expect(enemyMinion.getDamage()).to.equal(500);
  });
});
