const path = require('path');
const fs = require('fs');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
require('coffeescript/register');
const { expect } = require('chai');
const SDK = require('../../../app/sdk.coffee');
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

  it('resolves every imported ability effect with its matching Duelyst skill icon and detail', () => {
    const skills = {
      51001: ['Flash Reincarnation', 'Restore 650 Health to a friendly minion and give it +300 Attack this turn.', 'icon_f5_flashreincarnation.png'],
      51002: ['Phoenix Fire', 'Deal 450 damage to an enemy unit or General.', 'icon_f2_phoenixfire.png'],
      51003: ['Flash Reincarnation', 'Restore 1500 Health to a friendly minion.', 'icon_f5_flashreincarnation.png'],
      51004: ['War Surge', 'Give a friendly minion +300 Attack this turn.', 'icon_f1_warsurge.png'],
      51005: ['Blindscorch', 'Give an enemy unit or General -300 Attack for 2 turns.', 'icon_f3_blindscorch.png'],
      51006: ['Flash Reincarnation', 'Give a friendly minion +300 Attack this turn.', 'icon_f5_flashreincarnation.png'],
      51007: ['Aperion\'s Claim', 'Restore 1100 Health to all adjacent friendly minions.', 'icon_f1_greatergood.png'],
      51008: ['Pupabomb', 'Destroy this minion. Deal 550 damage to all adjacent enemy units.', 'icon_f5_egggrenade.png'],
      51009: ['Flash Freeze', 'Destroy this minion. An enemy unit cannot move for 2 turns.', 'icon_f6_flashfreeze.png'],
      51010: ['Pupabomb', 'Destroy this minion. Deal 1400 damage to all adjacent enemy units.', 'icon_f5_egggrenade.png'],
      51011: ['Holy Immolation', 'Deal 600 damage to all adjacent enemy units and 300 damage to enemy units 2 tiles away in a straight line.', 'icon_f1_holyimmolation.png'],
      51012: ['Knucklestorm', 'Move this minion 1 tile and attack with it as a single action; the attack deals 425 damage.', 'icon_f2_kindle.png'],
      51013: ['Spiral Counter', 'Move this minion through enemy units or empty tiles to an unoccupied tile 3 tiles away, dealing 550 damage to each enemy unit passed through. Enemy units are preferred when choosing the path.', 'icon_f2_spiralcounter.png'],
      51014: ['Koan of Horns', 'Deal 350 damage to an enemy unit and push it back 1 tile in a straight line.', 'icon_f2_koanofhorns.png'],
      51015: ['Boulder Hurl', 'Create a Wall on an adjacent empty tile or remove an adjacent Wall.', 'icon_neutral_precisionboulder.png'],
      51016: ['Thunderbomb', 'Deal 500 damage to an enemy unit and each enemy unit behind it in a straight line. Walls block this beam.', 'icon_f2_hellskitchen.png'],
    };
    Object.keys(skills).forEach((id) => {
      const [name, description, iconFile] = skills[id];
      const detail = PhobiesCollectionCardVisual.getAbilityDetail({
        activeAbility: { effectCardId: Number(id), lockdown: 2, cooldown: 3 },
      });
      expect(detail, `effect ${id}`).to.include({
        name, description, level: 1, lockdown: 2, cooldown: 3,
      });
      if (iconFile) expect(detail.icon.atlas).to.include(iconFile);
      else expect(detail.icon.portrait).to.equal(true);
    });
  });

  it('uses the real first frame and texture dimensions for all sixteen atlas icons', () => {
    for (let id = 51001; id <= 51016; id += 1) {
      const icon = PhobiesCollectionCardVisual.getAbilityIcon(null, id);
      const plist = fs.readFileSync(path.join(__dirname, '../../../app', icon.atlas.replace(/\.png$/, '.plist')), 'utf8');
      const frame = plist.match(/<key>frame<\/key>\s*<string>\{\{(\d+),(\d+)\},\{48,48\}\}<\/string>/);
      const size = plist.match(/<key>size<\/key>\s*<string>\{(\d+),(\d+)\}<\/string>/);
      expect([icon.x, icon.y]).to.deep.equal([Number(frame[1]), Number(frame[2])]);
      expect([icon.width, icon.height]).to.deep.equal([Number(size[1]), Number(size[2])]);
      expect(PhobiesCollectionCardVisual.getAbilityArtPresentation(icon).artSize).to.equal(`${Number(size[1]) * 2}px ${Number(size[2]) * 2}px`);
    }
  });

  it('does not show stale detail when a card has no active ability or its effect is missing', () => {
    const originalFactory = SDK.CardFactory.cardForIdentifier;
    try {
      SDK.CardFactory.cardForIdentifier = () => null;
      expect(PhobiesCollectionCardVisual.getAbilityDetail({})).to.equal(null);
      expect(PhobiesCollectionCardVisual.getAbilityDetail({ activeAbility: { effectCardId: 51002 } })).to.equal(null);
    } finally {
      SDK.CardFactory.cardForIdentifier = originalFactory;
    }
  });

  it('converts sprite frames into the selected-card crop and supports standalone fallback art', () => {
    expect(PhobiesCollectionCardVisual.getAbilityArtPresentation({
      atlas: 'resources/icons/icon_f2_phoenixfire.png', x: 0, y: 196, width: 128, height: 256,
    })).to.deep.equal({
      art: 'resources/icons/icon_f2_phoenixfire.png', artPosition: '0px -392px', artSize: '256px 512px',
    });
    expect(PhobiesCollectionCardVisual.getAbilityArtPresentation({
      atlas: 'resources/icons/attack_melee.png', portrait: true,
    })).to.deep.equal({ art: 'resources/icons/attack_melee.png', artPosition: 'center', artSize: 'cover' });
  });

  it('renders the generated ability data in the selected-card template', () => {
    const handlebars = require('handlebars').create();
    handlebars.registerHelper('localize', (key) => key);
    handlebars.registerHelper('compare', function (left, operator, right, options) {
      return (operator === '!==' ? left !== right : left === right) ? options.fn(this) : options.inverse(this);
    });
    const source = fs.readFileSync(path.join(__dirname, '../../../app/ui/views2/collection/templates/selected_card.hbs'), 'utf8');
    const template = handlebars.compile(source);
    const detail = PhobiesCollectionCardVisual.getAbilityDetail({
      activeAbility: { effectCardId: 51002, lockdown: 1, cooldown: 2 },
    });
    const presentation = PhobiesCollectionCardVisual.getAbilityArtPresentation(detail.icon);
    const html = template({
      activeAbility: {
        ...detail,
        ...presentation,
        frame: 'frame.png',
        lockdownRing: 'lockdown-ring.png',
        lockdownIcon: 'lockdown-icon.png',
        cooldownRing: 'cooldown-ring.png',
        cooldownIcon: 'cooldown-icon.png',
      },
      rarityName: 'Basic',
    });

    expect(html).to.include('background-image:url(\'resources/icons/icon_f2_phoenixfire.png\');background-position:0px -392px;background-size:256px 512px');
    expect(html).to.include('LEVEL 1');
    expect(html).to.include('>1</span>');
    expect(html).to.include('>2</span>');
    expect(html).to.include('Deal 450 damage to an enemy unit or General.');
  });
});
