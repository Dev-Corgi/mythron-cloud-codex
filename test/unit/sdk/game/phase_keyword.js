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

const PHASING_DEF = 'Can move to any location on the battlefield, including through enemy units. Cannot stop on an occupied tile.';

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
    expect(unit.getSpeed()).to.equal(baseSpeed + CONFIG.SPEED_INFINITE);
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
});
