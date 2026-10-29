const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
require('coffeescript/register');

const _ = require('underscore');
const prettyjson = require('prettyjson');
const { expect } = require('chai');

const UtilsGameSession = require('../../../app/common/utils/utils_game_session.coffee');
const SDK = require('../../../app/sdk.coffee');
const UtilsSDK = require('../../utils/utils_sdk');

describe('UtilsGameSession', () => {
  describe('ruleset persistence', () => {
    it('round trips a supported ruleset and defaults historical snapshots to legacy', () => {
      UtilsSDK.setupSession(
        SDK.FactionFactory.starterDeckForFactionLevel(SDK.Factions.Faction1, 30),
        SDK.FactionFactory.starterDeckForFactionLevel(SDK.Factions.Faction2, 30),
      );
      const session = SDK.GameSession.current();
      session.setRuleset('practice-sandbox-hex', 1);
      const serialized = JSON.parse(session.serializeToJSON(session));
      const restored = SDK.GameSession.create();
      restored.deserializeSessionFromFirebase(serialized);
      expect(restored.getRulesetId()).to.equal('practice-sandbox-hex');
      expect(restored.getRulesetVersion()).to.equal(1);

      const replay = SDK.GameSession.create();
      SDK.GameSetup.setupNewSessionFromExistingSessionData(replay, JSON.parse(JSON.stringify(serialized)));
      expect(replay.getRulesetId()).to.equal('practice-sandbox-hex');
      expect(replay.getRulesetVersion()).to.equal(1);

      delete serialized.rulesetId;
      delete serialized.rulesetVersion;
      const historical = SDK.GameSession.create();
      historical.deserializeSessionFromFirebase(serialized);
      expect(historical.getRulesetId()).to.equal('legacy');
      expect(historical.getRulesetVersion()).to.equal(1);

      const historicalReplay = SDK.GameSession.create();
      SDK.GameSetup.setupNewSessionFromExistingSessionData(historicalReplay, serialized);
      expect(historicalReplay.getRulesetId()).to.equal('legacy');
      expect(historicalReplay.getRulesetVersion()).to.equal(1);
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
        rulesetVersion: 2,
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
