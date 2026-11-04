const path = require('path');
const Module = require('module');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
require('coffeescript/register');
const { expect } = require('chai');
const SDK = require('../../../app/sdk.coffee');
const DATA = require('../../../app/data.coffee');
const FX = require('../../../app/data/fx');
const resourcesForAliases = require('../../../app/data/phobiesFXResources');
const UtilsSDK = require('../../utils/utils_sdk');

describe('Phobies presentation integration', () => {
  let GameLayer;
  let PlayerView;
  let NodeFactory;
  const cachedModules = new Map();
  let originalCc;
  const loadedPackages = [];

  before(() => {
    originalCc = global.cc;
    const extend = (properties) => {
      function FakeClass() {}
      Object.assign(FakeClass.prototype, properties);
      return FakeClass;
    };
    global.cc = {
      ...global.cc, Class: { extend }, Node: function Node() {}, p: (x = 0, y = 0) => ({ x, y }),
    };
    const originalLoad = Module._load;
    for (const file of ['../../../app/view/layers/game/GameLayer', '../../../app/view/Player', '../../../app/view/helpers/NodeFactory']) {
      const resolved = require.resolve(file);
      cachedModules.set(resolved, require.cache[resolved]);
      delete require.cache[resolved];
    }
    Module._load = function (request, parent, isMain) {
      if (parent && parent.filename.endsWith(`${path.sep}NodeFactory.js`) && request === 'app/common/utils/utils_engine') return {};
      if (parent && /[\\/]view[\\/](layers[\\/]game[\\/]GameLayer|Player)\.js$/.test(parent.filename)) {
        if (request === 'app/view/helpers/modifierAction') return function ModifierAction() {};
        if (request === 'app/ui/managers/package_manager') return { getInstance: () => ({ loadMinorPackage: (id, resources) => { loadedPackages.push({ id, resources }); return Promise.resolve(); } }) };
        if (request === 'app/view/layers/FXCompositeLayer') return { extend };
        if (request.startsWith('.') || request.startsWith('app/view') || request === 'app/audio/audio_engine'
          || request === 'app/common/utils/utils_engine' || request.startsWith('app/ui/') || request.startsWith('app/analytics') || request.startsWith('app/common/eventbus')) return {};
      }
      return originalLoad.call(this, request, parent, isMain);
    };
    try {
      GameLayer = require('../../../app/view/layers/game/GameLayer');
      PlayerView = require('../../../app/view/Player');
      NodeFactory = require('../../../app/view/helpers/NodeFactory');
    } finally {
      Module._load = originalLoad;
    }
  });

  after(() => {
    cachedModules.forEach((cached, resolved) => {
      if (cached) require.cache[resolved] = cached;
      else delete require.cache[resolved];
    });
    global.cc = originalCc;
  });

  afterEach(() => SDK.GameSession.reset());

  it('resolves actual caster and target event leaves, including native absent target events', () => {
    const pairs = [
      ['Pupabomb', FX.Cards.Faction1.IroncliffeGuardian.UnitAttackedFX, FX.Modifiers.ModifierGenericDamageFire.ModifierTriggeredFX[0].impactFX],
      ['FlashReincarnation', FX.Cards.Spell.Amplification.SpellCastFX, FX.Cards.Spell.DampeningWave.SpellAppliedFX],
      ['FlashFreeze', FX.Cards.Neutral.Fireblazer.UnitAttackedFX, FX.Cards.Spell.BlindingSnowstorm.SpellAppliedFX],
      ['Knucklestorm', FX.Factions.Neutral.UnitSpawnFX], ['SpiralCounter', FX.Factions.Neutral.UnitSpawnFX],
      ['PhoenixFire', FX.Factions.Neutral.UnitSpawnFX, FX.Cards.Spell.PhoenixFire.SpellAppliedFX],
      ['WarSurge', FX.Cards.Spell.WarSurge.SpellCastFX],
      ['KoanOfHorns', FX.Cards.Spell.CryonicPotential.SpellCastFX, FX.Modifiers.ModifierGenericDamageIce.ModifierTriggeredFX[0].impactFX],
      ['Blindscorch', FX.Cards.Spell.DropLift.SpellCastFX, FX.Cards.Spell.Polarity.SpellAppliedFX],
      ['HolyImmolation', FX.Cards.Spell.FollowupDamage.SpellAppliedFX],
      ['AperionsClaim', FX.Cards.Spell.AperionsClaim.SpellCastFX, FX.Cards.Spell.AperionsClaim.SpellAppliedFX],
      ['Thunderbomb', FX.Cards.Faction3.Blast.UnitPrimaryAttackedFX],
    ];
    pairs.forEach(([name, cast, target]) => {
      const identifiers = [`FX.Phobies.${name}`];
      expect(DATA.dataForIdentifiersWithFilter(identifiers, SDK.FXType.SpellCastFX)).to.deep.equal(cast.map((leaf) => ({ ...leaf, atSource: true })));
      expect(DATA.dataForIdentifiersWithFilter(identifiers, SDK.FXType.SpellAppliedFX)).to.deep.equal(target || []);
      expect(resourcesForAliases(identifiers).length, name).to.be.above(0);
    });
    expect(DATA.dataForIdentifiersWithFilter(['FX.Phobies.BoulderCreate'], SDK.FXType.UnitSpawnFX)).to.deep.equal(FX.Cards.Spell.DropLift.SpellAppliedFX);
    expect(DATA.dataForIdentifiersWithFilter(['FX.Phobies.BoulderRemove'], SDK.FXType.TargetFX)).to.deep.equal(FX.Cards.Spell.ArtifactDefiler.SpellAppliedFX);
  });

  it('resolves actual NodeFactory caster and target positions without mutating the source leaves', () => {
    const source = { q: 2, r: 2 };
    const target = { q: 4, r: 2 };
    const sourceScreen = { x: 20, y: 20 };
    const targetScreen = { x: 40, y: 20 };
    const selected = [];
    const factory = { getByType: () => function FXSprite() {}, _createFXSprite: (...args) => selected.push(args) };
    Object.keys(FX.Phobies).forEach((name) => {
      const cast = DATA.dataForIdentifiersWithFilter([`FX.Phobies.${name}`], SDK.FXType.SpellCastFX);
      const applied = DATA.dataForIdentifiersWithFilter([`FX.Phobies.${name}`], SDK.FXType.SpellAppliedFX);
      cast.forEach((leaf) => {
        NodeFactory._createFXSprites.call(factory, leaf, {}, [], source, target, sourceScreen, targetScreen, true);
        const result = selected.pop();
        expect(result[4], name).to.deep.equal(source);
        if (!['Projectile', 'EnergyBeam', 'Chain', 'Flocking'].includes(leaf.type) && !leaf.sourceToTarget && !leaf.targetToSource) expect(result[5], name).to.deep.equal(source);
      });
      applied.forEach((leaf) => {
        NodeFactory._createFXSprites.call(factory, leaf, {}, [], source, target, sourceScreen, targetScreen, true);
        const result = selected.pop();
        if (!leaf.sourceToTarget && !leaf.targetToSource && !leaf.atSource && !['Projectile', 'EnergyBeam', 'Chain', 'Flocking'].includes(leaf.type)) expect(result[4], name).to.deep.equal(target);
      });
    });
    expect(FX.Cards.Spell.Amplification.SpellCastFX[0].atSource).to.equal(undefined);
  });

  it('loads every alias resource through the actual step resource path', async () => {
    const session = SDK.GameSession.create();
    for (let id = 51001; id <= 51016; id += 1) {
      const card = session.createCardForIdentifier(id);
      const action = {
        getSource: () => null, getTarget: () => null, getCard: () => card, getFXResource: () => [],
      };
      const step = { actionInterfaceSequence: [{ getSdkAction: () => action }] };
      const start = loadedPackages.length;
      GameLayer.prototype._loadStepResources.call({}, step);
      // Verify each step lifecycle before starting the next.
      // eslint-disable-next-line no-await-in-loop
      await step.loadPromise;
      const expected = resourcesForAliases(card.getFXResource());
      if (expected.length) {
        expect(loadedPackages.length).to.equal(start + 1);
        expect(loadedPackages[start].resources).to.deep.equal(expected);
      }
    }
  });

  it('replays the victim movement while retaining caster provenance', () => {
    const session = SDK.GameSession.create();
    const action = new SDK.PhobiesPushAction(session);
    const caster = new SDK.Unit(session);
    const victim = new SDK.Unit(session);
    action.setSource(caster);
    action.setTarget(victim);
    action.targetStartPosition = { q: 3, r: 2 };
    action.setTargetPosition({ q: 4, r: 2 });
    const moves = [];
    const node = { showMove: (...args) => { moves.push(args); return 0.5; } };
    const layer = { getEventBus: () => ({ trigger: () => {} }), getNodeForSdkCard: (card) => { expect(card).to.equal(victim); return node; }, _getCanShowActionForNode: () => true };
    expect(GameLayer.prototype._showActionForGame.call(layer, action)).to.equal(0.5);
    expect(moves).to.deep.equal([[action, { q: 3, r: 2 }, { q: 4, r: 2 }]]);
    expect(action.getSource()).to.equal(caster);
  });

  it('serializes executed push snapshots and replays movement on the victim', () => {
    UtilsSDK.setupSession([{ id: 1 }], [{ id: 101 }], true, true);
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    for (const tile of session.getBoard().getTiles()) if (tile.getId() === SDK.Cards.Tile.Wall) tile.setIsRemoved(true);
    const deploy = (id, owner, position) => {
      const unit = session.createCardForIdentifier(id);
      unit.setOwnerId(owner);
      session.applyCardToBoard(unit, position.q, position.r, unit.createNewCardData(), null);
      unit.setActionPoints(2);
      if (unit.getActiveAbilityState()) unit.getActiveAbilityState().lockdown = 0;
      return unit;
    };
    const caster = deploy(50020, session.getPlayer1Id(), { q: 2, r: 2 });
    const victim = deploy(50003, session.getPlayer2Id(), { q: 3, r: 2 });
    const action = session.getPlayer1().actionUseActiveAbility(caster.getIndex(), victim.getPosition());
    session.executeAction(action);
    expect(action.getIsValid(), action.getValidationMessage()).to.equal(true);
    const push = action.getFlattenedActionTree().find((child) => child instanceof SDK.PhobiesPushAction);
    expect(push).to.exist;
    const decodedPush = session.deserializeActionFromFirebase(JSON.parse(session.serializeToJSON(push)));
    const decodedAbility = session.deserializeActionFromFirebase(JSON.parse(session.serializeToJSON(action)));
    expect(decodedPush.targetStartPosition).to.deep.equal({ q: 3, r: 2 });
    expect(decodedAbility.casterPosition).to.deep.equal({ q: 2, r: 2 });
    expect(decodedPush.getSource()).to.equal(caster);
    expect(decodedPush.getTarget()).to.equal(victim);
    const moves = [];
    const node = { showMove: (...args) => { moves.push(args); return 0.5; } };
    const layer = { getEventBus: () => ({ trigger: () => {} }), getNodeForSdkCard: (card) => { expect(card).to.equal(victim); return node; }, _getCanShowActionForNode: () => true };
    GameLayer.prototype._showActionForGame.call(layer, decodedPush);
    expect(moves).to.deep.equal([[decodedPush, { q: 3, r: 2 }, { q: 4, r: 2 }]]);
  });

  it('places caster FX at its captured pre-movement origin and target FX at the effect center', () => {
    const session = SDK.GameSession.create();
    const action = new SDK.UseActiveAbilityAction(session, 'player1', null, { q: 4, r: 2 });
    const card = session.createCardForIdentifier(51012);
    card.getCenterPositionOfAppliedEffects = () => ({ q: 4, r: 2 });
    action.getCard = () => card;
    action.getIsValidApplication = () => true;
    action.casterPosition = { q: 2, r: 2 };
    expect(GameLayer.prototype._getActionFXBoardPositions.call({}, action, { q: 3, r: 2 }, { q: 4, r: 2 })).to.deep.equal({
      sourceBoardPosition: { q: 2, r: 2 }, targetBoardPosition: { q: 4, r: 2 },
    });
  });

  it('highlights SDK-valid targets for the living unit bound to the selected hand slot', () => {
    UtilsSDK.setupSession([{ id: 1 }], [{ id: 101 }], true, true);
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 2);
    const unit = session.createCardForIdentifier(50011);
    unit.setOwnerId(session.getPlayer1Id());
    session.applyCardToBoard(unit, 2, 2, unit.createNewCardData(), null);
    unit.setActionPoints(2);
    unit.getActiveAbilityState().handSlotIndex = 4;
    unit.getActiveAbilityState().lockdown = 0;
    const card = session.createCardForIdentifier(51015);
    card.setOwnerId(unit.getOwnerId());
    const expected = SDK.UseActiveAbilityAction.getLegalTargetPositions(session, unit);
    let highlighted;
    const view = {
      _cardDirty: true,
      removeCardTiles: () => {},
      getSdkPlayer: () => session.getPlayer1(),
      getSelectedCardIndexInHand: () => 4,
      getTileLayer: () => ({ getMapFromBoardPositions: (positions) => positions }),
      showMergedTilesForAction: (positions) => { highlighted = positions; },
      getScene: () => null,
    };
    PlayerView.prototype.showCardTiles.call(view, card);
    expect(highlighted).to.deep.equal(expected);
    expect(highlighted.length).to.be.above(0);
    expect(highlighted.every((position) => session.getBoard().getHexDistance(unit.getPosition(), position) === 1)).to.equal(true);
  });
});
