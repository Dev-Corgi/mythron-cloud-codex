const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const { expect } = require('chai');
const SDK = require('../../../../app/sdk.coffee');
const UtilsSDK = require('../../../utils/utils_sdk');

describe('move and attack turn slots', () => {
  let gameSession;
  let unit;

  beforeEach(() => {
    UtilsSDK.setupSession([{ id: SDK.Cards.Faction1.General }], [{ id: SDK.Cards.Faction2.General }], true, true);
    gameSession = SDK.GameSession.getInstance();
    gameSession.setRuleset('practice-sandbox-hex', 2);
    unit = gameSession.createCardForIdentifier(SDK.Cards.Neutral.PlanarScout);
    unit.setOwnerId(gameSession.getPlayer1().playerId);
    gameSession.applyCardToBoard(unit, 2, 2, unit.createNewCardData(), null);
  });

  afterEach(() => SDK.GameSession.reset());

  it('uses only move and attack counters to determine remaining actions', () => {
    unit.refreshExhaustion();
    expect(unit.getCanMove()).to.equal(true);
    expect(unit.getCanUseActiveAbility()).to.equal(true);

    unit.recordMove();
    expect(unit.getCanMove()).to.equal(false);
    expect(unit.getCanAttack()).to.equal(true);
    expect(unit.getHasActedThisTurn()).to.equal(true);

    unit.recordAttack();
    expect(unit.getCanAttack()).to.equal(false);
    expect(unit.getIsExhausted()).to.equal(true);
    expect(unit.getCanUseActiveAbility()).to.equal(false);
  });

  it('refreshes both slots at turn start and keeps exhaustion separate', () => {
    unit.recordMove();
    unit.recordAttack();
    unit.refreshExhaustion();
    expect([unit.getMovesMade(), unit.getAttacksMade(), unit.getExhausted()]).to.deep.equal([0, 0, false]);
  });

  it('allows an attack-less unit to use its ability when the attack slot is ready', () => {
    unit.refreshExhaustion();
    unit.atk = 0;
    expect(unit.getCanAttack()).to.equal(false);
    expect(unit.getCanUseActiveAbility()).to.equal(true);
  });

  it('leaves the move slot ready after a rejected move', () => {
    const general = gameSession.getGeneralForPlayer1();
    general.refreshExhaustion();
    const move = general.actionMove({ q: 99, r: 99 });
    gameSession.executeAction(move);
    expect(move.getIsValid()).to.equal(false);
    expect([general.getMovesMade(), general.getCanMove()]).to.deep.equal([0, true]);
  });

  it('leaves the move slot ready after a valid zero-distance move', () => {
    unit.refreshExhaustion();
    const move = unit.actionMove(unit.getPosition());
    UtilsSDK.executeActionWithoutValidation(move);
    expect(move.getIsValid(), move.getValidationMessage()).to.equal(true);
    expect([unit.getMovesMade(), unit.getCanMove()]).to.deep.equal([0, true]);
  });

  it('keeps ability-origin readiness checks in non-v2 rulesets', () => {
    gameSession.setRuleset('practice-sandbox-hex', 1);
    const general = gameSession.getGeneralForPlayer1();
    general.setSpeed(1);
    general.setReach(1);
    general.refreshExhaustion();
    general.recordMove();
    expect(general.getCanMove(true)).to.equal(false);
    general.recordAttack();
    expect(general.getCanAttack(true)).to.equal(false);
  });

  it('keeps an ordinary summon exhausted until its owner turn refresh', () => {
    const ownerId = gameSession.getPlayer1Id();
    const summoned = gameSession.createCardForIdentifier(SDK.Cards.Phobies.RazorMouth);
    summoned.setOwnerId(ownerId);
    gameSession.applyCardToBoard(summoned, 2, 2, summoned.createNewCardData(), null);
    expect(summoned.getIsActive()).to.equal(true);
    expect(summoned.getIsExhausted()).to.equal(true);
    expect(summoned.getCanUseActiveAbility()).to.equal(false);

    gameSession.executeAction(gameSession.actionEndTurn());
    expect(summoned.getIsExhausted()).to.equal(true);
    expect(summoned.getCanUseActiveAbility()).to.equal(false);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect([summoned.getIsExhausted(), summoned.getMovesMade(), summoned.getAttacksMade()])
      .to.deep.equal([false, 0, 0]);
  });

  it('lets Rock Pulverizer move then attack on its summon turn through Rush', () => {
    const rock = gameSession.createCardForIdentifier(SDK.Cards.Phobies.Cassowary);
    const ownerId = gameSession.getPlayer1Id();
    rock.setOwnerId(ownerId);
    gameSession.getGeneralForPlayer1().setPosition({ q: 0, r: 0 });
    gameSession.getGeneralForPlayer2().setPosition({ q: 4, r: 4 });
    const board = gameSession.getBoard();
    const summonPosition = board.getValidGeneralAdjacentSpawnPositions(rock)
      .find((position) => !board.getCardsAtPosition(position).length);
    const summon = new SDK.ApplyCardToBoardAction(gameSession, ownerId, summonPosition, rock.createNewCardData());
    summon.setCard(rock);
    const CardEligibility = require('../../../../app/sdk/rulesets/cardEligibility.coffee');
    const isAllowedRuntimeCard = CardEligibility.isAllowedRuntimeCard;
    const validateAction = gameSession.validateAction;
    CardEligibility.isAllowedRuntimeCard = () => true;
    gameSession.validateAction = () => {};
    try {
      UtilsSDK.executeActionWithoutValidation(summon);
    } finally {
      CardEligibility.isAllowedRuntimeCard = isAllowedRuntimeCard;
      gameSession.validateAction = validateAction;
    }
    const summonedRock = rock;
    expect(summon.getIsValidApplication(), `${summonPosition} ${summon.getValidationMessage()}`).to.equal(true);
    const movePosition = board.getHexPositionsInRange(summonPosition, 1)
      .find((position) => !board.positionsEqual(position, summonPosition) && !board.getUnitAtPosition(position));
    const enemyPosition = board.getHexPositionsInRange(movePosition, 1)
      .find((position) => !board.positionsEqual(position, movePosition) && !board.getUnitAtPosition(position));
    const enemy = gameSession.createCardForIdentifier(50003);
    enemy.setOwnerId(gameSession.getPlayer2Id());
    gameSession.applyCardToBoard(enemy, enemyPosition.q, enemyPosition.r, enemy.createNewCardData(), null);

    expect(summonedRock.hasActiveModifierClass(SDK.ModifierFirstBlood)).to.equal(true);
    expect(summonedRock.activeAbility).to.equal(null);
    expect(summonedRock.getAppliedToBoardByAction()).to.equal(summon);
    expect(summonedRock.getIsExhausted()).to.equal(false);
    const move = summonedRock.actionMove(movePosition);
    gameSession.executeAction(move);
    expect(move.getIsValid(), move.getValidationMessage()).to.equal(true);
    const attack = rock.actionAttack(enemy);
    gameSession.executeAction(attack);
    expect(attack.getIsValid(), attack.getValidationMessage()).to.equal(true);
    expect([summonedRock.getMovesMade(), summonedRock.getAttacksMade(), enemy.getDamage()]).to.deep.equal([1, 1, 425]);
  });

  it('keeps a stunned Rock Pulverizer unable to move or attack despite Rush', () => {
    const rock = gameSession.createCardForIdentifier(SDK.Cards.Phobies.Cassowary);
    rock.setOwnerId(gameSession.getPlayer1Id());
    gameSession.applyCardToBoard(rock, 3, 3, rock.createNewCardData(), null);
    gameSession.applyModifierContextObject(SDK.ModifierStunned.createContextObject(), rock);

    const move = rock.actionMove({ q: 4, r: 3 });
    gameSession.executeAction(move);
    expect(move.getIsValid()).to.equal(false);
    expect(rock.getPosition()).to.deep.equal({ q: 3, r: 3 });
    expect([rock.getMovesMade(), rock.getAttacksMade()]).to.deep.equal([0, 0]);
  });

  it('re-exhausts a summoned Rock Pulverizer when Rush is removed', () => {
    const rock = gameSession.createCardForIdentifier(SDK.Cards.Phobies.Cassowary);
    const ownerId = gameSession.getPlayer1Id();
    rock.setOwnerId(ownerId);
    gameSession.getGeneralForPlayer1().setPosition({ q: 0, r: 0 });
    gameSession.getGeneralForPlayer2().setPosition({ q: 4, r: 4 });
    const board = gameSession.getBoard();
    const summonPosition = board.getValidGeneralAdjacentSpawnPositions(rock)
      .find((position) => !board.getCardsAtPosition(position).length);
    const summon = new SDK.ApplyCardToBoardAction(gameSession, ownerId, summonPosition, rock.createNewCardData());
    summon.setCard(rock);
    const CardEligibility = require('../../../../app/sdk/rulesets/cardEligibility.coffee');
    const isAllowedRuntimeCard = CardEligibility.isAllowedRuntimeCard;
    const validateAction = gameSession.validateAction;
    CardEligibility.isAllowedRuntimeCard = () => true;
    gameSession.validateAction = () => {};
    try {
      UtilsSDK.executeActionWithoutValidation(summon);
    } finally {
      CardEligibility.isAllowedRuntimeCard = isAllowedRuntimeCard;
      gameSession.validateAction = validateAction;
    }

    expect(summon.getIsValidApplication()).to.equal(true);
    expect(rock.getIsExhausted()).to.equal(false);
    rock.recordMove();
    rock.recordAttack();
    gameSession.removeModifierFromCardByClass(SDK.ModifierFirstBlood, rock);
    expect(rock.getIsExhausted()).to.equal(true);
    expect(rock.getCanMove()).to.equal(false);
    expect(rock.getCanAttack()).to.equal(false);
  });
});
