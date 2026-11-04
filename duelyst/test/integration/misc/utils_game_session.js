const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
require('coffeescript/register');

const _ = require('underscore');
const prettyjson = require('prettyjson');
const { expect } = require('chai');

const UtilsGameSession = require('../../../app/common/utils/utils_game_session.coffee');
const SDK = require('../../../app/sdk.coffee');
const UtilsSDK = require('../../utils/utils_sdk');
const EVENTS = require('../../../app/common/event_types');
const StarterAI = require('../../../server/ai/starter_ai');

const createRulesetFixture = (rulesetId, rulesetVersion, general1Id = SDK.Cards.Faction1.General, general2Id = SDK.Cards.Faction4.AltGeneral) => {
  const gameSession = SDK.GameSession.create();
  gameSession.setRuleset(rulesetId, rulesetVersion);
  const roster = [10979, 19052, 19038, 10205, 10001, 19051, 10954, 10206];
  const practiceDeck1 = [{ id: general1Id }, ...roster.map((id) => ({ id }))];
  const practiceDeck2 = [{ id: general2Id }, ...roster.map((id) => ({ id }))];
  SDK.GameSetup.setupNewSession(
    gameSession,
    {
      userId: 'ruleset-player-1',
      name: 'Ruleset Player 1',
      deck: rulesetId === 'legacy'
        ? SDK.FactionFactory.starterDeckForFactionLevel(SDK.Factions.Faction1, 30)
        : practiceDeck1,
    },
    {
      userId: 'ruleset-player-2',
      name: 'Ruleset Player 2',
      deck: rulesetId === 'legacy'
        ? SDK.FactionFactory.starterDeckForFactionLevel(SDK.Factions.Faction2, 30)
        : practiceDeck2,
    },
    true,
  );
  return gameSession;
};

const getMethronPoints = (gameSession) => gameSession.getBoard().getTiles(true)
  .filter((tile) => tile.getId() === SDK.Cards.Tile.MethronPoint);

const setMethronControlCounts = (gameSession, player1Count, player2Count) => {
  const points = getMethronPoints(gameSession);
  points.slice(0, player1Count).forEach((point) => point.setOwnerId(gameSession.getPlayer1Id()));
  points.slice(player1Count, player1Count + player2Count)
    .forEach((point) => point.setOwnerId(gameSession.getPlayer2Id()));
  return points;
};

const executeEndTurnWithoutValidation = (gameSession) => {
  gameSession.setStatus(SDK.GameStatus.active);
  gameSession.setIsRunningAsAuthoritative(true);
  const validators = gameSession.getValidators();
  gameSession.setValidators([]);
  try {
    gameSession.executeAction(gameSession.actionEndTurn());
  } finally {
    gameSession.setValidators(validators);
  }
};

describe('UtilsGameSession', () => {
  it('scales General Bloodbound Spell effects through ability resolution in v2', () => {
    const placeMinion = (session, ownerId, position) => {
      const minion = session.createCardForIdentifier(SDK.Cards.Neutral.GolemMetallurgist);
      minion.setOwnerId(ownerId);
      session.applyCardToBoard(minion, position.q, position.r);
      return minion;
    };
    const resolveAbility = (session, general, effectId, targetPosition) => {
      const player = general.getOwner();
      general.setSignatureCardData({ id: effectId });
      general.getActiveAbilityState().lockdown = 0;
      general.getActiveAbilityState().cooldown = 0;
      general.refreshExhaustion();
      const action = player.actionUseActiveAbility(general.getIndex(), targetPosition);
      const validators = session.getValidators();
      session.setValidators([]);
      try {
        session.executeAction(action);
      } finally {
        session.setValidators(validators);
      }
      return action;
    };

    const debuffSession = createRulesetFixture('practice-sandbox-hex', 2, SDK.Cards.Faction3.ThirdGeneral, SDK.Cards.Faction4.AltGeneral);
    debuffSession.setIsRunningAsAuthoritative(true);
    debuffSession.setStatus(SDK.GameStatus.active);
    debuffSession.setValidators([]);
    const debuffGeneral = debuffSession.getGeneralForPlayer1();
    const debuffTarget = placeMinion(debuffSession, debuffSession.getPlayer2Id(), { q: -1, r: 3 });
    const debuffTargetAttack = debuffTarget.getATK();
    expect(debuffTarget.getIsActive()).to.equal(true);
    expect(debuffTarget.getOwnerId()).to.equal(debuffSession.getPlayer2Id());
    const debuffAction = resolveAbility(debuffSession, debuffGeneral, SDK.Cards.Spell.DebuffBBS, debuffTarget.getPosition());
    expect(debuffAction.getIsGeneralAbility()).to.equal(true);
    expect(SDK.Cards.getNonPrismaticCardId(debuffAction.getCard().getId())).to.equal(SDK.Cards.Spell.DebuffBBS);
    expect(debuffTarget.getActiveModifiers().some((modifier) => modifier.getAttributeBuffs() && modifier.getAttributeBuffs().atk === -200)).to.equal(true);
    expect(debuffTarget.getATK()).to.equal(Math.max(0, debuffTargetAttack - 200));

    const sacrificeSession = createRulesetFixture('practice-sandbox-hex', 2);
    sacrificeSession.setIsRunningAsAuthoritative(true);
    sacrificeSession.setStatus(SDK.GameStatus.active);
    sacrificeSession.setValidators([]);
    const sacrificeGeneral = sacrificeSession.getGeneralForPlayer1();
    const generalHealth = sacrificeGeneral.getHP();
    const sacrificeTarget = placeMinion(sacrificeSession, sacrificeSession.getPlayer1Id(), { q: -1, r: 3 });
    resolveAbility(sacrificeSession, sacrificeGeneral, SDK.Cards.Spell.SacrificeBBS, sacrificeTarget.getPosition());
    expect(sacrificeGeneral.getHP()).to.equal(generalHealth - 200);

    const legacy = createRulesetFixture('practice-sandbox-hex', 1);
    const legacyDebuff = legacy.createCardForIdentifier(SDK.Cards.Spell.DebuffBBS);
    const legacySacrifice = legacy.createCardForIdentifier(SDK.Cards.Spell.SacrificeBBS);
    const generalAbility = { getIsGeneralAbility: () => true };
    expect(legacyDebuff.getAppliedTargetModifiersContextObjects(generalAbility)[0].attributeBuffs.atk).to.equal(-2);
    expect(legacySacrifice.getGeneralDamageAmount(generalAbility)).to.equal(2);
  });

  describe('ruleset persistence', () => {
    it('generates, validates, and restores a legal version 2 Practice AI action at each representative difficulty', () => {
      for (const difficulty of [0, 0.1, 0.2, 0.5, 1]) {
        const session = createRulesetFixture('practice-sandbox-hex', 2);
        const playerId = session.getPlayer1Id();
        session.getPlayer1().setHasStartingHand(true);
        session.getPlayer2().setHasStartingHand(true);
        session.setStatus(SDK.GameStatus.active);
        session.getPlayer1().setStartingMana(0);
        const initialSnapshot = JSON.parse(session.serializeToJSON(session));
        const initialCurrentPlayerId = session.getCurrentPlayerId();
        const ai = new StarterAI(session, playerId, difficulty);
        const action = ai.nextAction();

        expect(action, `difficulty ${difficulty}`).not.to.equal(null);
        session.validateAction(action, false);
        expect(action.getIsValid(), `difficulty ${difficulty}`).to.equal(true);
        const serializedAction = JSON.parse(session.serializeToJSON(action));

        const replay = SDK.GameSession.create();
        replay.deserializeSessionFromFirebase(initialSnapshot);
        replay.getPlayer1().setIsCurrentPlayer(initialCurrentPlayerId === replay.getPlayer1Id());
        replay.getPlayer2().setIsCurrentPlayer(initialCurrentPlayerId === replay.getPlayer2Id());
        replay.getCurrentTurn().setPlayerId(initialCurrentPlayerId);
        expect(replay.getCurrentPlayerId(), `initial replay difficulty ${difficulty}`).to.equal(initialCurrentPlayerId);
        replay.setIsRunningAsAuthoritative(true);
        const replayAction = replay.deserializeActionFromFirebase(serializedAction);
        replay.validateAction(replayAction, false);
        expect(replayAction.getIsValid(), `replay difficulty ${difficulty}: ${replayAction.getValidationMessage()}`).to.equal(true);

        expect(replayAction.getType(), `replay difficulty ${difficulty}`).to.equal(action.getType());
        session.terminate();
        replay.terminate();
      }
    });

    it('round trips a supported ruleset and defaults historical snapshots to legacy', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 1);
      const serialized = JSON.parse(session.serializeToJSON(session));
      const restored = SDK.GameSession.create();
      restored.deserializeSessionFromFirebase(serialized);
      expect(restored.getRulesetId()).to.equal('practice-sandbox-hex');
      expect(restored.getRulesetVersion()).to.equal(1);
      expect(restored.getGeneralForPlayer1().getPosition()).to.deep.equal({ q: -1, r: 2 });
      expect(restored.getGeneralForPlayer2().getPosition()).to.deep.equal({ q: 7, r: 2 });
      expect(restored.getBoard().getTilePositions()).to.have.length(43);

      const replay = SDK.GameSession.create();
      SDK.GameSetup.setupNewSessionFromExistingSessionData(replay, JSON.parse(JSON.stringify(serialized)));
      expect(replay.getRulesetId()).to.equal('practice-sandbox-hex');
      expect(replay.getRulesetVersion()).to.equal(1);
      expect(replay.getGeneralForPlayer1().getPosition()).to.deep.equal({ q: -1, r: 2 });
      expect(replay.getGeneralForPlayer2().getPosition()).to.deep.equal({ q: 7, r: 2 });

      const historicalSession = createRulesetFixture('legacy', 1);
      const historicalData = JSON.parse(historicalSession.serializeToJSON(historicalSession));
      delete historicalData.rulesetId;
      delete historicalData.rulesetVersion;
      const historical = SDK.GameSession.create();
      historical.deserializeSessionFromFirebase(historicalData);
      expect(historical.getRulesetId()).to.equal('legacy');
      expect(historical.getRulesetVersion()).to.equal(1);

      const historicalReplay = SDK.GameSession.create();
      SDK.GameSetup.setupNewSessionFromExistingSessionData(historicalReplay, historicalData);
      expect(historicalReplay.getRulesetId()).to.equal('legacy');
      expect(historicalReplay.getRulesetVersion()).to.equal(1);
      expect(historicalReplay.getGeneralForPlayer1().getPosition()).to.deep.equal({ x: 0, y: 2 });
      expect(historicalReplay.getGeneralForPlayer2().getPosition()).to.deep.equal({ x: 8, y: 2 });
    });

    it('round trips replacement ruleset version 2 in sessions and replays', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      const wallPositions = SDK.HexTopology.version2WallPositions;
      const initialWalls = session.getBoard().getTiles().filter((tile) => tile.getId() === SDK.Cards.Tile.Wall);
      expect(initialWalls).to.have.length(9);
      expect(initialWalls.every((wall) => wall.getHP() === 2000 && wall.isOwnedByGameSession())).to.equal(true);
      const initialSnapshot = JSON.parse(session.serializeToJSON(session));
      const executeWithoutValidation = (targetSession, action) => {
        const validators = targetSession.getValidators();
        targetSession.setValidators([]);
        try {
          targetSession.executeAction(action);
        } finally {
          targetSession.setValidators(validators);
        }
      };
      const damageAction = new SDK.DamageAction(session);
      damageAction.setTarget(initialWalls[0]);
      damageAction.setDamageAmount(3);
      session.setIsRunningAsAuthoritative(true);
      executeWithoutValidation(session, damageAction);
      expect(initialWalls[0].getHP()).to.equal(1997);
      const serializedDamageAction = JSON.parse(session.serializeToJSON(damageAction));
      const destroyedPosition = initialWalls[1].getPosition();
      session.removeCardFromBoard(initialWalls[1], destroyedPosition.q, destroyedPosition.r);
      const serialized = JSON.parse(session.serializeToJSON(session));

      const damageReplay = SDK.GameSession.create();
      SDK.GameSetup.setupNewSessionFromExistingSessionData(damageReplay, initialSnapshot);
      damageReplay.setIsRunningAsAuthoritative(true);
      const replayedDamageAction = damageReplay.deserializeActionFromFirebase(serializedDamageAction);
      expect(replayedDamageAction.getTarget()).not.to.equal(null);
      expect(replayedDamageAction.getTarget().getId()).to.equal(SDK.Cards.Tile.Wall);
      executeWithoutValidation(damageReplay, replayedDamageAction);
      const replayedWall = damageReplay.getBoard().getTileAtPosition(wallPositions[0]);
      expect(replayedWall.getHP()).to.equal(1997);

      const restored = SDK.GameSession.create();
      restored.deserializeSessionFromFirebase(serialized);
      expect(restored.getRulesetId()).to.equal('practice-sandbox-hex');
      expect(restored.getRulesetVersion()).to.equal(2);
      expect(restored.getBoard().getTilePositions()).to.have.length(41);
      expect(restored.getBoard().hasTileAtPosition(SDK.HexTopology.renderedToAxial(2, 0))).to.equal(false);
      expect(restored.getGeneralForPlayer1().getMaxHP()).to.equal(6000);
      expect(restored.getGeneralForPlayer1().getATK()).to.equal(200);
      expect(restored.getGeneralForPlayer2().getMaxHP()).to.equal(6000);
      expect(restored.getGeneralForPlayer2().getATK()).to.equal(200);
      expect(restored.getGeneralForPlayer1().getPosition()).to.deep.equal({ q: -2, r: 4 });
      expect(restored.getGeneralForPlayer2().getPosition()).to.deep.equal({ q: 8, r: 0 });
      const restoredWalls = restored.getBoard().getTiles().filter((tile) => tile.getId() === SDK.Cards.Tile.Wall);
      expect(restoredWalls).to.have.length(8);
      expect(restoredWalls.find((wall) => wall.getPosition().q === wallPositions[0].q && wall.getPosition().r === wallPositions[0].r).getHP()).to.equal(1997);
      expect(restored.getBoard().getTileAtPosition(destroyedPosition) == null).to.equal(true);
      expect(restored.getBoard().hasTileAtPosition(destroyedPosition)).to.equal(true);

      const replay = SDK.GameSession.create();
      SDK.GameSetup.setupNewSessionFromExistingSessionData(replay, serialized);
      expect(replay.getRulesetId()).to.equal('practice-sandbox-hex');
      expect(replay.getRulesetVersion()).to.equal(2);
      expect(replay.getBoard().getTilePositions()).to.have.length(41);
      expect(replay.getBoard().hasTileAtPosition(SDK.HexTopology.renderedToAxial(6, 4))).to.equal(false);
      expect(replay.getGeneralForPlayer1().getMaxHP()).to.equal(6000);
      expect(replay.getGeneralForPlayer1().getATK()).to.equal(200);
      expect(replay.getGeneralForPlayer2().getMaxHP()).to.equal(6000);
      expect(replay.getGeneralForPlayer2().getATK()).to.equal(200);
      expect(replay.getGeneralForPlayer1().getPosition()).to.deep.equal({ q: -2, r: 4 });
      expect(replay.getGeneralForPlayer2().getPosition()).to.deep.equal({ q: 8, r: 0 });
      expect(replay.getBoard().getTiles().filter((tile) => tile.getId() === SDK.Cards.Tile.Wall)).to.have.length(9);
    });

    it('captures Methron Points with live occupancy checks and retains ownership in snapshots and replay', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      const initialSnapshot = JSON.parse(session.serializeToJSON(session));
      const pointPosition = SDK.HexTopology.renderedToAxial(3, 0);
      const point = session.getBoard().getTileAtPosition(pointPosition, true);
      expect(point.getId()).to.equal(SDK.Cards.Tile.MethronPoint);
      expect(point.isOwnedByGameSession()).to.equal(true);

      const executeWithoutValidation = (targetSession, action) => {
        const validators = targetSession.getValidators();
        targetSession.setValidators([]);
        try {
          targetSession.executeAction(action);
        } finally {
          targetSession.setValidators(validators);
        }
      };
      const executeAuthorizedCaptureForTest = (targetSession, action) => {
        targetSession._private.authorizedMethronPointCaptureActions.push(action);
        executeWithoutValidation(targetSession, action);
      };
      session.setIsRunningAsAuthoritative(true);
      const capture = new SDK.CaptureMethronPointAction(session);
      capture.setTarget(point);
      executeAuthorizedCaptureForTest(session, capture);
      expect(point.isOwnedByGameSession()).to.equal(true);
      expect(session.consumeMethronPointCaptureAuthorization(capture)).to.equal(false);

      const general1 = session.getGeneralForPlayer1();
      general1.setPosition(pointPosition);
      session.syncState();
      session.setStatus(SDK.GameStatus.active);
      session.setIsRunningAsAuthoritative(true);
      const sourceValidators = session.getValidators();
      session.setValidators([]);
      try {
        session.executeAction(session.actionEndTurn());
      } finally {
        session.setValidators(sourceValidators);
      }
      expect(point.getOwnerId()).to.equal(session.getPlayer1Id());

      const serialized = JSON.parse(session.serializeToJSON(session));
      const restored = SDK.GameSession.create();
      restored.deserializeSessionFromFirebase(serialized);
      const restoredPoint = restored.getBoard().getTileAtPosition(pointPosition, true);
      expect(restoredPoint.getOwnerId()).to.equal(session.getPlayer1Id());
      const replay = SDK.GameSession.create();
      SDK.GameSetup.setupNewSessionFromExistingSessionData(replay, JSON.parse(JSON.stringify(initialSnapshot)));
      expect(replay.getRulesetId()).to.equal('practice-sandbox-hex');
      expect(replay.getRulesetVersion()).to.equal(2);
      expect(replay.getIsPracticeSandboxV2()).to.equal(true);
      expect(replay.getGeneralForPlayer1().getMaxHP()).to.equal(6000);
      expect(replay.getGeneralForPlayer1().getATK()).to.equal(200);
      replay.setIsRunningAsAuthoritative(true);
      replay.getGeneralForPlayer1().setPosition(pointPosition);
      replay.syncState();
      replay.setStatus(SDK.GameStatus.active);
      replay.setIsRunningAsAuthoritative(true);
      const replayValidators = replay.getValidators();
      replay.setValidators([]);
      try {
        replay.executeAction(replay.actionEndTurn());
      } finally {
        replay.setValidators(replayValidators);
      }
      expect(replay.getBoard().getTileAtPosition(pointPosition, true).getOwnerId()).to.equal(session.getPlayer1Id());

      const serializedCapture = new SDK.CaptureMethronPointAction(session);
      serializedCapture.setTarget(point);
      serializedCapture.setIsAutomatic(true);
      const serializedCaptureData = JSON.parse(session.serializeToJSON(serializedCapture));
      const replayCapture = replay.deserializeActionFromFirebase(serializedCaptureData);
      expect(replayCapture.getType()).to.equal(SDK.CaptureMethronPointAction.type);
      expect(replayCapture.getTarget()).to.equal(replay.getBoard().getTileAtPosition(pointPosition, true));
      replay.getGeneralForPlayer1().setPosition(SDK.HexTopology.renderedToAxial(2, 0));
      replay.getGeneralForPlayer2().setPosition(pointPosition);
      replay.syncState();
      executeAuthorizedCaptureForTest(replay, replayCapture);
      expect(replay.getBoard().getTileAtPosition(pointPosition, true).getOwnerId()).to.equal(session.getPlayer2Id());

      general1.setPosition(SDK.HexTopology.renderedToAxial(2, 0));
      session.syncState();
      const captureWhileEmpty = new SDK.CaptureMethronPointAction(session);
      captureWhileEmpty.setTarget(point);
      executeAuthorizedCaptureForTest(session, captureWhileEmpty);
      expect(point.getOwnerId()).to.equal(session.getPlayer1Id());

      const emptyOwnedSnapshot = JSON.parse(session.serializeToJSON(session));
      const emptyOwnedRestore = SDK.GameSession.create();
      emptyOwnedRestore.deserializeSessionFromFirebase(emptyOwnedSnapshot);
      const emptyOwnedRestoredPoint = emptyOwnedRestore.getBoard().getTileAtPosition(pointPosition, true);
      expect(emptyOwnedRestoredPoint.getOccupant()).to.equal(null);
      expect(emptyOwnedRestoredPoint.getOwnerId()).to.equal(session.getPlayer1Id());

      const general2 = session.getGeneralForPlayer2();
      general1.setPosition(SDK.HexTopology.renderedToAxial(2, 0));
      general2.setPosition(pointPosition);
      session.syncState();
      const capturePlayer2 = new SDK.CaptureMethronPointAction(session);
      capturePlayer2.setTarget(point);
      executeAuthorizedCaptureForTest(session, capturePlayer2);
      expect(point.getOwnerId()).to.equal(session.getPlayer2Id());
      expect(point.getDepleted()).to.equal(false);
      expect(point.getIsRemoved()).to.equal(false);
    });

    it('deals configured damage per control-count difference to the disadvantaged General at both turn ends', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      const controlledPoints = setMethronControlCounts(session, 3, 1);
      expect(controlledPoints.every((point) => point.getOccupant() == null)).to.equal(true);
      const general1 = session.getGeneralForPlayer1();
      const general2 = session.getGeneralForPlayer2();
      const general1Hp = general1.getHP();
      const general2Hp = general2.getHP();
      const player1 = session.getPlayer1();
      const player1MaximumMana = player1.getMaximumMana();
      player1.setReserveMana(5);

      executeEndTurnWithoutValidation(session);
      expect(general1.getHP()).to.equal(general1Hp);
      expect(general2.getHP()).to.equal(general2Hp - 400);
      expect(player1.getReserveMana()).to.equal(2);
      expect(player1.getMaximumMana()).to.equal(player1MaximumMana + 3);
      expect(session.getCurrentPlayer().getPlayerId()).to.equal(session.getPlayer2Id());

      executeEndTurnWithoutValidation(session);
      expect(general1.getHP()).to.equal(general1Hp);
      expect(general2.getHP()).to.equal(general2Hp - 800);

      const reverseControl = createRulesetFixture('practice-sandbox-hex', 2);
      setMethronControlCounts(reverseControl, 1, 3);
      const reverseGeneral1Hp = reverseControl.getGeneralForPlayer1().getHP();
      const reverseGeneral2Hp = reverseControl.getGeneralForPlayer2().getHP();
      executeEndTurnWithoutValidation(reverseControl);
      expect(reverseControl.getGeneralForPlayer1().getHP()).to.equal(reverseGeneral1Hp - 400);
      expect(reverseControl.getGeneralForPlayer2().getHP()).to.equal(reverseGeneral2Hp);

      const equalControl = createRulesetFixture('practice-sandbox-hex', 2);
      setMethronControlCounts(equalControl, 2, 2);
      const equalGeneral1Hp = equalControl.getGeneralForPlayer1().getHP();
      const equalGeneral2Hp = equalControl.getGeneralForPlayer2().getHP();
      executeEndTurnWithoutValidation(equalControl);
      expect(equalControl.getGeneralForPlayer1().getHP()).to.equal(equalGeneral1Hp);
      expect(equalControl.getGeneralForPlayer2().getHP()).to.equal(equalGeneral2Hp);
      expect(equalControl.getActions().some((action) => action instanceof SDK.DamageAction
        && action.getTarget() && action.getTarget().getIsGeneral())).to.equal(false);

      const maximumControl = createRulesetFixture('practice-sandbox-hex', 2);
      setMethronControlCounts(maximumControl, 5, 0);
      const disadvantagedGeneral = maximumControl.getGeneralForPlayer2();
      const advantagedGeneralHp = maximumControl.getGeneralForPlayer1().getHP();
      const disadvantagedGeneralHp = disadvantagedGeneral.getHP();
      executeEndTurnWithoutValidation(maximumControl);
      expect(maximumControl.getGeneralForPlayer1().getHP()).to.equal(advantagedGeneralHp);
      expect(disadvantagedGeneral.getHP()).to.equal(disadvantagedGeneralHp - 1000);
    });

    it('counts a point captured during the same turn-end before applying deficit damage', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      const points = setMethronControlCounts(session, 2, 2);
      const neutralPoint = points[4];
      const general1 = session.getGeneralForPlayer1();
      const general2 = session.getGeneralForPlayer2();
      const general1Hp = general1.getHP();
      const general2Hp = general2.getHP();
      general1.setPosition(neutralPoint.getPosition());
      session.syncState();

      executeEndTurnWithoutValidation(session);

      expect(neutralPoint.getOwnerId()).to.equal(session.getPlayer1Id());
      expect(general1.getHP()).to.equal(general1Hp);
      expect(general2.getHP()).to.equal(general2Hp - 200);
      const resolvedControlAction = session.getActions().find((action) =>
        action instanceof SDK.ResolveMethronPointControlDamageAction);
      expect(resolvedControlAction).to.exist;
      expect(resolvedControlAction.getIndex()).to.be.greaterThan(
        session.getActions().find((action) => action instanceof SDK.CaptureMethronPointAction).getIndex(),
      );
      expect(resolvedControlAction.getIndex()).to.be.lessThan(
        session.getActions().find((action) => action instanceof SDK.StartTurnAction).getIndex(),
      );
    });

    it('replays and restores deficit damage and uses normal lethal General handling', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      const points = setMethronControlCounts(session, 3, 1);
      session.syncState();
      const general2 = session.getGeneralForPlayer2();
      const startingHp = general2.getHP();
      const initialSnapshot = JSON.parse(session.serializeToJSON(session));
      executeEndTurnWithoutValidation(session);
      expect(general2.getHP()).to.equal(startingHp - 400);

      const restored = SDK.GameSession.create();
      restored.deserializeSessionFromFirebase(JSON.parse(session.serializeToJSON(session)));
      expect(restored.getGeneralForPlayer2().getHP()).to.equal(startingHp - 400);
      expect(getMethronPoints(restored).map((point) => point.getOwnerId()))
        .to.deep.equal(points.map((point) => point.getOwnerId()));
      const serializedResolver = JSON.parse(session.serializeToJSON(session.getActions().find((action) =>
        action instanceof SDK.ResolveMethronPointControlDamageAction)));
      const replayResolver = restored.deserializeActionFromFirebase(serializedResolver);
      expect(replayResolver).to.be.instanceOf(SDK.ResolveMethronPointControlDamageAction);

      const replay = SDK.GameSession.create();
      replay.deserializeSessionFromFirebase(initialSnapshot);
      expect(replay.getRulesetId()).to.equal('practice-sandbox-hex');
      expect(replay.getRulesetVersion()).to.equal(2);
      replay.syncState();
      expect(getMethronPoints(replay).filter((point) => point.getOwnerId() === replay.getPlayer1Id())).to.have.length(3);
      expect(getMethronPoints(replay).filter((point) => point.getOwnerId() === replay.getPlayer2Id())).to.have.length(1);
      executeEndTurnWithoutValidation(replay);
      expect(replay.getGeneralForPlayer2().getHP()).to.equal(startingHp - 400);

      const lethal = createRulesetFixture('practice-sandbox-hex', 2);
      setMethronControlCounts(lethal, 5, 0);
      const lethalGeneral = lethal.getGeneralForPlayer2();
      lethalGeneral.setDamage(lethalGeneral.getMaxHP() - 9);
      executeEndTurnWithoutValidation(lethal);
      expect(lethalGeneral.getHP()).to.be.at.most(0);
      expect(lethal.isOver()).to.equal(true);
    });

    it('does not apply Methron deficit damage outside replacement rules version 2', () => {
      for (const [rulesetId, rulesetVersion] of [['practice-sandbox-hex', 1], ['legacy', 1]]) {
        const session = createRulesetFixture(rulesetId, rulesetVersion);
        const general1Hp = session.getGeneralForPlayer1().getHP();
        const general2Hp = session.getGeneralForPlayer2().getHP();
        executeEndTurnWithoutValidation(session);
        expect(session.getGeneralForPlayer1().getHP(), `${rulesetId} v${rulesetVersion} player 1`).to.equal(general1Hp);
        expect(session.getGeneralForPlayer2().getHP(), `${rulesetId} v${rulesetVersion} player 2`).to.equal(general2Hp);
      }
    });

    it('requires one-shot end-turn authorization for the replayable control resolver', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      setMethronControlCounts(session, 5, 0);
      const general2 = session.getGeneralForPlayer2();
      const startingHp = general2.getHP();
      session.setStatus(SDK.GameStatus.active);
      session.setIsRunningAsAuthoritative(true);

      const forged = new SDK.ResolveMethronPointControlDamageAction(session);
      forged.setIsAutomatic(true);
      forged.setOwnerId(session.getPlayer1Id());
      expect(session.submitExplicitAction(forged)).to.equal(true);
      expect(general2.getHP()).to.equal(startingHp);

      const authorized = new SDK.ResolveMethronPointControlDamageAction(session);
      session._private.authorizedMethronPointControlDamageActions.push(authorized);
      const validators = session.getValidators();
      session.setValidators([]);
      try {
        session.executeAction(authorized);
      } finally {
        session.setValidators(validators);
      }
      expect(general2.getHP()).to.equal(startingHp - 1000);
      expect(session.consumeMethronPointControlDamageAuthorization(authorized)).to.equal(false);
    });

    it('captures a point for the surviving occupant at either player’s end turn', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      const pointPosition = SDK.HexTopology.renderedToAxial(3, 0);
      const point = session.getBoard().getTileAtPosition(pointPosition, true);
      const general1 = session.getGeneralForPlayer1();
      general1.setPosition(pointPosition);
      session.syncState();
      session.setStatus(SDK.GameStatus.active);
      session.setIsRunningAsAuthoritative(true);
      let observedCapturePlayerId = null;
      let observedStartTurnCountAtCapture = null;
      let startTurnCount = 0;
      const onAfterAction = (event) => {
        if (event.action instanceof SDK.CaptureMethronPointAction) {
          observedCapturePlayerId = session.getCurrentPlayer().getPlayerId();
          observedStartTurnCountAtCapture = startTurnCount;
        }
      };
      const onStartTurn = () => { startTurnCount += 1; };
      session.getEventBus().on(EVENTS.after_action, onAfterAction);
      session.getEventBus().on(EVENTS.start_turn, onStartTurn);

      const executeWithoutValidation = (action) => {
        const validators = session.getValidators();
        session.setValidators([]);
        try {
          session.executeAction(action);
        } finally {
          session.setValidators(validators);
        }
      };
      try {
        const endTurnAction = session.actionEndTurn();
        const wasSubmitted = session.submitExplicitAction(endTurnAction);
        expect(wasSubmitted, `valid=${endTurnAction.getIsValid()} validator=${endTurnAction.getValidatorType()} message=${endTurnAction.getValidationMessage()}`).to.equal(true);
      } finally {
        session.getEventBus().off(EVENTS.after_action, onAfterAction);
        session.getEventBus().off(EVENTS.start_turn, onStartTurn);
      }
      expect(point.getOwnerId()).to.equal(session.getPlayer1Id());
      expect(observedCapturePlayerId).to.equal(session.getPlayer1Id());
      expect(observedStartTurnCountAtCapture).to.equal(0);
      expect(startTurnCount).to.be.greaterThan(0);
      expect(session.getCurrentPlayer().getPlayerId()).to.equal(session.getPlayer2Id());

      const general2 = session.getGeneralForPlayer2();
      general1.setPosition(SDK.HexTopology.renderedToAxial(2, 0));
      general2.setPosition(pointPosition);
      session.syncState();
      executeWithoutValidation(session.actionEndTurn());
      expect(point.getOwnerId()).to.equal(session.getPlayer2Id());
    });

    it('captures a point occupied by a regular Unit at end turn', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      const pointPosition = SDK.HexTopology.renderedToAxial(3, 0);
      const point = session.getBoard().getTileAtPosition(pointPosition, true);
      const general = session.getGeneralForPlayer1();
      general.setPosition(SDK.HexTopology.renderedToAxial(2, 0));
      const unit = session.getExistingCardFromIndexOrCreateCardFromData({ id: 10979 });
      unit.setOwner(session.getPlayer1());
      session.applyCardToBoard(unit, pointPosition.q, pointPosition.r);
      session.syncState();
      session.setStatus(SDK.GameStatus.active);
      session.setIsRunningAsAuthoritative(true);
      const validators = session.getValidators();
      session.setValidators([]);
      try {
        session.executeAction(session.actionEndTurn());
      } finally {
        session.setValidators(validators);
      }
      expect(point.getOwnerId()).to.equal(session.getPlayer1Id());
    });

    it('captures two occupied points independently during one end turn', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      const firstPosition = SDK.HexTopology.renderedToAxial(3, 0);
      const secondPosition = SDK.HexTopology.renderedToAxial(5, 0);
      const firstPoint = session.getBoard().getTileAtPosition(firstPosition, true);
      const secondPoint = session.getBoard().getTileAtPosition(secondPosition, true);
      session.getGeneralForPlayer1().setPosition(firstPosition);
      const general2 = session.getGeneralForPlayer2();
      general2.setPosition(secondPosition);
      session.syncState();
      session.setStatus(SDK.GameStatus.active);
      session.setIsRunningAsAuthoritative(true);
      const validators = session.getValidators();
      session.setValidators([]);
      try {
        session.executeAction(session.actionEndTurn());
      } finally {
        session.setValidators(validators);
      }
      expect(firstPoint.getOwnerId()).to.equal(session.getPlayer1Id());
      expect(secondPoint.getOwnerId()).to.equal(session.getPlayer2Id());
    });

    it('does not capture a point when its occupant was removed before capture resolves', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      const pointPosition = SDK.HexTopology.renderedToAxial(3, 0);
      const point = session.getBoard().getTileAtPosition(pointPosition, true);
      const general = session.getGeneralForPlayer1();
      general.setPosition(SDK.HexTopology.renderedToAxial(2, 0));
      const unit = session.getExistingCardFromIndexOrCreateCardFromData({ id: 10979 });
      unit.setOwner(session.getPlayer1());
      session.applyCardToBoard(unit, pointPosition.q, pointPosition.r);
      unit.setIsRemoved(true);
      session.syncState();

      const capture = new SDK.CaptureMethronPointAction(session);
      capture.setTarget(point);
      session._private.authorizedMethronPointCaptureActions.push(capture);
      const validators = session.getValidators();
      session.setValidators([]);
      try {
        session.executeAction(capture);
      } finally {
        session.setValidators(validators);
      }
      expect(point.isOwnedByGameSession()).to.equal(true);
    });

    it('does not capture a point after an end-turn effect kills its regular Unit occupant', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      const pointPosition = SDK.HexTopology.renderedToAxial(3, 0);
      const point = session.getBoard().getTileAtPosition(pointPosition, true);
      session.getGeneralForPlayer1().setPosition(SDK.HexTopology.renderedToAxial(2, 0));
      const unit = session.getExistingCardFromIndexOrCreateCardFromData({ id: 10979 });
      unit.setOwner(session.getPlayer1());
      session.applyCardToBoard(unit, pointPosition.q, pointPosition.r);
      session.setStatus(SDK.GameStatus.active);
      session.setIsRunningAsAuthoritative(true);
      const modifier = SDK.ModifierDestroyAtEndOfTurn.createContextObject();
      const apply = new SDK.ApplyModifierAction(session, modifier, unit);
      const validators = session.getValidators();
      session.setValidators([]);
      try {
        session.executeAction(apply);
        session.executeAction(session.actionEndTurn());
      } finally {
        session.setValidators(validators);
      }
      expect(unit.getIsRemoved()).to.equal(true);
      expect(point.isOwnedByGameSession()).to.equal(true);
    });

    it('does not allow an automatic capture action to change ownership outside the capture phase', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      const pointPosition = SDK.HexTopology.renderedToAxial(3, 0);
      const point = session.getBoard().getTileAtPosition(pointPosition, true);
      session.getGeneralForPlayer1().setPosition(pointPosition);
      session.syncState();

      const capture = new SDK.CaptureMethronPointAction(session);
      capture.setTarget(point);
      capture.setIsAutomatic(true);
      capture.setOwnerId(session.getPlayer1Id());
      session.setStatus(SDK.GameStatus.active);
      session.setIsRunningAsAuthoritative(true);
      expect(session.submitExplicitAction(capture)).to.equal(true);
      expect(point.isOwnedByGameSession()).to.equal(true);
    });

    it('ignores authorized Methron capture actions outside ruleset version 2', () => {
      for (const [rulesetId, rulesetVersion] of [['legacy', 1], ['practice-sandbox-hex', 1]]) {
        const session = createRulesetFixture(rulesetId, rulesetVersion);
        const general = session.getGeneralForPlayer1();
        const position = rulesetId === 'legacy' ? { x: 0, y: 0 } : SDK.HexTopology.renderedToAxial(3, 0);
        general.setPosition(position);
        const point = session.createCardForIdentifier(SDK.Cards.Tile.MethronPoint);
        point.setPosition(position);
        session.syncState();

        const capture = new SDK.CaptureMethronPointAction(session);
        capture.setTarget(point);
        session._private.authorizedMethronPointCaptureActions.push(capture);
        const validators = session.getValidators();
        session.setValidators([]);
        try {
          session.executeAction(capture);
        } finally {
          session.setValidators(validators);
        }
        expect(point.isOwnedByGameSession(), `${rulesetId} v${rulesetVersion} point remains neutral`).to.equal(true);
      }
    });

    it('resolves end-turn movement effects before checking point occupants', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      const pointPosition = SDK.HexTopology.renderedToAxial(3, 0);
      const point = session.getBoard().getTileAtPosition(pointPosition, true);
      const general = session.getGeneralForPlayer1();
      general.setPosition(pointPosition);
      session.syncState();
      session.setStatus(SDK.GameStatus.active);
      session.setIsRunningAsAuthoritative(true);

      const destination = SDK.HexTopology.renderedToAxial(4, 1);
      const onEndTurn = () => {
        const movement = new SDK.TeleportAction(session);
        movement.setSource(general);
        movement.setTargetPosition(destination);
        session.executeAction(movement);
      };
      session.getEventBus().on(EVENTS.end_turn, onEndTurn);
      const validators = session.getValidators();
      session.setValidators([]);
      try {
        session.executeAction(session.actionEndTurn());
      } finally {
        session.setValidators(validators);
        session.getEventBus().off(EVENTS.end_turn, onEndTurn);
      }

      expect(general.getPosition()).to.deep.equal(destination);
      expect(point.isOwnedByGameSession()).to.equal(true);
    });

    it('transfers control to an opponent moved onto the point by an end-turn effect', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      const pointPosition = SDK.HexTopology.renderedToAxial(3, 0);
      const point = session.getBoard().getTileAtPosition(pointPosition, true);
      const player1General = session.getGeneralForPlayer1();
      const player2General = session.getGeneralForPlayer2();
      player1General.setPosition(pointPosition);
      player2General.setPosition(SDK.HexTopology.renderedToAxial(4, 0));
      session.syncState();
      session.setStatus(SDK.GameStatus.active);
      session.setIsRunningAsAuthoritative(true);
      const moveOpponentToPoint = () => {
        const movePlayer1Away = new SDK.TeleportAction(session);
        movePlayer1Away.setSource(player1General);
        movePlayer1Away.setTargetPosition(SDK.HexTopology.renderedToAxial(2, 0));
        session.executeAction(movePlayer1Away);
        const movement = new SDK.TeleportAction(session);
        movement.setSource(player2General);
        movement.setTargetPosition(pointPosition);
        session.executeAction(movement);
      };
      session.getEventBus().on(EVENTS.end_turn, moveOpponentToPoint);
      const validators = session.getValidators();
      session.setValidators([]);
      try {
        session.executeAction(session.actionEndTurn());
      } finally {
        session.setValidators(validators);
        session.getEventBus().off(EVENTS.end_turn, moveOpponentToPoint);
      }
      expect(player2General.getPosition()).to.deep.equal(pointPosition);
      expect(point.getOwnerId()).to.equal(session.getPlayer2Id());
    });

    it('transfers an already-controlled point to an opposing regular Unit at end turn', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      const pointPosition = SDK.HexTopology.renderedToAxial(3, 0);
      const point = session.getBoard().getTileAtPosition(pointPosition, true);
      const player1General = session.getGeneralForPlayer1();
      player1General.setPosition(pointPosition);
      session.syncState();
      session.setStatus(SDK.GameStatus.active);
      session.setIsRunningAsAuthoritative(true);
      const validators = session.getValidators();
      session.setValidators([]);
      try {
        session.executeAction(session.actionEndTurn());
      } finally {
        session.setValidators(validators);
      }
      expect(point.getOwnerId()).to.equal(session.getPlayer1Id());

      player1General.setPosition(SDK.HexTopology.renderedToAxial(2, 0));
      const opposingUnit = session.getExistingCardFromIndexOrCreateCardFromData({ id: 10979 });
      opposingUnit.setOwner(session.getPlayer2());
      session.applyCardToBoard(opposingUnit, pointPosition.q, pointPosition.r);
      session.syncState();
      session.setValidators([]);
      try {
        session.executeAction(session.actionEndTurn());
      } finally {
        session.setValidators(validators);
      }
      expect(opposingUnit.getPosition()).to.deep.equal(pointPosition);
      expect(point.getOwnerId()).to.equal(session.getPlayer2Id());
    });

    it('transfers an already-controlled point to an opposing Unit arriving during end-turn effects', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      const pointPosition = SDK.HexTopology.renderedToAxial(3, 0);
      const point = session.getBoard().getTileAtPosition(pointPosition, true);
      const player1General = session.getGeneralForPlayer1();
      player1General.setPosition(pointPosition);
      const opponentUnit = session.getExistingCardFromIndexOrCreateCardFromData({ id: 10979 });
      opponentUnit.setOwner(session.getPlayer2());
      const unitStart = SDK.HexTopology.renderedToAxial(0, 1);
      session.applyCardToBoard(opponentUnit, unitStart.q, unitStart.r);
      session.syncState();
      session.setStatus(SDK.GameStatus.active);
      session.setIsRunningAsAuthoritative(true);
      const validators = session.getValidators();
      session.setValidators([]);
      try {
        session.executeAction(session.actionEndTurn());
      } finally {
        session.setValidators(validators);
      }
      expect(point.getOwnerId()).to.equal(session.getPlayer1Id());

      const moveOpponentUnitToPoint = () => {
        const movePlayer1Away = new SDK.TeleportAction(session);
        movePlayer1Away.setSource(player1General);
        movePlayer1Away.setTargetPosition(SDK.HexTopology.renderedToAxial(2, 0));
        session.executeAction(movePlayer1Away);
        const moveOpponentUnit = new SDK.TeleportAction(session);
        moveOpponentUnit.setSource(opponentUnit);
        moveOpponentUnit.setTargetPosition(pointPosition);
        session.executeAction(moveOpponentUnit);
      };
      session.getEventBus().on(EVENTS.end_turn, moveOpponentUnitToPoint);
      session.setValidators([]);
      try {
        session.executeAction(session.actionEndTurn());
      } finally {
        session.setValidators(validators);
        session.getEventBus().off(EVENTS.end_turn, moveOpponentUnitToPoint);
      }
      expect(opponentUnit.getPosition()).to.deep.equal(pointPosition);
      expect(point.getOwnerId()).to.equal(session.getPlayer2Id());
    });

    it('preserves co-located Unit and Wall identity, target priority, and independent removal in snapshots and replay', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      const board = session.getBoard();
      const wallPosition = SDK.HexTopology.renderedToAxial(2, 4);
      const wall = board.getTileAtPosition(wallPosition);
      expect(wall.getId()).to.equal(SDK.Cards.Tile.Wall);
      const unit = session.getGeneralForPlayer1();
      session.setStatus(SDK.GameStatus.active);
      session.setIsRunningAsAuthoritative(true);
      unit.setSpeed(2);
      unit.hasActiveModifierClass = (modifierClass) => modifierClass === SDK.ModifierFlying;
      const move = unit.actionMove(wallPosition);
      session.executeAction(move);
      expect(move.getIsValid()).to.equal(true);
      expect(unit.getPosition()).to.deep.equal(wallPosition);

      const attacker = session.getGeneralForPlayer2();
      attacker.setPosition({ q: wallPosition.q + 1, r: wallPosition.r });
      attacker.setReach(2);
      attacker.atk = 2;
      attacker.refreshExhaustion();
      session.syncState();
      const wallHp = wall.getHP();
      const unitHp = unit.getHP();
      const initialSnapshot = JSON.parse(session.serializeToJSON(session));
      const attack = attacker.actionAttackEntityAtPosition(wallPosition);
      expect(attack.getTarget()).to.equal(unit);
      expect(board.getUnitAtPosition(wallPosition, true)).to.equal(unit);
      session.setIsRunningAsAuthoritative(true);
      session.executeAction(attack);
      expect(attack.getIsValid()).to.equal(true);
      expect(unit.getHP()).to.equal(unitHp - 2);
      expect(wall.getHP()).to.equal(wallHp);
      const serializedAttack = JSON.parse(session.serializeToJSON(attack));

      const replay = SDK.GameSession.create();
      replay.deserializeSessionFromFirebase(initialSnapshot);
      const replayedUnit = replay.getGeneralForPlayer1();
      const replayedWall = replay.getBoard().getTileAtPosition(wallPosition);
      expect(replayedUnit.getPosition()).to.deep.equal(wallPosition);
      expect(replay.getBoard().getUnits()).to.include(replayedUnit);
      expect(replayedWall).not.to.equal(null);
      replay.setStatus(SDK.GameStatus.active);
      replay.setIsRunningAsAuthoritative(true);
      const replayedAttack = replay.deserializeActionFromFirebase(serializedAttack);
      expect(replayedAttack.getTarget()).to.equal(replayedUnit);
      const replayValidators = replay.getValidators();
      replay.setValidators([]);
      try {
        replay.executeAction(replayedAttack);
      } finally {
        replay.setValidators(replayValidators);
      }
      expect(replayedUnit.getHP()).to.equal(unitHp - 2);
      expect(replayedWall.getHP()).to.equal(wallHp);

      const wallDamage = new SDK.DamageAction(replay);
      wallDamage.setTarget(replayedWall);
      wallDamage.setDamageAmount(wallHp);
      const wallDamageValidators = replay.getValidators();
      replay.setValidators([]);
      try {
        replay.executeAction(wallDamage);
      } finally {
        replay.setValidators(wallDamageValidators);
      }
      expect(replay.getBoard().getTileAtPosition(wallPosition) == null).to.equal(true);
      expect(replay.getBoard().getUnitAtPosition(wallPosition, true)).to.equal(replayedUnit);
      expect(replay.getBoard().hasTileAtPosition(wallPosition)).to.equal(true);

      const unitRemovalReplay = SDK.GameSession.create();
      unitRemovalReplay.deserializeSessionFromFirebase(initialSnapshot);
      const unitToRemove = unitRemovalReplay.getGeneralForPlayer1();
      const wallToKeep = unitRemovalReplay.getBoard().getTileAtPosition(wallPosition);
      unitRemovalReplay.removeCardFromBoard(unitToRemove, wallPosition.q, wallPosition.r);
      expect(unitRemovalReplay.getBoard().getUnitAtPosition(wallPosition, true) == null).to.equal(true);
      expect(unitRemovalReplay.getBoard().getTileAtPosition(wallPosition)).to.equal(wallToKeep);
    });

    it('executes and replays the Wall attack selected by Practice AI with matching Wall health and route state', () => {
      const session = createRulesetFixture('practice-sandbox-hex', 2);
      const board = session.getBoard();
      const wall = board.getTileAtPosition({ q: 1, r: 0 });
      const unit = session.createCardForIdentifier(SDK.Cards.Neutral.SaberspineTiger);
      unit.setOwnerId(session.getPlayer1Id());
      session._indexCardAsNeeded(unit);
      unit.setPosition({ q: 0, r: 0 });
      unit.setIsPlayed(true);
      unit.setIsRemoved(false);
      unit.setReach(2);
      unit.atk = wall.getHP();
      unit.refreshExhaustion();
      board.addCard(unit);
      wall.setDamage(wall.getHP() - 1);
      session.setStatus(SDK.GameStatus.active);
      const beforeSnapshot = JSON.parse(session.serializeToJSON(session));
      const preexistingEndpoints = unit.getMovementRange().getValidPositions(board, unit)
        .map((path) => path[path.length - 1]);

      const ai = new StarterAI(session, session.getPlayer1Id(), 1);
      ai._nextActions = [];
      ai._findAttackActionsForUnit(unit, false);
      const selected = ai._nextActions[0];
      expect(selected).to.be.instanceOf(SDK.AttackAction);
      expect(selected.getTarget()).to.equal(wall);
      const serializedAction = JSON.parse(session.serializeToJSON(selected));

      const runSelected = (targetSession, action) => {
        targetSession.setStatus(SDK.GameStatus.active);
        targetSession.setIsRunningAsAuthoritative(true);
        const validators = targetSession.getValidators();
        targetSession.setValidators([]);
        try {
          targetSession.executeAction(action);
        } finally {
          targetSession.setValidators(validators);
        }
      };
      runSelected(session, selected);
      expect(board.getTileAtPosition({ q: 1, r: 0 }) == null).to.equal(true);
      unit.getMovementRange().flushCachedState();
      const postEndpoints = unit.getMovementRange().getValidPositions(board, unit)
        .map((path) => path[path.length - 1]);
      expect(postEndpoints.length).to.be.greaterThan(preexistingEndpoints.length);

      const replay = SDK.GameSession.create();
      replay.deserializeSessionFromFirebase(beforeSnapshot);
      const replayedUnit = replay.getCardByIndex(unit.getIndex());
      const replayedWall = replay.getBoard().getTileAtPosition({ q: 1, r: 0 });
      const replayedAction = replay.deserializeActionFromFirebase(serializedAction);
      expect(replayedAction.getTarget()).to.equal(replayedWall);
      runSelected(replay, replayedAction);
      expect(replayedWall.getIsActive()).to.equal(false);
      expect(replay.getBoard().getTileAtPosition({ q: 1, r: 0 }) == null).to.equal(true);
      const replayEndpoints = replayedUnit.getMovementRange().getValidPositions(replay.getBoard(), replayedUnit)
        .map((path) => path[path.length - 1]);
      expect(replayEndpoints).to.deep.equal(postEndpoints);
    });

    it('rejects unknown rulesets before snapshot reconstruction', () => {
      const session = SDK.GameSession.create();
      expect(() => session.deserializeSessionFromFirebase({
        rulesetId: 'unknown',
        rulesetVersion: 1,
        board: { cards: [999] },
      })).to.throw(/Unsupported ruleset/);
      expect(session.getRulesetId()).to.equal('legacy');
    });

    it('rejects unsupported versions before snapshot reconstruction', () => {
      const session = SDK.GameSession.create();
      expect(() => session.deserializeSessionFromFirebase({
        rulesetId: 'practice-sandbox-hex',
        rulesetVersion: 3,
        board: { cards: [999] },
      })).to.throw(/Unsupported ruleset/);
      expect(session.getRulesetId()).to.equal('legacy');
    });
  });

  describe('scrubGameSessionData / card.isScrubbable', () => {
    beforeEach(() => {
      // define test decks.  Spells do not work.  Only add minions and generals this way
      const player1Deck = [
        { id: SDK.Cards.Faction1.General },
        { id: SDK.Cards.Faction1.SilverguardSquire },
        { id: SDK.Cards.Faction1.SilverguardSquire },
        { id: SDK.Cards.Faction1.SilverguardSquire },
        { id: SDK.Cards.Faction1.WindbladeAdept },
        { id: SDK.Cards.Faction1.WindbladeAdept },
        { id: SDK.Cards.Faction1.WindbladeAdept },
        { id: SDK.Cards.Faction1.SunstoneTemplar },
        { id: SDK.Cards.Faction1.SunstoneTemplar },
        { id: SDK.Cards.Faction1.SunstoneTemplar },
      ];

      const player2Deck = [
        { id: SDK.Cards.Faction2.General },
        { id: SDK.Cards.Faction2.Heartseeker },
        { id: SDK.Cards.Faction2.Heartseeker },
        { id: SDK.Cards.Faction2.Heartseeker },
        { id: SDK.Cards.Faction2.Widowmaker },
        { id: SDK.Cards.Faction2.Widowmaker },
        { id: SDK.Cards.Faction2.Widowmaker },
        { id: SDK.Cards.Faction2.KaidoAssassin },
        { id: SDK.Cards.Faction2.KaidoAssassin },
        { id: SDK.Cards.Faction2.KaidoAssassin },
      ];

      // setup test session
      UtilsSDK.setupSession(player1Deck, player2Deck, false, false);

      /* // USE THIS TO GET THE CURRENT CARDS IN YOUR HAND
      const deck = player1.getDeck();
      Logger.module("UNITTEST").log(deck.getCardsInHand(1));
      */
    });

    afterEach(() => {
      SDK.GameSession.reset();
    });

    it('expect that player 1 can see their own deck/hand but not player 2\'s hand or deck', (done) => {
      let data = JSON.parse(SDK.GameSession.current().serializeToJSON(SDK.GameSession.current()));
      data = UtilsGameSession.scrubGameSessionData(SDK.GameSession.current(), data, SDK.GameSession.current().getPlayer1Id(), false);
      const newSession = SDK.GameSession.create();
      newSession.deserializeSessionFromFirebase(data);

      expect(newSession.gameSetupData.players[0].deck[0].id).to.be.above(0);
      expect(newSession.gameSetupData.players[0].startingDrawPile[0].id).to.be.above(0);
      expect(newSession.gameSetupData.players[0].startingHand[0].id).to.be.above(0);

      expect(newSession.gameSetupData.players[1].deck[0].id).to.equal(-1);
      expect(newSession.gameSetupData.players[1].startingDrawPile[0].id).to.equal(-1);
      expect(newSession.gameSetupData.players[1].startingHand[0].id).to.equal(-1);

      expect(newSession.getPlayer1().getDeck().getCardsInHandExcludingMissing().length).to.equal(5);
      expect(newSession.getPlayer2().getDeck().getCardsInHandExcludingMissing().length).to.equal(0);
      expect(newSession.getPlayer1().getDeck().getCardsInDrawPileExcludingMissing().length).to.equal(4);
      expect(newSession.getPlayer2().getDeck().getCardsInDrawPileExcludingMissing().length).to.equal(0);

      done();
    });

    it('expect that a spectator of player 1 can see only the hand of player 1 but not player 2\'s hand or deck', (done) => {
      let data = JSON.parse(SDK.GameSession.current().serializeToJSON(SDK.GameSession.current()));
      data = UtilsGameSession.scrubGameSessionData(SDK.GameSession.current(), data, SDK.GameSession.current().getPlayer1Id(), true);
      const newSession = SDK.GameSession.create();
      newSession.deserializeSessionFromFirebase(data);

      expect(newSession.gameSetupData.players[0].deck[0].id).to.equal(-1);
      expect(newSession.gameSetupData.players[0].startingDrawPile[0].id).to.equal(-1);
      expect(newSession.gameSetupData.players[0].startingHand[0].id).to.be.above(0);

      expect(newSession.gameSetupData.players[1].deck[0].id).to.equal(-1);
      expect(newSession.gameSetupData.players[1].startingDrawPile[0].id).to.equal(-1);
      expect(newSession.gameSetupData.players[1].startingHand[0].id).to.equal(-1);

      expect(newSession.getPlayer1().getDeck().getCardsInHandExcludingMissing().length).to.equal(5);
      expect(newSession.getPlayer2().getDeck().getCardsInHandExcludingMissing().length).to.equal(0);
      expect(newSession.getPlayer1().getDeck().getCardsInDrawPileExcludingMissing().length).to.equal(0);
      expect(newSession.getPlayer2().getDeck().getCardsInDrawPileExcludingMissing().length).to.equal(0);

      done();
    });

    it('expect Card to not be scrubbable if it\'s for the player you are spectating and in the hand', (done) => {
      const isScrubbable = SDK.GameSession.current().getPlayer1().getDeck().getCardsInHandExcludingMissing()[0].isScrubbable(SDK.GameSession.current().getPlayer1Id(), true);
      expect(isScrubbable).to.equal(false);
      done();
    });

    it('expect Card to be scrubbable if it\'s for the player you are spectating but not in the hand', (done) => {
      const isScrubbable = SDK.GameSession.current().getPlayer1().getDeck().getCardsInDrawPileExcludingMissing()[0].isScrubbable(SDK.GameSession.current().getPlayer1Id(), true);
      expect(isScrubbable).to.equal(true);
      done();
    });

    it('expect Card to be scrubbable if it\'s for the opponent', (done) => {
      const isScrubbable = SDK.GameSession.current().getPlayer2().getDeck().getCardsInDrawPileExcludingMissing()[0].isScrubbable(SDK.GameSession.current().getPlayer1Id(), false);
      expect(isScrubbable).to.equal(true);
      done();
    });

    it('expect Card to not be scrubbable if it\'s for you', (done) => {
      const isScrubbable = SDK.GameSession.current().getPlayer1().getDeck().getCardsInDrawPileExcludingMissing()[0].isScrubbable(SDK.GameSession.current().getPlayer1Id(), false);
      expect(isScrubbable).to.equal(false);
      done();
    });
  });
});
