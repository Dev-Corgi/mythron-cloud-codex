const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');
const { expect } = require('chai');
const SDK = require('../../../../app/sdk.coffee');
const source = require(path.join(__dirname, '../../../../../PhobiesGallery/cards-data.json'));

const sourceNames = [
  'BOOM','Numbskull','Razor Mouth','Cassowary','Cupcake','Droney','K-9000','Gesundheit','Rusty','Minotaur',
  'Grave Digger','Jar Cannon','KABOOM','Murder Wing','Blinky','Doctor Dermic','Gonzo Bonzo','Grimes','Hydra','Slammer Head',
  'Morty','Psyclops','Staremaster','Woolly Bully','Cerberus','Scritch','Zappy','Alley Gator','Fishtank','Fleshcrawler',
  'Leshy','Mr Tramples','Ogre','Hi-Five','Beauty'
];
const duelystMappings = [
  [11051, 'Ion'], [19030, 'Crimson Oculus'], [19048, 'Skyrock Golem'], [19026, 'Rock Pulverizer'], [10981, 'Healing Mystic'],
  [10001, 'Dragonlark'], [19038, 'Golem Metallurgist'], [10953, 'Crossbones'], [512, 'Borean Bear'], [10205, 'Bloodshard Golem'],
  [11064, 'Inquisitor Kron'], [10017, 'Fire Spitter'], [10962, 'Chaos Elemental'], [19051, 'Flameblood Warlock'], [11020, 'Wings of Paradise'],
  [10995, 'Emerald Rejuvenator'], [10989, 'Captain Hank Hart'], [10976, 'Dioltas'], [10204, 'Brightmoss Golem'], [11105, 'Wild Tahr'],
  [11006, 'Black Locust'], [10954, 'Sworn Avenger'], [10973, 'Lux Ignis'], [10306, 'Lightbender'], [11052, 'Hydrax'],
  [11112, 'Letigress'], [19031, 'Thorn Needler'], [404, 'Kolossus'], [10207, 'Stormmetal Golem'], [10956, 'Red Synja'],
  [10996, 'Zurael, the Lifegiver'], [10990, 'Rook'], [19032, 'Rogue Warden'], [119, 'Hamon Bladeseeker'], [159, 'Xenkai Cannoneer']
];
const lifegainCardIds = [50002, 50004, 50011, 50014, 50015, 50018, 50030, 50034];
const expectedAttackStats = [
  ['none', 0], ['area', 1], ['melee', 1], ['melee', 1], ['none', 0], ['melee', 1], ['melee', 1], ['ranged', 2], ['none', 0],
  ['area', 1], ['melee', 1], ['lobbed', 3], ['none', 0], ['ranged', 2], ['melee', 1], ['melee', 1], ['ranged', 2], ['melee', 1],
  ['melee', 1], ['melee', 1], ['melee', 1], ['ranged', 2], ['ranged', 2], ['melee', 1], ['melee', 1], ['ranged', 2], ['ranged', 2],
  ['melee', 1], ['melee', 1], ['melee', 1], ['melee', 1], ['melee', 1], ['ranged', 2], ['area', 1], ['ranged', 2]
];

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
      const fixtureAttackType = row.damage === '' ? 'none' : (row.attack_type === 'Lob' ? 'lobbed' : row.attack_type === 'Targeted AOE' ? 'area' : row.attack_range === 1 ? 'melee' : 'ranged');
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
});
