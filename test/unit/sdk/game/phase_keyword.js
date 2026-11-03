const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const { expect } = require('chai');
const CONFIG = require('../../../../app/common/config');
const Logger = require('../../../../app/common/logger.coffee');
const SDK = require('../../../../app/sdk.coffee');
const UtilsSDK = require('../../../utils/utils_sdk');
const modifierStrings = require('../../../../app/localization/locales/en/modifiers.json');

Logger.enabled = false;

const PHASING_DEF = 'Can move over holes and Walls and through enemy units. Cannot stop on an occupied tile.';

// Keyword statics are resolved when a modifier module loads. Load fresh copies so they see the i18next.t
// stub that the card factories install on the server (it returns the locale key).
function loadKeywordModules() {
  const modules = ['modifierFlying', 'modifierPhasing'].map((name) =>
    require.resolve(`../../../../app/sdk/modifiers/${name}.coffee`));
  const saved = modules.map((m) => require.cache[m]);
  modules.forEach((m) => { delete require.cache[m]; });
  try {
    return { Flying: require(modules[0]), Phasing: require(modules[1]) };
  } finally {
    modules.forEach((m, i) => { require.cache[m] = saved[i]; });
  }
}

describe('phasing keyword', () => {
  let gameSession;

  beforeEach(() => {
    UtilsSDK.setupSession([
      { id: SDK.Cards.Faction1.General },
    ], [
      { id: SDK.Cards.Faction2.General },
    ], true, true);
    gameSession = SDK.GameSession.getInstance();
  });

  afterEach(() => {
    SDK.GameSession.reset();
  });

  const getUnit = () => gameSession.getGeneralForPlayer1();

  it('PHASE_V2: is active and derives phase movement in version 2', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    const unit = getUnit();
    const baseSpeed = unit.getSpeed();
    gameSession.applyModifierContextObject(SDK.ModifierPhasing.createContextObject(), unit);

    expect(unit.hasActiveModifierClass(SDK.ModifierPhasing)).to.equal(true);
    expect(unit.getMovementType()).to.equal('phase');
    expect(unit.getSpeed()).to.equal(baseSpeed);
    expect(unit.getMovementDistance()).to.equal(baseSpeed);
    expect(unit.hasActiveModifierClass(SDK.ModifierFlying)).to.equal(false);
  });

  it('PHASE_NON_V2: is inactive without the version 2 ruleset', () => {
    const unit = getUnit();
    const baseSpeed = unit.getSpeed();
    gameSession.applyModifierContextObject(SDK.ModifierPhasing.createContextObject(), unit);

    expect(unit.hasActiveModifierClass(SDK.ModifierPhasing)).to.equal(false);
    expect(unit.getSpeed()).to.equal(baseSpeed);

    gameSession.setRuleset('practice-sandbox-hex', 1);
    expect(new SDK.ModifierPhasing(gameSession).getIsAllowedToBeActiveForCache()).to.equal(false);
  });

  it('FACTORY: returns the class and round trips its context object', () => {
    const modifier = SDK.ModifierFactory.modifierForType('ModifierPhasing', gameSession);
    expect(modifier).to.be.instanceOf(SDK.ModifierPhasing);
    const contextObject = SDK.ModifierPhasing.createContextObject();
    expect(contextObject.type).to.equal('ModifierPhasing');
    expect(SDK.ModifierPhasing.type).to.equal('ModifierPhasing');
    expect(modifier.maxStacks).to.equal(1);
  });

  it('FLYING: Flying checks do not match Phasing and Flying units are unchanged', () => {
    expect(new SDK.ModifierPhasing(gameSession)).to.not.be.instanceOf(SDK.ModifierFlying);

    const flyer = UtilsSDK.applyCardToBoard({ id: SDK.Cards.Neutral.SpottedDragonlark }, 0, 1, gameSession.getPlayer1Id());
    expect(flyer.hasActiveModifierClass(SDK.ModifierFlying)).to.equal(true);
    expect(flyer.hasActiveModifierClass(SDK.ModifierPhasing)).to.equal(false);
    expect(flyer.getMovementType()).to.equal('fly');
  });

  it('KEYWORD: has name, definition, and a resolvable FX resource', () => {
    const { Flying, Phasing } = loadKeywordModules();
    expect(Phasing.isKeyworded).to.equal(true);
    expect(Phasing.modifierName).to.equal('modifiers.phasing_name');
    expect(Phasing.keywordDefinition).to.equal('modifiers.phasing_def');
    expect(modifierStrings.phasing_name).to.equal('Phasing');
    expect(modifierStrings.phasing_def).to.equal(PHASING_DEF);

    // Flying text and keyword keys are unchanged.
    expect(Flying.modifierName).to.equal('modifiers.flying_name');
    expect(Flying.keywordDefinition).to.equal('modifiers.flying_def');
    expect(modifierStrings.flying_name).to.equal('Flying');
    expect(modifierStrings.flying_def).to.equal('Move anywhere on the battlefield.');

    expect(new SDK.ModifierPhasing(gameSession).fxResource).to.deep.equal(['FX.Modifiers.ModifierPhasing']);
    const FX = require('../../../../app/data/fx.js');
    expect(FX.Modifiers.ModifierPhasing).to.be.an('object');
  });

  describe('fly and phase follow the movement distance stat', () => {
    const maxSteps = (unit) => Math.max(0, ...unit.getMovementRange().getValidPositions(gameSession.getBoard(), unit)
      .map((path) => path.length - 1));
    const place = (ruleset, version, modifierClass) => {
      gameSession.setRuleset(ruleset, version);
      const unit = getUnit();
      unit.setPosition({ q: 4, r: 2 });
      unit.setSpeed(2);
      gameSession.applyModifierContextObject(modifierClass.createContextObject(), unit);
      unit.getMovementRange().flushCachedState();
      return unit;
    };

    it('limits a version 2 Flying unit to its movement distance and shows that stat', () => {
      const unit = place('practice-sandbox-hex', 2, SDK.ModifierFlying);
      expect(unit.getMovementType()).to.equal('fly');
      expect(unit.getSpeed()).to.equal(2);
      expect(unit.getMovementDistance()).to.equal(2);
      expect(maxSteps(unit)).to.equal(2);
    });

    it('limits a version 2 Phasing unit to its movement distance', () => {
      const unit = place('practice-sandbox-hex', 2, SDK.ModifierPhasing);
      expect(unit.getMovementType()).to.equal('phase');
      expect(unit.getMovementDistance()).to.equal(2);
      expect(maxSteps(unit)).to.equal(2);
    });

    it('keeps Flying unlimited in version 1 but still reports the stat as the distance', () => {
      const unit = place('practice-sandbox-hex', 1, SDK.ModifierFlying);
      expect(unit.getSpeed()).to.equal(2 + CONFIG.SPEED_INFINITE);
      expect(maxSteps(unit)).to.be.above(2);
      expect(unit.getMovementDistance()).to.equal(2);
    });

    it('keeps Flying unlimited in legacy matches', () => {
      gameSession.setRuleset('legacy', 1);
      const unit = getUnit();
      gameSession.applyModifierContextObject(SDK.ModifierFlying.createContextObject(), unit);
      expect(unit.getSpeed()).to.equal(unit.getMovementDistance() + CONFIG.SPEED_INFINITE);
    });

    it('still lets a version 2 Flying unit cross terrain that blocks walkers within its distance', () => {
      const unit = place('practice-sandbox-hex', 2, SDK.ModifierFlying);
      const board = gameSession.getBoard();
      const wall = gameSession.createCardForIdentifier(SDK.Cards.Tile.Wall);
      wall.setPosition({ q: 5, r: 2 });
      wall.setIsPlayed(true);
      wall.setIsRemoved(false);
      board.addCard(wall);
      unit.getMovementRange().flushCachedState();
      const endpoints = unit.getMovementRange().getValidPositions(board, unit).map((path) => path[path.length - 1]);
      expect(endpoints.some((p) => p.q === 6 && p.r === 2), 'two steps past the Wall').to.equal(true);
    });
  });
});
