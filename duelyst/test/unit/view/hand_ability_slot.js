const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const { expect } = require('chai');
const layout = require('../../../app/resources/card_ui/phobies_ability/ability-layout.json');
const HandAbilitySlot = require('../../../app/view/layers/game/handAbilitySlot');

describe('hand ability slot model', () => {
  const makeUnit = (overrides = {}) => ({
    getIndex: () => 42,
    getCanUseActiveAbility: () => true,
    activeAbility: { effectCardId: 701, lockdown: 1, cooldown: 1 },
    ...overrides,
  });
  const makeInfo = ({
    lockdown = 0, cooldown = 0, silenced = false, unit = makeUnit(),
  } = {}) => ({
    unit,
    definition: unit.activeAbility,
    state: { lockdown, cooldown },
    silenced,
  });
  const myTurn = { isMyTurn: true, selectionLocked: false };

  describe('counter selection', () => {
    it('shows no counter when both are 0', () => {
      expect(HandAbilitySlot.getLiveCounter({ lockdown: 0, cooldown: 0 })).to.equal(null);
      expect(HandAbilitySlot.getLiveCounter(null)).to.equal(null);
    });

    it('shows Lockdown when it is the nonzero counter', () => {
      expect(HandAbilitySlot.getLiveCounter({ lockdown: 2, cooldown: 0 })).to.deep.equal({ type: 'lockdown', value: 2 });
    });

    it('shows Cooldown when it is the nonzero counter', () => {
      expect(HandAbilitySlot.getLiveCounter({ lockdown: 0, cooldown: 3 })).to.deep.equal({ type: 'cooldown', value: 3 });
    });

    it('uses violet for Lockdown and cyan for Cooldown', () => {
      expect(HandAbilitySlot.COUNTER_STYLES.lockdown.color).to.deep.equal({ r: 0xe8, g: 0xb9, b: 0xff });
      expect(HandAbilitySlot.COUNTER_STYLES.cooldown.color).to.deep.equal({ r: 0x7b, g: 0xe6, b: 0xf5 });
    });
  });

  describe('DEPLOYED', () => {
    it('shows the effect spell with the live Lockdown value and no mana cost', () => {
      const model = HandAbilitySlot.describeHandAbilitySlot(makeInfo({ lockdown: 1 }), myTurn);
      expect(model.effectCardId).to.equal(701);
      expect(model.counter).to.deep.equal({ type: 'lockdown', value: 1 });
      expect(model.usable).to.equal(false);
      expect(model.showManaCost).to.equal(false);
    });

    it('leaves the slot empty for a unit without an ability', () => {
      expect(HandAbilitySlot.describeHandAbilitySlot(null, myTurn)).to.equal(null);
      expect(HandAbilitySlot.describeHandAbilitySlot(makeInfo({ unit: makeUnit({ activeAbility: null }) }), myTurn)).to.equal(null);
    });

    it('leaves the slot empty for an invalid effect card id', () => {
      const unit = makeUnit({ activeAbility: { effectCardId: -1 } });
      expect(HandAbilitySlot.describeHandAbilitySlot(makeInfo({ unit }), myTurn)).to.equal(null);
      const noEffect = makeUnit({ activeAbility: {} });
      expect(HandAbilitySlot.describeHandAbilitySlot(makeInfo({ unit: noEffect }), myTurn)).to.equal(null);
    });
  });

  describe('READY', () => {
    it('is usable with no badge when counters are 0, the unit has a point and it is my turn', () => {
      const model = HandAbilitySlot.describeHandAbilitySlot(makeInfo(), myTurn);
      expect(model.usable).to.equal(true);
      expect(model.counter).to.equal(null);
    });
  });

  describe('COOLDOWN', () => {
    it('is dimmed with a Cooldown badge after use', () => {
      const model = HandAbilitySlot.describeHandAbilitySlot(makeInfo({ cooldown: 1 }), myTurn);
      expect(model.usable).to.equal(false);
      expect(model.counter).to.deep.equal({ type: 'cooldown', value: 1 });
    });
  });

  describe('TURN_END', () => {
    it('changes the key when the counter value changes and drops the badge at zero', () => {
      const before = HandAbilitySlot.describeHandAbilitySlot(makeInfo({ cooldown: 2 }), myTurn);
      const after = HandAbilitySlot.describeHandAbilitySlot(makeInfo({ cooldown: 1 }), myTurn);
      const ready = HandAbilitySlot.describeHandAbilitySlot(makeInfo({ cooldown: 0 }), myTurn);
      expect(after.counter.value).to.equal(1);
      expect(after.key).to.not.equal(before.key);
      expect(ready.counter).to.equal(null);
      expect(ready.key).to.not.equal(after.key);
    });

    it('keeps the key stable when nothing changed', () => {
      const a = HandAbilitySlot.describeHandAbilitySlot(makeInfo({ cooldown: 2 }), myTurn);
      const b = HandAbilitySlot.describeHandAbilitySlot(makeInfo({ cooldown: 2 }), myTurn);
      expect(a.key).to.equal(b.key);
    });
  });

  describe('SILENCED', () => {
    it('is dimmed while the counters are shown unchanged', () => {
      const model = HandAbilitySlot.describeHandAbilitySlot(makeInfo({ cooldown: 1, silenced: true }), myTurn);
      expect(model.usable).to.equal(false);
      expect(model.counter).to.deep.equal({ type: 'cooldown', value: 1 });
    });

    it('is dimmed even when ready', () => {
      expect(HandAbilitySlot.describeHandAbilitySlot(makeInfo({ silenced: true }), myTurn).usable).to.equal(false);
    });
  });

  describe('unusable conditions', () => {
    it('is dimmed when the unit has no available attack slot', () => {
      const unit = makeUnit({ getCanUseActiveAbility: () => false });
      expect(HandAbilitySlot.describeHandAbilitySlot(makeInfo({ unit }), myTurn).usable).to.equal(false);
    });

    it('is dimmed when it is not my turn', () => {
      expect(HandAbilitySlot.describeHandAbilitySlot(makeInfo(), { isMyTurn: false, selectionLocked: false }).usable).to.equal(false);
    });

    it('is dimmed while selection is locked, like a spell', () => {
      expect(HandAbilitySlot.describeHandAbilitySlot(makeInfo(), { isMyTurn: true, selectionLocked: true }).usable).to.equal(false);
    });

    it('is dimmed without a context', () => {
      expect(HandAbilitySlot.describeHandAbilitySlot(makeInfo()).usable).to.equal(false);
    });
  });

  describe('DEATH and LEGACY', () => {
    it('empties the slot when the SDK has no ability for it', () => {
      const player = { getActiveAbilityForHandSlot: () => null };
      expect(HandAbilitySlot.getHandAbilitySlot(player, 2, myTurn)).to.equal(null);
    });

    it('describes the slot returned by the player for its index', () => {
      const requested = [];
      const player = { getActiveAbilityForHandSlot: (i) => { requested.push(i); return makeInfo(); } };
      expect(HandAbilitySlot.getHandAbilitySlot(player, 3, myTurn).effectCardId).to.equal(701);
      expect(requested).to.deep.equal([3]);
    });

    it('only builds the context for slots that have an ability', () => {
      let built = 0;
      const context = () => { built += 1; return myTurn; };
      expect(HandAbilitySlot.getHandAbilitySlot({ getActiveAbilityForHandSlot: () => null }, 0, context)).to.equal(null);
      expect(built).to.equal(0);
      expect(HandAbilitySlot.getHandAbilitySlot({ getActiveAbilityForHandSlot: () => makeInfo() }, 0, context).usable).to.equal(true);
      expect(built).to.equal(1);
    });

    it('never produces a slot for players without the v2 lookup (legacy)', () => {
      expect(HandAbilitySlot.getHandAbilitySlot({}, 0, myTurn)).to.equal(null);
      expect(HandAbilitySlot.getHandAbilitySlot(null, 0, myTurn)).to.equal(null);
      expect(HandAbilitySlot.getHandAbilitySlot({ getActiveAbilityForHandSlot() {} }, null, myTurn)).to.equal(null);
    });
  });

  describe('ability face data', () => {
    const definition = { effectCardId: 701, lockdown: 1, cooldown: 1 };

    it('keeps the base definition when there is no live state', () => {
      expect(HandAbilitySlot.buildAbilityFaceData(definition, null)).to.equal(definition);
      expect(HandAbilitySlot.buildAbilityFaceData(null, { lockdown: 1, cooldown: 0 })).to.equal(null);
    });

    it('carries the live nonzero counter', () => {
      const face = HandAbilitySlot.buildAbilityFaceData(definition, { lockdown: 0, cooldown: 2 });
      expect(face.live).to.equal(true);
      expect(face.liveCounter).to.deep.equal({ type: 'cooldown', value: 2 });
      expect(face.effectCardId).to.equal(701);
      expect(definition.live).to.equal(undefined);
    });

    it('marks a ready ability live with no counter', () => {
      const face = HandAbilitySlot.buildAbilityFaceData(definition, { lockdown: 0, cooldown: 0 });
      expect(face.live).to.equal(true);
      expect(face.liveCounter).to.equal(null);
    });

    it('uses the live state for a deployed unit and the base definition otherwise', () => {
      const deployed = { activeAbility: definition, getActiveAbilityState: () => ({ lockdown: 1, cooldown: 0 }) };
      expect(HandAbilitySlot.getUnitAbilityFaceData(deployed, 701).liveCounter).to.deep.equal({ type: 'lockdown', value: 1 });
      const inHand = { activeAbility: definition, getActiveAbilityState: () => null };
      expect(HandAbilitySlot.getUnitAbilityFaceData(inHand, 701)).to.equal(definition);
      const noStateApi = { activeAbility: definition };
      expect(HandAbilitySlot.getUnitAbilityFaceData(noStateApi, 701)).to.equal(definition);
      expect(HandAbilitySlot.getUnitAbilityFaceData(deployed, 999)).to.equal(null);
    });
  });

  describe('BLOODBOUND signature face data', () => {
    const makeSession = (v2, state) => ({
      getIsPracticeSandboxV2: () => v2,
      getGeneralForPlayerId: (id) => {
        expect(id).to.equal('p1');
        return {
          getActiveAbilityState: () => state,
          activeAbility: { lockdown: 2, cooldown: 2 },
        };
      },
    });
    const signature = {
      isSignatureCard: () => true,
      getOwner: () => ({ getPlayerId: () => 'p1' }),
      getId: () => 20174,
    };

    it('shows the General live counter on the signature card', () => {
      const face = HandAbilitySlot.getSignatureAbilityFaceData(signature, makeSession(true, { lockdown: 2, cooldown: 0 }));
      expect(face.effectCardId).to.equal(20174);
      expect(face.live).to.equal(true);
      expect(face.liveCounter).to.deep.equal({ type: 'lockdown', value: 2 });
    });

    it('shows no counter when the Bloodbound ability is ready', () => {
      const face = HandAbilitySlot.getSignatureAbilityFaceData(signature, makeSession(true, { lockdown: 0, cooldown: 0 }));
      expect(face.liveCounter).to.equal(null);
    });

    it('keeps the existing card in legacy matches', () => {
      expect(HandAbilitySlot.getSignatureAbilityFaceData(signature, makeSession(false, { lockdown: 2, cooldown: 0 }))).to.equal(null);
      expect(HandAbilitySlot.getPrimaryInspectFaceData({ sdkCard: signature, slotModel: null, session: makeSession(false, { lockdown: 2, cooldown: 0 }) })).to.equal(null);
    });

    it('ignores cards that are not signature cards or generals without state', () => {
      const notSignature = { ...signature, isSignatureCard: () => false };
      expect(HandAbilitySlot.getSignatureAbilityFaceData(notSignature, makeSession(true, { lockdown: 2, cooldown: 0 }))).to.equal(null);
      expect(HandAbilitySlot.getSignatureAbilityFaceData(signature, makeSession(true, null))).to.equal(null);
      expect(HandAbilitySlot.getSignatureAbilityFaceData({}, makeSession(true, { lockdown: 1, cooldown: 0 }))).to.equal(null);
    });
  });

  describe('HOVER face data', () => {
    it('shows the effect card with the unit live counter', () => {
      const unit = makeUnit({ getActiveAbilityState: () => ({ lockdown: 0, cooldown: 1 }) });
      const model = HandAbilitySlot.describeHandAbilitySlot(makeInfo({ unit, cooldown: 1 }), myTurn);
      const session = { getIsPracticeSandboxV2: () => true };
      const face = HandAbilitySlot.getPrimaryInspectFaceData({ sdkCard: {}, slotModel: model, session });
      expect(face.effectCardId).to.equal(701);
      expect(face.liveCounter).to.deep.equal({ type: 'cooldown', value: 1 });
    });
  });

  describe('badge geometry', () => {
    it('scales ring and icon sizes from ability-layout.json at normal card size', () => {
      const lockdown = HandAbilitySlot.getBadgeGeometry(layout, 'lockdown');
      expect(lockdown.ringSize).to.equal(layout.counters.lockdown.size[0] / 2);
      expect(lockdown.iconSize).to.equal(layout.counters.lockdown.iconSize[0] / 2);
      // the padlock sits left of the Lockdown ring and the hourglass right of the Cooldown ring
      expect(lockdown.iconOffset.x).to.be.below(0);
      const cooldown = HandAbilitySlot.getBadgeGeometry(layout, 'cooldown');
      expect(cooldown.iconOffset.x).to.be.above(0);
      expect(Math.abs(cooldown.iconOffset.y)).to.equal(0);
    });
  });
});
