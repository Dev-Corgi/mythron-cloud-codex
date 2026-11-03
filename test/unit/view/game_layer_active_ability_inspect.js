/* eslint-disable max-classes-per-file, import/no-unresolved, mocha/max-top-level-suites */
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const { expect } = require('chai');

describe('GameLayer active ability inspect card', () => {
  let GameLayer;
  let session;
  let FakeUnit;

  before(() => {
    const Module = require('module');
    const originalLoad = Module._load;
    class FakeNode {}
    FakeUnit = class FakeUnit {};
    const sdk = { GameSession: { getInstance: () => session }, Unit: FakeUnit };
    const events = { update_cache_action: 'update_cache_action', inspect_card_start: 'inspect_card_start' };
    const utilsEngine = {
      getPlayer1InspectCardPosition: () => ({ x: 200, y: 200 }),
      getGSIWinRight: () => 1000,
      getGSIWinLeft: () => 0,
      getGSIWinTop: () => 800,
      getGSIWinBottom: () => 0,
      getGSINodeCenterScreenPosition: () => ({ x: 300, y: 100 }),
    };
    Module._load = (request, parent, isMain) => {
      if (parent && parent.filename.endsWith(`${path.sep}GameLayer.js`)) {
        if (request === 'app/sdk') return sdk;
        if (request === 'app/common/config') return { TILESIZE: 100, BATTLELOG_ENTRY_SIZE: 100 };
        if (request === 'app/common/event_types') return events;
        if (request === 'app/common/utils/utils_engine') return utilsEngine;
        if (request === 'app/view/layers/FXCompositeLayer') {
          return {
            extend: (properties) => {
              const Layer = class {};
              Object.assign(Layer.prototype, properties);
              return Layer;
            },
          };
        }
        if (request === './InspectCardResolver' || request === './handAbilitySlot') return originalLoad.call(this, request, parent, isMain);
        if (request.endsWith('EntityNode') || request.endsWith('BottomDeckCardNode')
          || request.endsWith('ArtifactNode') || request.endsWith('BattleLogNode')
          || request.endsWith('SignatureCardNode')) return FakeNode;
        return {};
      }
      return originalLoad.call(this, request, parent, isMain);
    };
    try {
      global.cc = Object.assign(global.cc || {}, { Node: FakeNode });
      GameLayer = require('../../../app/view/layers/game/GameLayer');
    } finally {
      Module._load = originalLoad;
    }
  });

  it('creates and displays the ability effect card in the secondary inspect node', () => {
    const effectCard = { owner: null, setOwner(owner) { this.owner = owner; } };
    const owner = { playerId: 'player1' };
    session = {
      getRulesetId: () => 'practice-sandbox-hex',
      getRulesetVersion: () => 2,
      createCardForIdentifier: (id) => {
        expect(id).to.equal(701);
        return effectCard;
      },
    };
    const primaryCalls = [];
    const relatedCalls = [];
    const makeInspectNode = (calls) => ({
      getSdkCard: () => null,
      showInspect(...args) { calls.push(args); },
      getCardContentSize: () => ({ width: 100, height: 100 }),
      getKeywordsShowing: () => false,
      getHasKeywords: () => false,
      setPhobiesUnitFaceEnabled() {},
      setPhobiesAbilityFaceEnabled() {},
      setPosition() {},
    });
    const gameLayer = {
      _player: { getFollowupCard: () => null },
      _inspectCardNode: makeInspectNode(primaryCalls),
      _referencedCardNode: makeInspectNode(relatedCalls),
      stopShowingInspectCard() {},
      getShouldShowCardInstructionals: () => false,
      getPlayer2: () => ({}),
      getMyPlayer: () => ({}),
      getEventBus: () => ({ trigger() {} }),
    };
    const unit = Object.assign(new FakeUnit(), {
      activeAbility: { effectCardId: 701 },
      getOwner: () => owner,
      isOwnedByPlayer2: () => false,
      isOwnedByGameSession: () => false,
    });

    GameLayer.prototype.showInspectCard.call(gameLayer, unit, {});

    expect(primaryCalls[0][0]).to.equal(unit);
    expect(relatedCalls[0][0]).to.equal(effectCard);
    expect(relatedCalls[0][1]).to.equal(true);
    expect(effectCard.owner).to.equal(owner);
  });

  describe('live counters on the ability face', () => {
    const owner = { playerId: 'player1', getPlayerId: () => 'player1' };
    const makeSession = (extra = {}) => Object.assign({
      getRulesetId: () => 'practice-sandbox-hex',
      getRulesetVersion: () => 2,
      getIsPracticeSandboxV2: () => true,
      createCardForIdentifier: () => ({ setOwner() {} }),
    }, extra);
    const run = (sdkCard, node, sessionOverride) => {
      session = sessionOverride;
      const faces = { primary: [], related: [] };
      const makeInspectNode = (faceCalls) => ({
        getSdkCard: () => null,
        showInspect() {},
        getCardContentSize: () => ({ width: 100, height: 100 }),
        getModifiersContentSize: () => ({ width: 0, height: 0 }),
        getKeywordsShowing: () => false,
        getHasKeywords: () => false,
        setPhobiesUnitFaceEnabled() {},
        setPhobiesAbilityFaceEnabled(data) { faceCalls.push(data); },
        setPosition() {},
      });
      const gameLayer = {
        _player: { getFollowupCard: () => null },
        _inspectCardNode: makeInspectNode(faces.primary),
        _referencedCardNode: makeInspectNode(faces.related),
        stopShowingInspectCard() {},
        getShouldShowCardInstructionals: () => false,
        getPlayer2: () => ({}),
        getMyPlayer: () => ({}),
        getEventBus: () => ({ trigger() {} }),
      };
      GameLayer.prototype.showInspectCard.call(gameLayer, sdkCard, node);
      return faces;
    };
    const cardBase = (extra) => Object.assign({
      getOwner: () => owner,
      isOwnedByPlayer2: () => false,
      isOwnedByGameSession: () => false,
    }, extra);

    it('gives a deployed unit ability card its live nonzero counter', () => {
      const unit = Object.assign(new FakeUnit(), cardBase({
        activeAbility: { effectCardId: 701, lockdown: 1, cooldown: 1 },
        getActiveAbilityState: () => ({ lockdown: 0, cooldown: 1 }),
      }));
      const faces = run(unit, {}, makeSession());
      expect(faces.related[faces.related.length - 1].live).to.equal(true);
      expect(faces.related[faces.related.length - 1].liveCounter).to.deep.equal({ type: 'cooldown', value: 1 });
      expect(faces.primary[0]).to.equal(null);
    });

    it('keeps the base counters for a unit that is not on the board', () => {
      const definition = { effectCardId: 701, lockdown: 1, cooldown: 1 };
      const unit = Object.assign(new FakeUnit(), cardBase({
        activeAbility: definition,
        getActiveAbilityState: () => null,
      }));
      const faces = run(unit, {}, makeSession());
      expect(faces.related[faces.related.length - 1]).to.equal(definition);
    });

    it('gives the General signature card an ability face with the General live counter', () => {
      const signature = cardBase({
        isSignatureCard: () => true,
        getId: () => 20174,
        getReferencedCardData: () => null,
      });
      const general = { getActiveAbilityState: () => ({ lockdown: 2, cooldown: 0 }), activeAbility: { lockdown: 2, cooldown: 2 } };
      const faces = run(signature, {}, makeSession({ getGeneralForPlayerId: () => general }));
      expect(faces.primary[0].effectCardId).to.equal(20174);
      expect(faces.primary[0].liveCounter).to.deep.equal({ type: 'lockdown', value: 2 });
    });

    it('leaves the signature card unchanged in legacy matches', () => {
      const signature = cardBase({
        isSignatureCard: () => true,
        getId: () => 20174,
        getReferencedCardData: () => null,
      });
      const general = { getActiveAbilityState: () => ({ lockdown: 2, cooldown: 0 }) };
      const faces = run(signature, {}, makeSession({
        getRulesetId: () => 'ranked',
        getRulesetVersion: () => 1,
        getIsPracticeSandboxV2: () => false,
        getGeneralForPlayerId: () => general,
      }));
      expect(faces.primary[0]).to.equal(null);
    });

    it('shows the effect card of a hand ability slot with the live counter of its unit', () => {
      const unit = { activeAbility: { lockdown: 1, cooldown: 1 }, getActiveAbilityState: () => ({ lockdown: 1, cooldown: 0 }) };
      const effectCard = cardBase({ getReferencedCardData: () => null, getId: () => 701 });
      const node = new global.cc.Node();
      node.getAbilitySlotModel = () => ({ unit, effectCardId: 701 });
      const faces = run(effectCard, node, makeSession());
      expect(faces.primary[0].effectCardId).to.equal(701);
      expect(faces.primary[0].liveCounter).to.deep.equal({ type: 'lockdown', value: 1 });
    });
  });
});
