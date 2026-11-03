const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
require('coffeescript/register');
const { expect } = require('chai');
const PhobiesCollectionCardVisual = require('../../../app/ui/views2/collection/PhobiesCollectionCardVisual');

describe('Phobies collection card visual', () => {
  const model = (attributes) => ({ get: (key) => attributes[key] });

  it('uses the unit face only for collection unit cards', () => {
    expect(PhobiesCollectionCardVisual.getCardFaceType(model({ card: {}, isUnit: true }))).to.equal('unit');
    expect(PhobiesCollectionCardVisual.getCardFaceType(model({ card: {}, isSpell: true }))).to.equal('ability');
    expect(PhobiesCollectionCardVisual.getCardFaceType(model({ card: {}, isArtifact: true }))).to.equal(null);
    expect(PhobiesCollectionCardVisual.getCardFaceType(model({ card: null, isUnit: true }))).to.equal(null);
  });

  it('maps all movement and attack values to the approved layered icon assets', () => {
    const attackTypes = ['melee', 'ranged', 'lobbed', 'area'];
    const expectedAttacks = [
      'resources/card_ui/phobies_unit/icons/attack_melee.png',
      'resources/card_ui/phobies_unit/icons/attack_ranged.png',
      'resources/card_ui/phobies_unit/icons/attack_arc.png',
      'resources/card_ui/phobies_unit/icons/attack_area.png',
    ];
    const movementTypes = ['walk', 'fly', 'phase'];
    const expectedMovement = [
      'resources/card_ui/phobies_unit/icons/move_walk@2x.png',
      'resources/card_ui/phobies_unit/icons/move_fly@2x.png',
      'resources/card_ui/phobies_unit/icons/move_phase@2x.png',
    ];

    attackTypes.forEach((attackType, index) => {
      movementTypes.forEach((movementType, moveIndex) => {
        const stats = PhobiesCollectionCardVisual.getUnitStatData({
          getATK: () => 4,
          getHP: () => 7,
          getMovementDistance: () => 2,
          getAttackRangeValue: () => 3,
          getAttackType: () => attackType,
          getMovementType: () => movementType,
        });
        expect(stats[0]).to.deep.equal({ label: 'Attack', value: 4, icon: expectedAttacks[index] });
        expect(stats[1]).to.deep.equal({ label: 'Health', value: 7, icon: 'resources/card_ui/phobies_unit/icons/health@2x.png' });
        expect(stats[2]).to.deep.equal({ label: 'Movement', value: 2, icon: expectedMovement[moveIndex] });
        expect(stats[3]).to.deep.equal({ label: 'Range', value: 3, icon: 'resources/card_ui/phobies_unit/icons/range@2x.png' });
      });
    });
  });
});
