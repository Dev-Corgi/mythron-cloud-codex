const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
require('coffeescript/register');

const _ = require('underscore');
const prettyjson = require('prettyjson');
const { expect } = require('chai');

const UtilsGameSession = require('../../../app/common/utils/utils_game_session.coffee');
const SDK = require('../../../app/sdk.coffee');
const UtilsSDK = require('../../utils/utils_sdk');

const createRulesetFixture = (rulesetId, rulesetVersion) => {
  const gameSession = SDK.GameSession.create();
  gameSession.setRuleset(rulesetId, rulesetVersion);
  const roster = [10979, 19052, 19038, 10205, 10001, 19051, 10954, 10206];
  const practiceDeck1 = [{ id: SDK.Cards.Faction1.General }, ...roster.map((id) => ({ id }))];
  const practiceDeck2 = [{ id: SDK.Cards.Faction4.AltGeneral }, ...roster.map((id) => ({ id }))];
  SDK.GameSetup.setupNewSession(gameSession,
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

describe('UtilsGameSession', () => {
  describe('ruleset persistence', () => {
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
      expect(initialWalls.every((wall) => wall.getHP() === 10 && wall.isOwnedByGameSession())).to.equal(true);
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
      expect(initialWalls[0].getHP()).to.equal(7);
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
      expect(replayedWall.getHP()).to.equal(7);

      const restored = SDK.GameSession.create();
      restored.deserializeSessionFromFirebase(serialized);
      expect(restored.getRulesetId()).to.equal('practice-sandbox-hex');
      expect(restored.getRulesetVersion()).to.equal(2);
      expect(restored.getBoard().getTilePositions()).to.have.length(41);
      expect(restored.getBoard().hasTileAtPosition(SDK.HexTopology.renderedToAxial(2, 0))).to.equal(false);
      expect(restored.getGeneralForPlayer1().getPosition()).to.deep.equal({ q: -2, r: 4 });
      expect(restored.getGeneralForPlayer2().getPosition()).to.deep.equal({ q: 8, r: 0 });
      const restoredWalls = restored.getBoard().getTiles().filter((tile) => tile.getId() === SDK.Cards.Tile.Wall);
      expect(restoredWalls).to.have.length(8);
      expect(restoredWalls.find((wall) => wall.getPosition().q === wallPositions[0].q && wall.getPosition().r === wallPositions[0].r).getHP()).to.equal(7);
      expect(restored.getBoard().getTileAtPosition(destroyedPosition) == null).to.equal(true);
      expect(restored.getBoard().hasTileAtPosition(destroyedPosition)).to.equal(true);

      const replay = SDK.GameSession.create();
      SDK.GameSetup.setupNewSessionFromExistingSessionData(replay, serialized);
      expect(replay.getRulesetId()).to.equal('practice-sandbox-hex');
      expect(replay.getRulesetVersion()).to.equal(2);
      expect(replay.getBoard().getTilePositions()).to.have.length(41);
      expect(replay.getBoard().hasTileAtPosition(SDK.HexTopology.renderedToAxial(6, 4))).to.equal(false);
      expect(replay.getGeneralForPlayer1().getPosition()).to.deep.equal({ q: -2, r: 4 });
      expect(replay.getGeneralForPlayer2().getPosition()).to.deep.equal({ q: 8, r: 0 });
      expect(replay.getBoard().getTiles().filter((tile) => tile.getId() === SDK.Cards.Tile.Wall)).to.have.length(9);
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
