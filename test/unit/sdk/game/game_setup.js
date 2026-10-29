const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');
const { expect } = require('chai');
const _ = require('underscore');
const CONFIG = require('../../../../app/common/config');
const Logger = require('../../../../app/common/logger.coffee');
const SDK = require('../../../../app/sdk.coffee');
const Rulesets = require('../../../../app/sdk/rulesets/rulesetsLookup.coffee');
const createSinglePlayerGame = require('../../../../server/lib/create_single_player_game.coffee');
const GameManager = require('../../../../server/redis').GameManager;
const GamesModule = require('../../../../server/lib/data_access/games.coffee');
const Promise = require('bluebird');
const UtilsSDK = require('../../../utils/utils_sdk');

// disable the logger for cleaner test output
Logger.enabled = false;

describe('game setup', () => {
  beforeEach(() => {
    // define test decks
    const player1Deck = SDK.FactionFactory.factionForIdentifier(SDK.Factions.Faction1).starterDeck;
    const player2Deck = SDK.FactionFactory.factionForIdentifier(SDK.Factions.Faction2).starterDeck;

    // setup test session
    UtilsSDK.setupSession(player1Deck, player2Deck);
  });

  afterEach(() => {
    SDK.GameSession.reset();
  });

  describe('setup', () => {
    it('uses legacy rules by default for ordinary game setup', () => {
      expect(SDK.GameSession.getInstance().getRulesetId()).to.equal('legacy');
      expect(SDK.GameSession.getInstance().getRulesetVersion()).to.equal(1);
    });

    it('selects Practice rules only from the server-side single-player entry', () => {
      expect(Rulesets.getServerRulesetForGameType(SDK.GameType.SinglePlayer)).to.deep.equal({ id: 'practice-sandbox-hex', version: 1 });
      expect(Rulesets.getServerRulesetForGameType(SDK.GameType.BossBattle)).to.deep.equal({ id: 'legacy', version: 1 });
    });

    it('assigns the authoritative ruleset to the session before serialization', () => {
      const practiceSession = SDK.GameSession.create();
      Rulesets.assignServerRulesetToSession(practiceSession, SDK.GameType.SinglePlayer);
      const practiceSnapshot = JSON.parse(practiceSession.serializeToJSON(practiceSession));
      expect(practiceSnapshot.rulesetId).to.equal('practice-sandbox-hex');
      expect(practiceSnapshot.rulesetVersion).to.equal(1);

      const bossBattleSession = SDK.GameSession.create();
      Rulesets.assignServerRulesetToSession(bossBattleSession, SDK.GameType.BossBattle);
      const bossBattleSnapshot = JSON.parse(bossBattleSession.serializeToJSON(bossBattleSession));
      expect(bossBattleSnapshot.rulesetId).to.equal('legacy');
      expect(bossBattleSnapshot.rulesetVersion).to.equal(1);
    });

    it('creates and saves Practice sessions with the server-selected ruleset', () => {
      const originalGenerateGameId = GameManager.generateGameId;
      const originalSaveGameSession = GameManager.saveGameSession;
      const originalNewUserGame = GamesModule.newUserGame;
      let savedSnapshot = null;
      GameManager.generateGameId = () => Promise.resolve('ruleset-test-game');
      GameManager.saveGameSession = (gameId, serializedSession) => {
        savedSnapshot = JSON.parse(serializedSession);
        return Promise.resolve();
      };
      GamesModule.newUserGame = () => Promise.resolve();

      const practiceDeck = SDK.FactionFactory.factionForIdentifier(SDK.Factions.Faction1).starterDeck;
      const aiGeneralId = SDK.Cards.Faction2.General;
      return createSinglePlayerGame(
        'ruleset-test-player',
        'Practice Test',
        SDK.GameType.SinglePlayer,
        practiceDeck,
        null,
        null,
        'ruleset-test-ai',
        'Practice AI',
        aiGeneralId,
        null,
        1,
        0,
        null,
        null,
      ).then(() => {
        expect(savedSnapshot.rulesetId).to.equal('practice-sandbox-hex');
        expect(savedSnapshot.rulesetVersion).to.equal(1);
      }).finally(() => {
        GameManager.generateGameId = originalGenerateGameId;
        GameManager.saveGameSession = originalSaveGameSession;
        GamesModule.newUserGame = originalNewUserGame;
      });
    });

    it('selects the new rules only for the concrete local Sandbox entry', () => {
      const session = SDK.GameSession.create();
      new SDK.Sandbox().setupSessionModes(session);
      expect(session.getRulesetId()).to.equal('practice-sandbox-hex');
      expect(session.getRulesetVersion()).to.equal(1);

      const developerSession = SDK.GameSession.create();
      new SDK.SandboxDeveloper().setupSessionModes(developerSession);
      expect(developerSession.getRulesetId()).to.equal('legacy');
    });

    it('expect no cards to be in the void', () => {
      const cards = SDK.GameSession.getInstance().getCards();
      for (let i = 0, il = cards.length; i < il; i++) {
        const card = cards[i];
        expect(card.getIsLocatedInVoid()).to.equal(false);
      }
    });
  });

  describe('player 1', () => {
    it('expect general to be lyonar', () => {
      expect(SDK.GameSession.getInstance().getGeneralForPlayer1().getFactionId()).to.equal(SDK.Factions.Faction1);
    });

    it('expect player setup data deck count to match card count from draw pile + hand + board', () => {
      const gameSetupData = SDK.GameSession.getInstance().getGameSetupData();
      const playerSetupData = gameSetupData.players[0];
      const generalCount = SDK.GameSession.getInstance().getGeneralForPlayer1() != null ? 1 : 0;
      const handCount = SDK.GameSession.getInstance().getPlayer1().getDeck().getHandExcludingMissing().length;
      const drawPileCount = SDK.GameSession.getInstance().getPlayer1().getDeck().getDrawPileExcludingMissing().length;
      expect(playerSetupData.deck.length).to.equal(generalCount + handCount + drawPileCount);
    });

    it('expect player setup data starting draw pile to match draw pile', () => {
      const gameSetupData = SDK.GameSession.getInstance().getGameSetupData();
      const playerSetupData = gameSetupData.players[0];
      const startingCardDataInDrawPile = playerSetupData.startingDrawPile;
      const cardsInDrawPile = SDK.GameSession.getInstance().getPlayer1().getDeck().getCardsInDrawPile();
      for (let i = 0, il = startingCardDataInDrawPile.length; i < il; i++) {
        const cardSetupData = startingCardDataInDrawPile[i];
        const cardInGame = cardsInDrawPile[i];
        expect(cardSetupData.index).to.equal(cardInGame.getIndex());
      }
    });

    it('expect player setup data starting hand to match hand', () => {
      const gameSetupData = SDK.GameSession.getInstance().getGameSetupData();
      const playerSetupData = gameSetupData.players[0];
      const startingCardDataInDrawPile = playerSetupData.startingHand;
      const cardsInHand = SDK.GameSession.getInstance().getPlayer1().getDeck().getCardsInHand();
      for (let i = 0, il = startingCardDataInDrawPile.length; i < il; i++) {
        const cardSetupData = startingCardDataInDrawPile[i];
        const cardInGame = cardsInHand[i];
        if (cardSetupData != null) {
          expect(cardSetupData.index).to.equal(cardInGame.getIndex());
        } else {
          expect(cardInGame).to.not.exist;
        }
      }
    });

    it(`expect hand to have ${CONFIG.MAX_HAND_SIZE} slots`, () => {
      expect(SDK.GameSession.getInstance().getPlayer1().getDeck().getHand().length).to.equal(CONFIG.MAX_HAND_SIZE);
    });

    it(`expect ${CONFIG.STARTING_HAND_SIZE} cards in hand`, () => {
      const drawPile = SDK.GameSession.getInstance().getPlayer1().getDeck().getHand();
      let numCards = 0;
      for (let i = 0, il = drawPile.length; i < il; i++) {
        const cardIndex = drawPile[i];
        if (cardIndex != null) {
          numCards++;
        }
      }
      expect(numCards).to.equal(CONFIG.STARTING_HAND_SIZE);
    });

    it('expect deck card indices to map to indexed cards', () => {
      const drawPile = SDK.GameSession.getInstance().getPlayer1().getDeck().getDrawPile();
      let pass = true;
      for (let i = 0, il = drawPile.length; i < il; i++) {
        const cardIndex = drawPile[i];
        const card = SDK.GameSession.getInstance().getCardByIndex(cardIndex);
        if (card == null || card.getIndex() !== cardIndex) {
          pass = false;
          break;
        }
      }
      expect(pass).to.equal(true);
    });

    it('expect deck cards to be in deck', () => {
      const cards = SDK.GameSession.getInstance().getPlayer1().getDeck().getCardsInDrawPile();
      let pass = true;
      for (let i = 0, il = cards.length; i < il; i++) {
        const card = cards[i];
        if (!card.getIsLocatedInDeck() || card.getIsLocatedInHand() || card.getIsActive()) {
          pass = false;
          break;
        }
      }
      expect(pass).to.equal(true);
    });

    it('expect hand card indices to map to indexed cards', () => {
      const drawPile = SDK.GameSession.getInstance().getPlayer1().getDeck().getHand();
      let pass = true;
      for (let i = 0, il = drawPile.length; i < il; i++) {
        const cardIndex = drawPile[i];
        if (cardIndex != null) {
          const card = SDK.GameSession.getInstance().getCardByIndex(cardIndex);
          if (card == null || card.getIndex() !== cardIndex) {
            pass = false;
            break;
          }
        }
      }
      expect(pass).to.equal(true);
    });

    it('expect hand cards to be in hand', () => {
      const cards = SDK.GameSession.getInstance().getPlayer1().getDeck().getCardsInHand();
      let pass = true;
      for (let i = 0, il = cards.length; i < il; i++) {
        const card = cards[i];
        if (card != null && (!card.getIsLocatedInHand() || card.getIsLocatedInDeck() || card.getIsActive())) {
          pass = false;
          break;
        }
      }
      expect(pass).to.equal(true);
    });
  });

  describe('player 2', () => {
    it('expect general to be songhai', () => {
      expect(SDK.GameSession.getInstance().getGeneralForPlayer2().getFactionId()).to.equal(SDK.Factions.Faction2);
    });

    it('expect player setup data deck count to match card count from draw pile + hand + board', () => {
      const gameSetupData = SDK.GameSession.getInstance().getGameSetupData();
      const playerSetupData = gameSetupData.players[1];
      const generalCount = SDK.GameSession.getInstance().getGeneralForPlayer2() != null ? 1 : 0;
      const handCount = SDK.GameSession.getInstance().getPlayer2().getDeck().getHandExcludingMissing().length;
      const drawPileCount = SDK.GameSession.getInstance().getPlayer2().getDeck().getDrawPileExcludingMissing().length;
      expect(playerSetupData.deck.length).to.equal(generalCount + handCount + drawPileCount);
    });

    it('expect player setup data starting draw pile to match draw pile', () => {
      const gameSetupData = SDK.GameSession.getInstance().getGameSetupData();
      const playerSetupData = gameSetupData.players[1];
      const startingCardDataInDrawPile = playerSetupData.startingDrawPile;
      const cardsInDrawPile = SDK.GameSession.getInstance().getPlayer2().getDeck().getCardsInDrawPile();
      for (let i = 0, il = startingCardDataInDrawPile.length; i < il; i++) {
        const cardSetupData = startingCardDataInDrawPile[i];
        const cardInGame = cardsInDrawPile[i];
        expect(cardSetupData.index).to.equal(cardInGame.getIndex());
      }
    });

    it('expect player setup data starting hand to match hand', () => {
      const gameSetupData = SDK.GameSession.getInstance().getGameSetupData();
      const playerSetupData = gameSetupData.players[1];
      const startingCardDataInDrawPile = playerSetupData.startingHand;
      const cardsInHand = SDK.GameSession.getInstance().getPlayer2().getDeck().getCardsInHand();
      for (let i = 0, il = startingCardDataInDrawPile.length; i < il; i++) {
        const cardSetupData = startingCardDataInDrawPile[i];
        const cardInGame = cardsInHand[i];
        if (cardSetupData != null) {
          expect(cardSetupData.index).to.equal(cardInGame.getIndex());
        } else {
          expect(cardInGame).to.not.exist;
        }
      }
    });

    it(`expect hand to have ${CONFIG.MAX_HAND_SIZE} slots`, () => {
      expect(SDK.GameSession.getInstance().getPlayer2().getDeck().getHand().length).to.equal(CONFIG.MAX_HAND_SIZE);
    });

    it(`expect ${CONFIG.STARTING_HAND_SIZE} cards in hand`, () => {
      const drawPile = SDK.GameSession.getInstance().getPlayer2().getDeck().getHand();
      let numCards = 0;
      for (let i = 0, il = drawPile.length; i < il; i++) {
        const cardIndex = drawPile[i];
        if (cardIndex != null) {
          numCards++;
        }
      }
      expect(numCards).to.equal(CONFIG.STARTING_HAND_SIZE);
    });

    it('expect deck card indices to map to indexed cards', () => {
      const drawPile = SDK.GameSession.getInstance().getPlayer2().getDeck().getDrawPile();
      let pass = true;
      for (let i = 0, il = drawPile.length; i < il; i++) {
        const cardIndex = drawPile[i];
        const card = SDK.GameSession.getInstance().getCardByIndex(cardIndex);
        if (card == null || card.getIndex() !== cardIndex) {
          pass = false;
          break;
        }
      }
      expect(pass).to.equal(true);
    });

    it('expect deck cards to be in deck', () => {
      const cards = SDK.GameSession.getInstance().getPlayer2().getDeck().getCardsInDrawPile();
      let pass = true;
      for (let i = 0, il = cards.length; i < il; i++) {
        const card = cards[i];
        if (!card.getIsLocatedInDeck() || card.getIsLocatedInHand() || card.getIsActive()) {
          pass = false;
          break;
        }
      }
      expect(pass).to.equal(true);
    });

    it('expect hand card indices to map to indexed cards', () => {
      const drawPile = SDK.GameSession.getInstance().getPlayer2().getDeck().getHand();
      let pass = true;
      for (let i = 0, il = drawPile.length; i < il; i++) {
        const cardIndex = drawPile[i];
        if (cardIndex != null) {
          const card = SDK.GameSession.getInstance().getCardByIndex(cardIndex);
          if (card == null || card.getIndex() !== cardIndex) {
            pass = false;
            break;
          }
        }
      }
      expect(pass).to.equal(true);
    });

    it('expect hand cards to be in hand', () => {
      const cards = SDK.GameSession.getInstance().getPlayer2().getDeck().getCardsInHand();
      let pass = true;
      for (let i = 0, il = cards.length; i < il; i++) {
        const card = cards[i];
        if (card != null && (!card.getIsLocatedInHand() || card.getIsLocatedInDeck() || card.getIsActive())) {
          pass = false;
          break;
        }
      }
      expect(pass).to.equal(true);
    });
  });

  describe('board', () => {
    it('expect cards on board to be active', () => {
      const cards = SDK.GameSession.getInstance().getBoard().getCards(null, true);
      let pass = true;
      for (let i = 0, il = cards.length; i < il; i++) {
        const card = cards[i];
        if (!card.getIsActive() || card.getIsLocatedInHand() || card.getIsLocatedInDeck()) {
          pass = false;
          break;
        }
      }
      expect(pass).to.equal(true);
    });

    it('expect 2 active generals', () => {
      const cards = SDK.GameSession.getInstance().getBoard().getCards();
      let numGenerals = 0;
      for (let i = 0, il = cards.length; i < il; i++) {
        const card = cards[i];
        if (card instanceof SDK.Unit && card.getIsGeneral() && card.getIsActive()) {
          numGenerals++;
        }
      }
      expect(numGenerals).to.equal(2);
    });
  });
});
