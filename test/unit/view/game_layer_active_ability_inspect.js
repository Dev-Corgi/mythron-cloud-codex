/* eslint-disable max-classes-per-file, import/no-unresolved, mocha/max-top-level-suites */
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const { expect } = require('chai');

describe('GameLayer active ability inspect card', () => {
  let GameLayer;
  let session;

  before(() => {
    const Module = require('module');
    const originalLoad = Module._load;
    class FakeNode {}
    const sdk = { GameSession: { getInstance: () => session } };
    const events = { update_cache_action: 'update_cache_action', inspect_card_start: 'inspect_card_start' };
    const utilsEngine = {
      getPlayer1InspectCardPosition: () => ({ x: 200, y: 200 }),
      getGSIWinRight: () => 1000,
      getGSIWinLeft: () => 0,
      getGSIWinTop: () => 800,
      getGSIWinBottom: () => 0,
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
        if (request === './InspectCardResolver') return originalLoad.call(this, request, parent, isMain);
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
    const unit = {
      activeAbility: { effectCardId: 701 },
      getOwner: () => owner,
      isOwnedByPlayer2: () => false,
      isOwnedByGameSession: () => false,
    };

    GameLayer.prototype.showInspectCard.call(gameLayer, unit, {});

    expect(primaryCalls[0][0]).to.equal(unit);
    expect(relatedCalls[0][0]).to.equal(effectCard);
    expect(relatedCalls[0][1]).to.equal(true);
    expect(effectCard.owner).to.equal(owner);
  });
});
