/* eslint-disable max-classes-per-file, import/no-unresolved, class-methods-use-this, object-shorthand, mocha/max-top-level-suites */
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const { expect } = require('chai');
const RSX = require('app/data/resources');

class FakeNode {
  constructor(resource, text) {
    this.resource = resource;
    this.text = text;
    this.children = [];
  }

  addChild(child) { this.children.push(child); }
  setAnchorPoint() {}
  setPosition() {}
  setScale() {}
  setFontFillColor() {}
}

global.cc = Object.assign(global.cc || {}, {
  Node: FakeNode,
  Sprite: { create: (resource) => new FakeNode(resource) },
  LabelTTF: function (text) { return new FakeNode(null, text); },
  color: (r, g, b) => ({ r, g, b }),
});

const PhobiesHandCardVisual = require('../../../app/view/nodes/cards/PhobiesHandCardVisual');

describe('Phobies hand card visuals', () => {
  it('maps unit stats and every movement and attack type to the layered icons', () => {
    const unit = {
      getATK: () => 4,
      getHP: () => 5,
      getMovementDistance: () => 2,
      getAttackRangeValue: () => 3,
      getAttackType: () => 'lobbed',
      getMovementType: () => 'phase',
      getName: () => 'Planar Scout',
      getLevel: () => 2,
      getManaCost: () => 3,
      getRarityId: () => 1,
    };
    const visual = PhobiesHandCardVisual.createUnit(unit);
    const resources = visual.children.map((child) => child.resource).filter(Boolean);
    const labels = visual.children.map((child) => child.text).filter(Boolean);

    expect(resources).to.include(RSX.card_ui_attack_arc.img);
    expect(resources).to.include(RSX.card_ui_move_phase.img);
    expect(resources).to.include(RSX.card_ui_health.img);
    expect(resources).to.include(RSX.card_ui_range.img);
    expect(labels).to.include('LEVEL 2');
    expect(labels).to.include('4');
    expect(labels).to.include('5');
    expect(labels).to.include('2');
    expect(labels).to.include('3');

    const movementIcons = {
      walk: RSX.card_ui_move_walk.img,
      fly: RSX.card_ui_move_fly.img,
      phase: RSX.card_ui_move_phase.img,
    };
    const attackIcons = {
      melee: RSX.card_ui_attack_melee.img,
      ranged: RSX.card_ui_attack_ranged.img,
      lobbed: RSX.card_ui_attack_arc.img,
      area: RSX.card_ui_attack_area.img,
    };
    for (const [type, icon] of Object.entries(movementIcons)) {
      unit.getMovementType = () => type;
      expect(PhobiesHandCardVisual.createUnit(unit).children.map((child) => child.resource)).to.include(icon);
    }
    for (const [type, icon] of Object.entries(attackIcons)) {
      unit.getAttackType = () => type;
      expect(PhobiesHandCardVisual.createUnit(unit).children.map((child) => child.resource)).to.include(icon);
    }
  });

  it('renders only the active live ability counter and omits counters when ready', () => {
    const ability = { getName: () => 'Phoenix Fire', getLevel: () => 2 };
    const lockdown = PhobiesHandCardVisual.createAbility(ability, { lockdown: 1, cooldown: 0 });
    const cooldown = PhobiesHandCardVisual.createAbility(ability, { lockdown: 0, cooldown: 2 });
    const ready = PhobiesHandCardVisual.createAbility(ability, { lockdown: 0, cooldown: 0 });
    const lockdownResources = lockdown.children.map((child) => child.resource).filter(Boolean);
    const cooldownResources = cooldown.children.map((child) => child.resource).filter(Boolean);
    const readyResources = ready.children.map((child) => child.resource).filter(Boolean);
    const textValues = (node) => node.children.map((child) => child.text).filter(Boolean);

    expect(lockdownResources).to.include(RSX.card_ui_lockdown_ring.img);
    expect(lockdownResources).to.include(RSX.card_ui_lockdown_icon.img);
    expect(lockdownResources).not.to.include(RSX.card_ui_cooldown_ring.img);
    expect(cooldownResources).to.include(RSX.card_ui_cooldown_ring.img);
    expect(cooldownResources).to.include(RSX.card_ui_cooldown_icon.img);
    expect(cooldownResources).not.to.include(RSX.card_ui_lockdown_ring.img);
    expect(textValues(lockdown)).to.include('1');
    expect(textValues(lockdown)).to.include('LEVEL 2');
    expect(textValues(cooldown)).to.include('2');
    expect(readyResources).not.to.include(RSX.card_ui_lockdown_ring.img);
    expect(readyResources).not.to.include(RSX.card_ui_cooldown_ring.img);
  });
});

describe('Phobies hand slot binding', () => {
  let BottomDeckCardNode;
  let BottomDeckLayer;

  before(() => {
    const Module = require('module');
    const originalLoad = Module._load;
    class FakeUnit {}
    const sessionState = { session: null };
    const sdk = {
      Unit: FakeUnit,
      GameSession: { getInstance: () => sessionState.session },
      Cards: { getIsPrismaticCardId: () => false },
    };
    const resources = {};
    const packages = { addToPhobiesHandCardResources() {}, getCardInspectPkgIdentifier: () => 'inspect' };
    const fakeSdkNode = { extend: (properties) => Object.assign(() => {}, { prototype: properties }) };
    const fakeBaseLayer = { extend: (properties) => Object.assign(() => {}, { prototype: properties }) };
    Module._load = (request, parent, isMain) => {
      if (parent && parent.filename.endsWith(`${path.sep}BottomDeckCardNode.js`)) {
        if (request === 'app/sdk') { return sdk; }
        if (request === 'app/data/resources') return resources;
        if (request === 'app/data/packages') return packages;
        if (request === './SdkNode') return fakeSdkNode;
        if (request === 'app/data' || request === 'app/common/utils/utils_engine' || request === 'app/common/utils/utils_position'
          || request === '../../../audio/audio_engine' || request === '../../actions/TweenTypes' || request === '../BaseSprite'
          || request === '../BaseParticleSystem' || request === '../GlowSprite' || request === '../fx/CausticPrismaticGlowSprite'
          || request === '../../helpers/NodeFactory' || request === '../visualStateTags/CardNodeVisualStateTag'
          || request === './StatsChangeNode') return {};
      }
      if (parent && parent.filename.endsWith(`${path.sep}BottomDeckLayer.js`)) {
        if (request === 'app/sdk') { return sdk; }
        if (request === '../../nodes/cards/BottomDeckCardNode') { return BottomDeckCardNode; }
        if (request === '../BaseLayer') { return fakeBaseLayer; }
        if (request === 'app/common/event_types') {
          return {
            followup_card_start: 'followup_card_start',
            followup_card_stop: 'followup_card_stop',
            update_cache_step: 'update_cache_step',
            update_cache_action: 'update_cache_action',
          };
        }
        return {};
      }
      return originalLoad.call(this, request, parent, isMain);
    };
    try {
      BottomDeckCardNode = require('../../../app/view/nodes/cards/BottomDeckCardNode');
      BottomDeckLayer = require('../../../app/view/layers/game/BottomDeckLayer');
    } finally {
      Module._load = originalLoad;
    }
    this.sessionState = sessionState;
  });

  function bindSlot(session, player, slotIndex, ordinaryCard) {
    this.sessionState.session = session;
    const updates = [];
    const node = {
      _abilityDisplayCard: null,
      setSdkCard(card) { this.sdkCard = card; },
      _updatePhobiesCardVisual() {
        const state = this._abilitySlotState ? { ...this._abilitySlotState.state } : null;
        const silenced = this._abilitySlotState ? this._abilitySlotState.silenced : null;
        updates.push({
          ability: this._isPhobiesAbilityCard,
          state,
          silenced,
        });
      },
    };
    player.getDeck = () => ({ getCardInHandAtIndex: () => ordinaryCard || null });
    session.getMyPlayer = () => player;
    session.getExistingCardIndexOrCreateCardFromData = () => null;
    session.getExistingCardFromIndexOrCreateCardFromData = () => ({ getId: () => 99, setOwnerId() {} });
    BottomDeckCardNode.prototype.setSdkCardFromHandIndex.call(node, slotIndex);
    return { node, updates };
  }

  it('keeps the granted ability in its original slot and refreshes live counters/silence', () => {
    const state = { lockdown: 1, cooldown: 0 };
    const unit = { getIsActive: () => true };
    const player = {
      getPlayerId: () => 'player1',
      getActiveAbilityForHandSlot: (index) => (index === 3
        ? {
          unit,
          definition: { effectCardId: 99 },
          state,
          silenced: false,
        }
        : null),
    };
    const session = { getRulesetId: () => 'practice-sandbox-hex', getRulesetVersion: () => 2 };
    const first = bindSlot.call(this, session, player, 3);
    expect(first.node.handIndex).to.equal(3);
    expect(first.node._isPhobiesAbilityCard).to.equal(true);
    expect(first.updates[0].state).to.deep.equal({ lockdown: 1, cooldown: 0 });

    state.lockdown = 0;
    state.cooldown = 2;
    player.getActiveAbilityForHandSlot = () => ({
      unit,
      definition: { effectCardId: 99 },
      state,
      silenced: true,
    });
    const refreshed = bindSlot.call(this, session, player, 3);
    expect(refreshed.node.handIndex).to.equal(3);
    expect(refreshed.updates[0]).to.include({
      ability: true,
      silenced: true,
    });
    expect(refreshed.updates[0].state).to.deep.equal({ lockdown: 0, cooldown: 2 });

    player.getActiveAbilityForHandSlot = () => null;
    const dead = bindSlot.call(this, session, player, 3);
    expect(dead.node.sdkCard).to.equal(null);
  });

  it('leaves legacy and ordinary hand cards on the original renderer path', () => {
    const ordinaryCard = { id: 4 };
    const player = { getPlayerId: () => 'player1' };
    const legacySession = { getRulesetId: () => 'practice-sandbox-hex', getRulesetVersion: () => 1 };
    const legacy = bindSlot.call(this, legacySession, player, 3, ordinaryCard);
    expect(legacy.node.sdkCard).to.equal(ordinaryCard);
    expect(legacy.node._isPhobiesAbilityCard).to.equal(false);
    expect(legacy.updates[0].ability).to.equal(false);
  });

  it('refreshes existing hand slots from both cache update events', () => {
    this.sessionState.session = { getRulesetId: () => 'practice-sandbox-hex', getRulesetVersion: () => 2 };
    const calls = [];
    const cardNode = Object.assign(Object.create(BottomDeckCardNode.prototype), {
      setSdkCardFromHandIndex(index) { calls.push(['bind', index]); },
      updateUsability() { calls.push(['usability']); },
    });
    const listeners = {};
    const layer = Object.assign(Object.create(BottomDeckLayer.prototype), {
      _super() {},
      getScene: () => ({ getGameLayer: () => ({ getEventBus: () => ({ on: (event, callback, context) => { listeners[event] = () => callback.call(context); } }) }) }),
      getCardNodes: () => [cardNode],
    });

    BottomDeckLayer.prototype._startListeningToEvents.call(layer);
    listeners.update_cache_step();
    listeners.update_cache_action();

    expect(calls).to.deep.equal([['bind', 0], ['usability'], ['bind', 0], ['usability']]);
  });
});
