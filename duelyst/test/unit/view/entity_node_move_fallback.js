const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const Module = require('module');
const { expect } = require('chai');

describe('EntityNode move fallback', () => {
  let EntityNode;
  let session;
  let originalCc;
  let cachedEntityNode;
  const entityNodePath = require.resolve('../../../app/view/nodes/cards/EntityNode');

  before(() => {
    const originalLoad = Module._load;
    originalCc = global.cc;
    cachedEntityNode = require.cache[entityNodePath];
    delete require.cache[entityNodePath];
    global.cc = { ...global.cc || {}, p: () => ({ x: 0, y: 0 }) };
    const fakeSdkNode = {
      extend(properties) {
        function FakeSdkNode() {}
        Object.assign(FakeSdkNode.prototype, properties);
        return FakeSdkNode;
      },
    };
    const sdk = { GameSession: { getInstance: () => session } };
    Module._load = function (request, parent, isMain) {
      if (parent && parent.filename.endsWith(`${path.sep}EntityNode.js`)) {
        if (request === './SdkNode') return fakeSdkNode;
        if (request === 'app/sdk') return sdk;
        if (request === 'app/common/config') return { ENTITY_MOVE_CORRECTION: 0 };
        if (request === 'app/common/utils/utils_position') return { getPositionsAreEqual: (a, b) => a.x === b.x && a.y === b.y };
        if (request === 'app/common/utils/utils_engine') return { transformBoardToTileMap: (position) => ({ x: (position.x != null ? position.x : position.q) * 10, y: (position.y != null ? position.y : position.r) * 10 }) };
        if (request === 'app/common/event_types') return { before_show_move: 'before_show_move', after_show_move: 'after_show_move' };
        return {};
      }
      return originalLoad.call(this, request, parent, isMain);
    };
    try {
      EntityNode = require('../../../app/view/nodes/cards/EntityNode');
    } finally {
      Module._load = originalLoad;
    }
  });

  after(() => {
    if (cachedEntityNode) require.cache[entityNodePath] = cachedEntityNode;
    else delete require.cache[entityNodePath];
    global.cc = originalCc;
  });

  it('snaps to the action destination when the node cannot play a move animation', () => {
    session = {
      getRulesetId: () => 'standard',
      getBoard: () => ({}),
    };
    const events = [];
    const positions = [];
    const node = Object.create(EntityNode.prototype);
    node.getScene = () => ({ getGameLayer: () => ({ getEventBus: () => ({ trigger: (type, event) => events.push({ type, event }) }) }) });
    node.canChangeState = () => false;
    node.stopShowingMove = () => {};
    node.stopShowingTeleport = () => {};
    node.getMoveTileCount = () => 1;
    node.getMoveDuration = () => 0;
    node.getAnimationActionFromAnimResource = () => null;
    node.setPosition = (position) => positions.push(position);
    node.setMovePosition = (position) => { node.movePosition = position; };
    node.setIsMoving = (isMoving) => { node.isMoving = isMoving; };
    const action = {};

    const duration = node.showMove(action, { x: 1, y: 2 }, { x: 4, y: 5 });

    expect(duration).to.equal(0);
    expect(positions).to.deep.equal([{ x: 40, y: 50 }]);
    expect(node.movePosition).to.deep.equal({ x: 40, y: 50 });
    expect(node.isMoving).to.equal(false);
    expect(events).to.deep.equal([
      { type: 'before_show_move', event: { type: 'before_show_move', action } },
      { type: 'after_show_move', event: { type: 'after_show_move', action } },
    ]);
  });

  it('snaps to the action destination when animation resources fail to load', () => {
    session = {
      getRulesetId: () => 'standard',
      getBoard: () => ({}),
    };
    const events = [];
    const positions = [];
    const node = Object.create(EntityNode.prototype);
    node.getScene = () => ({ getGameLayer: () => ({ getEventBus: () => ({ trigger: (type, event) => events.push({ type, event }) }) }) });
    node.canChangeState = () => true;
    node.stopShowingMove = () => {};
    node.stopShowingTeleport = () => {};
    node.getMoveTileCount = () => 1;
    node.getMoveDuration = () => 0;
    node.getAnimationActionFromAnimResource = () => null;
    node.getCardResourceRequestId = () => 'card-request';
    node.whenResourcesReady = () => ({
      then: (onReady, onError) => onError(new Error('resource load failed')),
    });
    node.setPosition = (position) => positions.push(position);
    node.setMovePosition = (position) => { node.movePosition = position; };
    node.setIsMoving = (isMoving) => { node.isMoving = isMoving; };
    node.getAreResourcesValid = () => false;
    node.showNextState = () => {};
    const action = {};

    const duration = node.showMove(action, { x: 1, y: 2 }, { x: 4, y: 5 });

    expect(duration).to.equal(0);
    expect(positions).to.deep.equal([{ x: 10, y: 20 }, { x: 40, y: 50 }]);
    expect(node.movePosition).to.deep.equal({ x: 40, y: 50 });
    expect(node.isMoving).to.equal(false);
    expect(events.map(({ type }) => type)).to.deep.equal(['before_show_move', 'after_show_move']);
    expect(events).to.have.length(2);
  });

  it('snaps to the destination when resources resolve invalid for the current card', () => {
    session = { getRulesetId: () => 'standard', getBoard: () => ({}) };
    const events = [];
    const positions = [];
    let onReady;
    const node = Object.create(EntityNode.prototype);
    node.getScene = () => ({ getGameLayer: () => ({ getEventBus: () => ({ trigger: (type, event) => events.push({ type, event }) }) }) });
    node.canChangeState = () => true;
    node.stopShowingMove = () => {};
    node.stopShowingTeleport = () => {};
    node.getMoveTileCount = () => 1;
    node.getMoveDuration = () => 0;
    node.getAnimationActionFromAnimResource = () => null;
    node.getCardResourceRequestId = () => 'card-request';
    node.whenResourcesReady = () => ({ then: (callback) => { onReady = callback; } });
    node.setPosition = (position) => positions.push(position);
    node.setMovePosition = (position) => { node.movePosition = position; };
    node.setIsMoving = (isMoving) => { node.isMoving = isMoving; };
    node.getAreResourcesValid = () => false;

    const duration = node.showMove({}, { x: 1, y: 2 }, { x: 4, y: 5 });
    onReady('card-request');

    expect(duration).to.equal(0);
    expect(positions).to.deep.equal([{ x: 10, y: 20 }, { x: 40, y: 50 }]);
    expect(node.isMoving).to.equal(false);
    expect(events.map(({ type }) => type)).to.deep.equal(['before_show_move', 'after_show_move']);
  });

  it('finishes at the destination if the node becomes state-locked while resources load', () => {
    session = { getRulesetId: () => 'standard', getBoard: () => ({}) };
    const events = [];
    const positions = [];
    let onReady;
    let canChangeState = true;
    const node = Object.create(EntityNode.prototype);
    node.getScene = () => ({ getGameLayer: () => ({ getEventBus: () => ({ trigger: (type, event) => events.push({ type, event }) }) }) });
    node.canChangeState = () => canChangeState;
    node.stopShowingMove = () => {};
    node.stopShowingTeleport = () => {};
    node.getMoveTileCount = () => 1;
    node.getMoveDuration = () => 0;
    node.getAnimationActionFromAnimResource = () => null;
    node.getCardResourceRequestId = () => 'card-request';
    node.whenResourcesReady = () => ({ then: (callback) => { onReady = callback; } });
    node.setPosition = (position) => positions.push(position);
    node.setMovePosition = (position) => { node.movePosition = position; };
    node.setIsMoving = (isMoving) => { node.isMoving = isMoving; };
    node.getAreResourcesValid = () => true;

    const duration = node.showMove({}, { x: 1, y: 2 }, { x: 4, y: 5 });
    canChangeState = false;
    onReady('card-request');

    expect(duration).to.equal(0);
    expect(positions).to.deep.equal([{ x: 10, y: 20 }, { x: 40, y: 50 }]);
    expect(node.movePosition).to.deep.equal({ x: 40, y: 50 });
    expect(node.isMoving).to.equal(false);
    expect(events.map(({ type }) => type)).to.deep.equal(['before_show_move', 'after_show_move']);
  });

  it('does not mutate a replacement node when an old resource request rejects', () => {
    session = { getRulesetId: () => 'standard', getBoard: () => ({}) };
    const events = [];
    const positions = [];
    let onError;
    let resourceRequestId = 'old-card-request';
    const node = Object.create(EntityNode.prototype);
    node.getScene = () => ({ getGameLayer: () => ({ getEventBus: () => ({ trigger: (type, event) => events.push({ type, event }) }) }) });
    node.canChangeState = () => true;
    node.stopShowingMove = () => {};
    node.stopShowingTeleport = () => {};
    node.getMoveTileCount = () => 1;
    node.getMoveDuration = () => 0;
    node.getAnimationActionFromAnimResource = () => null;
    node.getCardResourceRequestId = () => resourceRequestId;
    node.whenResourcesReady = () => ({ then: (onReady, callback) => { onError = callback; } });
    node.setPosition = (position) => positions.push(position);
    node.setMovePosition = (position) => { node.movePosition = position; };
    node.setIsMoving = (isMoving) => { node.isMoving = isMoving; };

    node.showMove({}, { x: 1, y: 2 }, { x: 4, y: 5 });
    resourceRequestId = 'replacement-card-request';
    node.setPosition({ x: 70, y: 80 });
    node.setIsMoving(false);
    const positionsBeforeReject = positions.length;
    onError(new Error('old resource request rejected'));

    expect(positions).to.have.length(positionsBeforeReject);
    expect(positions[positions.length - 1]).to.deep.equal({ x: 70, y: 80 });
    expect(node.movePosition).to.deep.equal({ x: 40, y: 50 });
    expect(node.isMoving).to.equal(false);
    expect(events).to.deep.equal([]);
  });

  it('uses board equality for hex moves when the node cannot play an animation', () => {
    session = {
      getRulesetId: () => 'practice-sandbox-hex',
      getBoard: () => ({ positionsEqual: (a, b) => a.q === b.q && a.r === b.r }),
    };
    const positions = [];
    const node = Object.create(EntityNode.prototype);
    node.getScene = () => ({ getGameLayer: () => ({ getEventBus: () => ({ trigger: () => {} }) }) });
    node.canChangeState = () => false;
    node.stopShowingMove = () => {};
    node.stopShowingTeleport = () => {};
    node.getMoveTileCount = () => 1;
    node.getMoveDuration = () => 0;
    node.getAnimationActionFromAnimResource = () => null;
    node.setPosition = (position) => positions.push(position);
    node.setMovePosition = (position) => { node.movePosition = position; };
    node.setIsMoving = (isMoving) => { node.isMoving = isMoving; };

    node.showMove({}, { q: 1, r: 2 }, { q: 4, r: 5 });

    expect(positions).to.deep.equal([{ x: 40, y: 50 }]);
    expect(node.movePosition).to.deep.equal({ x: 40, y: 50 });
    expect(node.isMoving).to.equal(false);
  });
});
