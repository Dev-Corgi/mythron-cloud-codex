const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const Module = require('module');
const { expect } = require('chai');
require('coffeescript/register');
const CONFIG = require('../../../app/common/config');
const SDK = require('../../../app/sdk.coffee');

global.cc = global.cc || {};
global.cc.p = global.cc.p || (() => ({ x: 0, y: 0 }));
global.cc.color = (r, g, b) => ({ r, g, b });
global.cc.colorEqual = (a, b) => a.r === b.r && a.g === b.g && a.b === b.b;

describe('Methron Point tile view', () => {
  let EntityNode;
  let TileNode;

  before(() => {
    const originalLoad = Module._load;
    const fakeSdkNode = {
      extend(properties) {
        function FakeSdkNode() {}
        Object.assign(FakeSdkNode.prototype, properties);
        FakeSdkNode.extend = function (childProperties) {
          const ParentNode = this;
          function ChildNode() {
            ParentNode.apply(this, arguments);
          }
          ChildNode.prototype = Object.create(ParentNode.prototype);
          ChildNode.prototype.constructor = ChildNode;
          Object.assign(ChildNode.prototype, childProperties);
          ChildNode.extend = ParentNode.extend;
          return ChildNode;
        };
        return FakeSdkNode;
      },
    };
    Module._load = function (request, parent, isMain) {
      if (parent && parent.filename.endsWith(`${path.sep}EntityNode.js`)) {
        if (request === './SdkNode') return fakeSdkNode;
        if (request === 'app/sdk') return SDK;
        if (request === 'app/common/config') return CONFIG;
        return {};
      }
      if (parent && parent.filename.endsWith(`${path.sep}TileNode.js`)) {
        if (request === './EntityNode') return EntityNode;
        if (request === './UnitNode') return { prototype: {} };
        if (request === './EntitySprite' || request === '../BaseSprite') return {};
        if (request === '../../../audio/audio_engine') return {};
      }
      return originalLoad.call(this, request, parent, isMain);
    };
    try {
      EntityNode = require('../../../app/view/nodes/cards/EntityNode');
      TileNode = require('../../../app/view/nodes/cards/TileNode');
    } finally {
      Module._load = originalLoad;
    }
  });

  it('updates point tint and refreshes owner visuals after capture', () => {
    let owner = null;
    const tile = {
      getId: () => SDK.Cards.Tile.MethronPoint,
      getIndex: () => 1,
      getPosition: () => ({ q: 0, r: 0 }),
      getOccupantChangingAction: () => null,
      getOccupant: () => null,
      isOwnedByGameSession: () => owner == null,
      isOwnedByMyPlayer: () => owner === 'player1',
      isOwnedByPlayer2: () => owner === 'player2',
    };
    const node = Object.create(TileNode.prototype);
    node.sdkCard = tile;
    node.getSdkCard = () => tile;
    node._fxSprites = [];
    node._statsNode = null;
    node._ownerIndicatorSprite = null;
    node._showingOwnerSprites = false;
    node.getCardResourceRequestId = () => 0;
    node.getAreResourcesValid = () => true;
    node.whenResourcesReady = () => ({ then: (callback) => callback(0) });
    const refreshedTints = [];
    node.entitySprite = { setColor: (color) => refreshedTints.push(color) };
    node.updateSpritesForOwner();
    expect(refreshedTints[0]).to.deep.equal({ r: 170, g: 170, b: 170 });

    const session = SDK.GameSession.create();
    const action = new SDK.CaptureMethronPointAction(session);
    action.setTarget(tile);
    owner = 'player1';
    node.onAfterShowAction({ action });
    expect(refreshedTints).to.have.length(2);
    expect(refreshedTints[1]).to.equal(CONFIG.PLAYER_TILE_COLOR);

    owner = 'player2';
    node.onAfterShowAction({ action });
    expect(refreshedTints).to.have.length(3);
    expect(refreshedTints[2]).to.equal(CONFIG.OPPONENT_TILE_COLOR);
  });

  it('suppresses generic owner indicators for neutral and player-owned points', () => {
    const tile = {
      getId: () => SDK.Cards.Tile.MethronPoint,
      isOwnedByGameSession: () => true,
    };
    const node = { sdkCard: tile };
    expect(TileNode.prototype.getCanShowOwnerSprites.call(node)).to.equal(false);

    tile.isOwnedByGameSession = () => false;
    expect(TileNode.prototype.getCanShowOwnerSprites.call(node)).to.equal(false);
    tile.isOwnedByMyPlayer = () => true;
    tile.isOwnedByPlayer2 = () => false;
    expect(TileNode.prototype.getCanShowOwnerSprites.call(node)).to.equal(false);
    tile.isOwnedByMyPlayer = () => false;
    tile.isOwnedByPlayer2 = () => true;
    expect(TileNode.prototype.getCanShowOwnerSprites.call(node)).to.equal(false);
  });

  it('refreshes the pushed victim origin and destination without refreshing the caster tile', () => {
    const oldInstance = SDK.GameSession.getInstance();
    const session = SDK.GameSession.create();
    session.setRuleset('practice-sandbox-hex', 2);
    const originalGetInstance = SDK.GameSession.getInstance;
    SDK.GameSession.getInstance = () => session;
    try {
      const action = {
        targetStartPosition: { q: 3, r: 2 },
        getSourcePosition: () => ({ q: 2, r: 2 }),
        getTargetPosition: () => ({ q: 4, r: 2 }),
      };
      const refreshed = [];
      for (const q of [2, 3, 4]) {
        const node = { getBoardPosition: () => ({ q, r: 2 }), showCurrentState: () => refreshed.push(q) };
        TileNode.prototype.onBeforeShowMove.call(node, { action });
        TileNode.prototype.onAfterShowMove.call(node, { action });
      }
      expect(refreshed).to.deep.equal([3, 4]);
    } finally {
      SDK.GameSession.getInstance = originalGetInstance;
      session.terminate();
    }
    expect(SDK.GameSession.getInstance()).to.equal(oldInstance);
  });
});
