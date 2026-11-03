const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');
const { expect } = require('chai');
const SDK = require('../../../../app/sdk.coffee');
const CardEligibility = require('../../../../app/sdk/rulesets/cardEligibility.coffee');
const RSX = require('../../../../app/data/resources');

const source = require('../../../../../PhobiesGallery/cards-data.json');

const sourceNames = [
  'BOOM', 'Numbskull', 'Razor Mouth', 'Cassowary', 'Cupcake', 'Droney', 'K-9000', 'Gesundheit', 'Rusty', 'Minotaur',
  'Grave Digger', 'Jar Cannon', 'KABOOM', 'Murder Wing', 'Blinky', 'Doctor Dermic', 'Gonzo Bonzo', 'Grimes', 'Hydra', 'Slammer Head',
  'Morty', 'Psyclops', 'Staremaster', 'Woolly Bully', 'Cerberus', 'Scritch', 'Zappy', 'Alley Gator', 'Fishtank', 'Fleshcrawler',
  'Leshy', 'Mr Tramples', 'Ogre', 'Hi-Five', 'Beauty',
];
const duelystMappings = [
  [11051, 'Ion'], [19030, 'Crimson Oculus'], [19048, 'Skyrock Golem'], [19026, 'Rock Pulverizer'], [10981, 'Healing Mystic'],
  [10001, 'Dragonlark'], [19038, 'Golem Metallurgist'], [10953, 'Crossbones'], [512, 'Borean Bear'], [10205, 'Bloodshard Golem'],
  [11064, 'Inquisitor Kron'], [10017, 'Fire Spitter'], [10962, 'Chaos Elemental'], [19051, 'Flameblood Warlock'], [11020, 'Wings of Paradise'],
  [10995, 'Emerald Rejuvenator'], [10989, 'Captain Hank Hart'], [10976, 'Dioltas'], [10204, 'Brightmoss Golem'], [11105, 'Wild Tahr'],
  [11006, 'Black Locust'], [10954, 'Sworn Avenger'], [10973, 'Lux Ignis'], [10306, 'Lightbender'], [11052, 'Hydrax'],
  [11112, 'Letigress'], [19031, 'Thorn Needler'], [404, 'Kolossus'], [10207, 'Stormmetal Golem'], [10956, 'Red Synja'],
  [10996, 'Zurael, the Lifegiver'], [10990, 'Rook'], [19032, 'Rogue Warden'], [119, 'Hamon Bladeseeker'], [159, 'Xenkai Cannoneer'],
];
const lifegainCardIds = [50002, 50004, 50011, 50014, 50015, 50018, 50030, 50034];
const expectedAttackStats = [
  ['none', 0], ['area', 1], ['melee', 1], ['melee', 1], ['none', 0], ['melee', 1], ['melee', 1], ['ranged', 2], ['none', 0],
  ['area', 1], ['melee', 1], ['lobbed', 3], ['none', 0], ['ranged', 2], ['melee', 1], ['melee', 1], ['ranged', 2], ['melee', 1],
  ['melee', 1], ['melee', 1], ['melee', 1], ['ranged', 2], ['ranged', 2], ['melee', 1], ['melee', 1], ['ranged', 2], ['ranged', 2],
  ['melee', 1], ['melee', 1], ['melee', 1], ['melee', 1], ['melee', 1], ['ranged', 2], ['area', 1], ['ranged', 2],
];
const passiveDescriptions = new Map([
  [50018, ['ModifierPhobiesBodyCount', 'Whenever this minion destroys an enemy by attacking, it permanently gains +200 Attack.']],
  [50027, ['ModifierPhobiesCounterAttack', 'Whenever this minion takes damage, deal 35% of that damage (rounded down) to the damage source.']],
  [50028, ['ModifierPhobiesRegatorate', 'At the start of your turn, restore 400 Health to this minion.']],
  [50033, ['ModifierPhobiesRage', 'When your General has 3000 or less Health, this minion permanently gains +300 Attack.']],
  [50034, ['ModifierPhobiesHeartAttack', 'Deals +400 damage when attacking the enemy General.']],
]);

const getFixtureAttackType = (row) => {
  if (row.damage === '') return 'none';
  if (row.attack_type === 'Lob') return 'lobbed';
  if (row.attack_type === 'Targeted AOE') return 'area';
  return row.attack_range === 1 ? 'melee' : 'ranged';
};

describe('Phobies imported unit factory', () => {
  it('matches every imported stat to the checked-in source snapshot', () => {
    const byName = new Map(source.map((row) => [row.name, row]));
    const session = SDK.GameSession.create();
    sourceNames.forEach((name, index) => {
      const row = byName.get(name);
      const card = SDK.CardFactory.cardForIdentifier(50001 + index, session);
      expect(row, name).to.exist;
      expect(card, name).to.exist;
      expect(card.originalCardId).to.equal(duelystMappings[index][0]);
      expect(card.name).to.equal(duelystMappings[index][1]);
      expect(card.getManaCost()).to.equal(row.keys);
      expect(card.getHP()).to.equal(row.health);
      expect(card.getMaxHP()).to.equal(row.health);
      expect(card.getATK()).to.equal(Number(row.damage || 0));
      expect(card.getDamage()).to.equal(0);
      expect(card.getSpeed()).to.equal(row.move_range);
      expect(card.getMovementType()).to.equal(({ Walking: 'walk', Flying: 'fly', Bypassing: 'phase' })[row.move_type]);
      expect(card.getAttackType()).to.equal(expectedAttackStats[index][0]);
      expect(card.getReach()).to.equal(expectedAttackStats[index][1]);
      const lifegainModifiers = card.getInherentModifiersContextObjects()
        .filter((modifier) => modifier.type === 'ModifierHealSelfWhenDealingDamage');
      if (lifegainCardIds.includes(card.getId())) {
        expect(lifegainModifiers).to.have.length(1);
        expect(lifegainModifiers[0].healRatio).to.equal(0.5);
      } else {
        expect(lifegainModifiers).to.have.length(0);
      }
      const fixtureAttackType = getFixtureAttackType(row);
      expect(expectedAttackStats[index][0]).to.equal(fixtureAttackType);
      expect(expectedAttackStats[index][1]).to.equal(row.damage === '' ? 0 : Number(row.attack_range));
      const restored = new SDK.Card();
      restored.deserialize(card.createCardData());
      expect(restored.originalCardId).to.equal(card.originalCardId);
      const original = SDK.CardFactory.cardForIdentifier(card.originalCardId, session);
      expect(original, `${name} source card`).to.exist;
      expect(card.name).to.equal(duelystMappings[index][1]);
      expect(card.getName()).to.equal(`[PB] ${card.name}`);
      expect(card.getBaseAnimResource()).to.deep.equal(original.getBaseAnimResource());
      expect(card.getBaseAnimResource(), `${name} sprite`).to.exist;
      expect(card.getPortraitResource()).to.equal(original.getPortraitResource());
      expect(card.getPortraitHexResource()).to.equal(original.getPortraitHexResource());
    });
  });

  it('attaches the five passive modifiers with the roster wording', () => {
    const session = SDK.GameSession.create();
    for (const [id, [type, description]] of passiveDescriptions) {
      const card = SDK.CardFactory.cardForIdentifier(id, session);
      const passive = card.getInherentModifiersContextObjects().find((modifier) => modifier.type === type);
      expect(passive, `${id} modifier`).to.exist;
      const ModifierClass = session.getModifierClassForType(type);
      expect(ModifierClass.getDescription(passive)).to.equal(description);
    }
    for (const id of [50001, 50019, 50035, SDK.Cards.Neutral.GolemMetallurgist]) {
      const card = SDK.CardFactory.cardForIdentifier(id, session);
      expect(card.getInherentModifiersContextObjects().some((modifier) => modifier.type.startsWith('ModifierPhobies'))).to.equal(false);
    }
  });

  it('registers runtime-only ability effects and the exact owner metadata', () => {
    const session = SDK.GameSession.create();
    const effectExpectations = new Map([
      [SDK.Cards.PhobiesAbility.FeelGreat, ['Flash Reincarnation', 'Restore 650 Health to a friendly minion and give it +300 Attack this turn.', ['FX.Cards.Spell.Amplification', 'FX.Cards.Spell.DampeningWave'], 'flashreincarnation', SDK.Cards.Spell.FlashReincarnation]],
      [SDK.Cards.PhobiesAbility.Monty, ['Phoenix Fire', 'Deal 450 damage to an enemy unit or General.', ['FX.Cards.Spell.PhoenixFire'], 'phoenixfire', SDK.Cards.Spell.PhoenixFire]],
      [SDK.Cards.PhobiesAbility.PureAdrenaline, ['Flash Reincarnation', 'Restore 1500 Health to a friendly minion.', ['FX.Cards.Spell.Amplification', 'FX.Cards.Spell.DampeningWave'], 'flashreincarnation', SDK.Cards.Spell.FlashReincarnation]],
      [SDK.Cards.PhobiesAbility.ClangClang, ['War Surge', 'Give a friendly minion +300 Attack this turn.', ['FX.Cards.Spell.WarSurge'], 'warsurge', SDK.Cards.Spell.WarSurge]],
      [SDK.Cards.PhobiesAbility.PeekABoo, ['Blindscorch', 'Give an enemy unit or General -300 Attack for 2 turns.', ['FX.Cards.Spell.DropLift', 'FX.Cards.Spell.Polarity'], 'blindscorch', SDK.Cards.Spell.Blindscorch]],
      [SDK.Cards.PhobiesAbility.HelpingHand, ['Flash Reincarnation', 'Give a friendly minion +300 Attack this turn.', ['FX.Cards.Spell.Amplification', 'FX.Cards.Spell.DampeningWave'], 'flashreincarnation', SDK.Cards.Spell.FlashReincarnation]],
      [SDK.Cards.PhobiesAbility.GroupHug, ['Aperion\'s Claim', 'Restore 1100 Health to all adjacent friendly minions.', ['FX.Cards.Spell.AperionsClaim'], 'voidpulse', SDK.Cards.Spell.AperionsClaim]],
      [SDK.Cards.PhobiesAbility.SpecialDelivery, ['Pupabomb', 'Destroy this minion. Deal 550 damage to all adjacent enemy units.', ['FX.Cards.Faction1.IroncliffeGuardian', 'FX.Modifiers.ModifierGenericDamageFire'], 'sfx_f2_jadeogre_attack_impact', SDK.Cards.Spell.EggGrenade]],
      [SDK.Cards.PhobiesAbility.Gotcha, ['Flash Freeze', 'Destroy this minion. An enemy unit cannot move for 2 turns.', ['FX.Cards.Neutral.Fireblazer', 'FX.Cards.Spell.BlindingSnowstorm'], 'sfx_f6_icebeetle_death', SDK.Cards.Spell.FlashFreeze]],
      [SDK.Cards.PhobiesAbility.Poof, ['Pupabomb', 'Destroy this minion. Deal 1400 damage to all adjacent enemy units.', ['FX.Cards.Faction1.IroncliffeGuardian', 'FX.Modifiers.ModifierGenericDamageFire'], 'sfx_f2_jadeogre_attack_impact', SDK.Cards.Spell.EggGrenade]],
      [SDK.Cards.PhobiesAbility.RaisingHell, ['Holy Immolation', 'Deal 600 damage to all adjacent enemy units and 300 damage to enemy units 2 tiles away in a straight line.', ['FX.Cards.Spell.FollowupDamage'], 'sfx_f2_jadeogre_attack_impact', SDK.Cards.Spell.HolyImmolation]],
    ]);
    const entries = [
      [50005, SDK.Cards.PhobiesAbility.FeelGreat, 0, 1, 1, 'Flash Reincarnation'],
      [50014, SDK.Cards.PhobiesAbility.Monty, 0, 1, 2, 'Phoenix Fire'],
      [50016, SDK.Cards.PhobiesAbility.PureAdrenaline, 0, 3, 1, 'Flash Reincarnation'],
      [50017, SDK.Cards.PhobiesAbility.ClangClang, 1, 2, 2, 'War Surge'],
      [50024, SDK.Cards.PhobiesAbility.PeekABoo, 1, 2, 2, 'Blindscorch'],
      [50026, SDK.Cards.PhobiesAbility.HelpingHand, 0, 2, 2, 'Flash Reincarnation'],
      [50031, SDK.Cards.PhobiesAbility.GroupHug, 1, 3, 1, 'Aperion\'s Claim'],
      [50001, SDK.Cards.PhobiesAbility.SpecialDelivery, 1, 1, 1, 'Pupabomb'],
      [50009, SDK.Cards.PhobiesAbility.Gotcha, 1, 1, 1, 'Flash Freeze'],
      [50013, SDK.Cards.PhobiesAbility.Poof, 1, 1, 1, 'Pupabomb'],
      [50030, SDK.Cards.PhobiesAbility.RaisingHell, 1, 2, 2, 'Holy Immolation'],
    ];

    entries.forEach(([unitId, effectId, lockdown, cooldown, useRange, effectName]) => {
      const unit = SDK.CardFactory.cardForIdentifier(unitId, session);
      expect(unit.activeAbility).to.deep.equal({
        effectCardId: effectId,
        lockdown,
        cooldown,
        useRange,
      });
      const effect = SDK.CardFactory.cardForIdentifier(effectId, session);
      expect(effect, effectName).to.exist;
      expect(effect.name).to.equal(effectName);
      expect(effect.getType()).to.equal(SDK.CardType.AbilityEffect);
      expect(effect.getManaCost()).to.equal(0);
      expect(CardEligibility.isDeckChoiceId(effectId, { getIsPracticeSandboxV2: () => true })).to.equal(false);
      expect(CardEligibility.isAllowedRuntimeCard(session, effect, null)).to.equal(false);
      const [expectedName, description, fx, sound, sourceSpellId] = effectExpectations.get(effectId);
      expect(effect.name).to.equal(expectedName);
      expect(effect.getDescription()).to.equal(description);
      expect(effect.getFXResource()).to.deep.equal(['FX.Factions.Neutral', ...fx]);
      expect(effect.getBaseSoundResource().apply).to.equal(RSX[sound.startsWith('sfx_') ? sound : `sfx_spell_${sound}`].audio);
      const sourceSpell = SDK.CardFactory.cardForIdentifier(sourceSpellId, session);
      expect(effect.getBaseAnimResource()).to.deep.equal(sourceSpell.getBaseAnimResource());
      expect(effect.getPortraitResource()).to.equal(sourceSpell.getPortraitResource());
      expect(effect.getPortraitHexResource()).to.equal(sourceSpell.getPortraitHexResource());
    });

    expect(SDK.CardFactory.cardForIdentifier(SDK.Cards.PhobiesAbility.Monty, session).damageAmount).to.equal(450);
    expect(SDK.CardFactory.cardForIdentifier(SDK.Cards.PhobiesAbility.PureAdrenaline, session).healModifier).to.equal(1500);
    expect(SDK.CardFactory.cardForIdentifier(SDK.Cards.PhobiesAbility.GroupHug, session).healModifier).to.equal(1100);
    const attackBuffs = [
      SDK.Cards.PhobiesAbility.FeelGreat,
      SDK.Cards.PhobiesAbility.ClangClang,
      SDK.Cards.PhobiesAbility.HelpingHand,
    ].map((id) => SDK.CardFactory.cardForIdentifier(id, session).getTargetModifiersContextObjects()[0]);
    attackBuffs.forEach((modifier) => {
      expect(modifier.attributeBuffs.atk).to.equal(300);
      expect(modifier.durationEndTurn).to.equal(1);
    });
    const debuff = SDK.CardFactory.cardForIdentifier(SDK.Cards.PhobiesAbility.PeekABoo, session).getTargetModifiersContextObjects()[0];
    expect(debuff.attributeBuffs.atk).to.equal(-300);
    expect(debuff.durationEndTurn).to.equal(2);
  });
});
