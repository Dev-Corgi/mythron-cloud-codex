/* eslint-disable max-classes-per-file, import/no-unresolved, mocha/max-top-level-suites */
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const { expect } = require('chai');

describe('GameLayer active ability inspect card', () => {
  let GameLayer;
  let BattleLog;
  let BattleLogNode;
  let session;
  let FakeUnit;
  let FakeAbilityAction;

  before(() => {
    const Module = require('module');
    const originalLoad = Module._load;
    class FakeNode {}
    FakeUnit = class FakeUnit {};
    FakeAbilityAction = class FakeAbilityAction {};
    const sdk = {
      GameSession: { getInstance: () => session },
      Unit: FakeUnit,
      CardPlayAction: {
        matches: (action) => action instanceof FakeAbilityAction,
        shouldRevealToPlayer: (action, playerId) => action.getOwnerId() !== playerId,
      },
      MoveAction: class MoveAction {},
      AttackAction: class AttackAction {},
    };
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
        if (request === 'app/common/config') {
          return {
            TILESIZE: 100,
            BATTLELOG_ENTRY_SIZE: 100,
            OPPONENT_PLAYED_CARD_TRANSITION_DURATION: 0.3,
            OPPONENT_PLAYED_CARD_SHOW_DURATION: 0.7,
            OPPONENT_PLAYED_CARD_DELAY: 0.2,
          };
        }
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

    const originalNodeLoad = Module._load;
    Module._load = (request, parent, isMain) => {
      if (parent && parent.filename.endsWith(`${path.sep}BattleLogNode.js`)) {
        if (request === 'app/sdk') return sdk;
        if (request === 'app/common/config') return { BATTLELOG_ENTRY_SIZE: 100 };
        if (request === 'app/data/resources' || request === 'app/data/packages'
          || request === 'app/common/utils/utils_engine') return {};
        if (request === './SdkNode') {
          return {
            extend: (properties) => {
              const Node = class {};
              Object.assign(Node.prototype, properties);
              return Node;
            },
          };
        }
        if (request === '../BaseSprite') return class BaseSprite {};
      }
      return originalNodeLoad.call(this, request, parent, isMain);
    };
    try {
      BattleLogNode = require('../../../app/view/nodes/cards/BattleLogNode');
    } finally {
      Module._load = originalNodeLoad;
    }

    const originalBattleLogLoad = Module._load;
    Module._load = (request, parent, isMain) => {
      if (parent && parent.filename.endsWith(`${path.sep}BattleLog.js`)) {
        if (request === 'app/sdk') return sdk;
        if (request === 'app/common/event_types') return events;
        if (request === 'underscore') return require('underscore');
        if (request === '../BaseLayer') {
          return {
            extend: (properties) => {
              const Layer = class {};
              Object.assign(Layer.prototype, properties);
              return Layer;
            },
          };
        }
        if (request === '../../nodes/BaseSprite' || request === '../../nodes/cards/BattleLogNode') return FakeNode;
        return {};
      }
      return originalBattleLogLoad.call(this, request, parent, isMain);
    };
    try {
      BattleLog = require('../../../app/view/layers/game/BattleLog');
    } finally {
      Module._load = originalBattleLogLoad;
    }
  });

  it('shows opponent unit abilities through the reveal sequence but skips the viewer own ability', () => {
    session = { getIsSpectateMode: () => false };
    const interfaceFor = (ownerId) => ({
      getIsImplicit: () => false,
      getOwnerId: () => ownerId,
    });
    const showReveal = (action) => {
      const revealCalls = [];
      const shownActions = [];
      const sdkActionInterface = {};
      const layer = {
        _player: { getPlayerId: () => 'viewer' },
        showSkippablePlayCard(...args) { revealCalls.push(args); },
        _showAction(value) { shownActions.push(value); },
      };
      const shouldShow = GameLayer.prototype._showPlayedCardIfNeeded.call(layer, action, sdkActionInterface, 0);
      return {
        shouldShow,
        revealCalls,
        shownActions,
        sdkActionInterface,
      };
    };
    const opponentAction = Object.assign(new FakeAbilityAction(), interfaceFor('opponent'));
    const opponent = showReveal(opponentAction);
    expect(opponent.shouldShow).to.equal(true);
    expect(opponent.revealCalls).to.have.length(1);
    expect(opponent.revealCalls[0].slice(0, 4)).to.deep.equal([
      opponentAction,
      0.3,
      0.7,
      0.2,
    ]);
    opponent.revealCalls[0][4]();
    expect(opponent.shownActions).to.deep.equal([opponent.sdkActionInterface]);

    const generalAction = new FakeAbilityAction();
    generalAction.getIsGeneralAbility = () => true;
    generalAction.getIsImplicit = () => false;
    generalAction.getOwnerId = () => 'opponent';
    const general = showReveal(generalAction);
    expect(general.shouldShow).to.equal(true);
    expect(general.revealCalls).to.have.length(1);

    const ownAction = Object.assign(new FakeAbilityAction(), interfaceFor('viewer'));
    const own = showReveal(ownAction);
    expect(own.shouldShow).to.equal(false);
    expect(own.revealCalls).to.have.length(0);
  });

  it('sets an ability action effect card on the battle log node', () => {
    const effectCard = { id: 701 };
    const action = Object.assign(new FakeAbilityAction(), { getCard: () => effectCard });
    const node = Object.create(BattleLogNode.prototype);
    node.step = null;
    node.stopShowingDetails = () => {};
    node.setHighlighted = () => {};
    node.updateSpritesForOwner = () => {};
    node.setSdkCard = (card) => { node.displayedCard = card; };

    BattleLogNode.prototype.setStep.call(node, { getAction: () => action });

    expect(node.displayedCard).to.equal(effectCard);
  });

  it('accepts a unit ability as a battle-log entry', () => {
    const action = new FakeAbilityAction();
    const isValidEntry = BattleLog.prototype.getIsValidEntry.call({ _stepsProcessed: [] }, { getAction: () => action });

    expect(isValidEntry).to.equal(true);
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
    const makeSession = (extra = {}) => ({
      getRulesetId: () => 'practice-sandbox-hex',
      getRulesetVersion: () => 2,
      getIsPracticeSandboxV2: () => true,
      createCardForIdentifier: () => ({ setOwner() {} }),
      ...extra,
    });
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
    const cardBase = (extra) => ({
      getOwner: () => owner,
      isOwnedByPlayer2: () => false,
      isOwnedByGameSession: () => false,
      ...extra,
    });

    it('keeps deployed unit ability card definition counters', () => {
      const unit = Object.assign(new FakeUnit(), cardBase({
        activeAbility: { effectCardId: 701, lockdown: 1, cooldown: 1 },
        getActiveAbilityState: () => ({ lockdown: 0, cooldown: 1 }),
      }));
      const faces = run(unit, {}, makeSession());
      expect(faces.related[faces.related.length - 1].live).to.equal(false);
      expect(faces.related[faces.related.length - 1].liveCounter).to.equal(null);
      expect(faces.related[faces.related.length - 1]).to.include({ lockdown: 1, cooldown: 1 });
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

    it('gives the General signature card an ability face with its base counters', () => {
      const signature = cardBase({
        isSignatureCard: () => true,
        getId: () => 20174,
        getReferencedCardData: () => null,
      });
      const general = { getActiveAbilityState: () => ({ lockdown: 2, cooldown: 0 }), activeAbility: { lockdown: 2, cooldown: 2 } };
      const faces = run(signature, {}, makeSession({ getGeneralForPlayerId: () => general }));
      expect(faces.primary[0].effectCardId).to.equal(20174);
      expect(faces.primary[0].liveCounter).to.equal(null);
      expect(faces.primary[0]).to.include({ lockdown: 2, cooldown: 2 });
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

    it('shows the effect card of a hand ability slot with its static ability definition', () => {
      const unit = { activeAbility: { lockdown: 1, cooldown: 1 }, getActiveAbilityState: () => ({ lockdown: 1, cooldown: 0 }) };
      const effectCard = cardBase({ getReferencedCardData: () => null, getId: () => 701 });
      const node = new global.cc.Node();
      node.getAbilitySlotModel = () => ({ unit, effectCardId: 701 });
      const faces = run(effectCard, node, makeSession());
      expect(faces.primary[0].effectCardId).to.equal(701);
      expect(faces.primary[0].liveCounter).to.equal(null);
      expect(faces.primary[0]).to.include({ lockdown: 1, cooldown: 1 });
    });
  });
});
