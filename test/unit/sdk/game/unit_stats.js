const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const { expect } = require('chai');
const CONFIG = require('../../../../app/common/config');
const Logger = require('../../../../app/common/logger.coffee');
const SDK = require('../../../../app/sdk.coffee');
const UtilsSDK = require('../../../utils/utils_sdk');

Logger.enabled = false;

describe('unit stats', () => {
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

  const createUnit = () => gameSession.createCardForIdentifier(SDK.Cards.Neutral.GolemMetallurgist);

  it('provides walk, melee, distance, range, and level defaults', () => {
    const unit = createUnit();

    expect(unit.getMovementType()).to.equal('walk');
    expect(unit.getMovementDistance()).to.equal(CONFIG.SPEED_BASE);
    expect(unit.getAttackType()).to.equal('melee');
    expect(unit.getAttackRangeValue()).to.equal(CONFIG.REACH_MELEE);
    expect(unit.getLevel()).to.equal(1);
  });

  it('validates stat setters and preserves phase as a stat value', () => {
    const unit = createUnit();

    unit.setMovementType('phase');
    unit.setAttackType('area');
    unit.setLevel(3);
    expect(unit.getMovementType()).to.equal('phase');
    expect(unit.getAttackType()).to.equal('area');
    expect(unit.getLevel()).to.equal(3);

    unit.setMovementType('burrow');
    unit.setAttackType('splash');
    unit.setLevel(0);
    expect(unit.getMovementType()).to.equal('phase');
    expect(unit.getAttackType()).to.equal('area');
    expect(unit.getLevel()).to.equal(3);
  });

  it('derives fly and area types from existing traits and ranged from reach', () => {
    const flyingUnit = UtilsSDK.applyCardToBoard(
      { id: SDK.Cards.Neutral.SpottedDragonlark }, 0, 1, gameSession.getPlayer1Id());
    const blastUnit = UtilsSDK.applyCardToBoard(
      { id: SDK.Cards.Faction3.Pyromancer }, 2, 2, gameSession.getPlayer1Id());

    expect(flyingUnit.getMovementType()).to.equal('fly');
    expect(blastUnit.getAttackType()).to.equal('area');

    const rangedUnit = createUnit();
    rangedUnit.setReach(CONFIG.REACH_RANGED);
    expect(rangedUnit.getAttackType()).to.equal('ranged');
  });

  it('lets an explicitly configured attack type override inferred traits', () => {
    const unit = UtilsSDK.applyCardToBoard(
      { id: SDK.Cards.Faction3.Pyromancer }, 0, 1, gameSession.getPlayer1Id());

    expect(unit.getAttackType()).to.equal('area');
    unit.setAttackType('melee');
    expect(unit.getAttackType()).to.equal('melee');

    unit.setReach(CONFIG.REACH_RANGED);
    const reconstructed = gameSession.createCardForIdentifier(unit.getId());
    reconstructed.applyCardData(unit.createCloneCardData());
    expect(reconstructed.getAttackType()).to.equal('melee');
  });

  it('retains configured stats through card-data copying and reconstruction', () => {
    const unit = createUnit();
    unit.setSpeed(4);
    unit.setReach(3);
    unit.setMovementType('phase');
    unit.setAttackType('area');
    unit.setLevel(2);

    const cardData = unit.createCardData();
    expect(cardData.speed).to.equal(4);
    expect(cardData.reach).to.equal(3);
    expect(cardData.movementType).to.equal('phase');
    expect(cardData.attackType).to.equal('area');
    expect(cardData.level).to.equal(2);

    const cloneData = unit.createCloneCardData();
    const reconstructed = gameSession.createCardForIdentifier(unit.getId());
    reconstructed.applyCardData(cloneData);
    expect(reconstructed.getMovementDistance()).to.equal(4);
    expect(reconstructed.getAttackRangeValue()).to.equal(3);
    expect(reconstructed.getMovementType()).to.equal('phase');
    expect(reconstructed.getAttackType()).to.equal('area');
    expect(reconstructed.getLevel()).to.equal(2);
  });
});
