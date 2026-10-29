const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');
const { expect } = require('chai');
const _ = require('underscore');
const CONFIG = require('../../../../app/common/config');
const Logger = require('../../../../app/common/logger.coffee');
const SDK = require('../../../../app/sdk.coffee');
const EVENTS = require('../../../../app/common/event_types');
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
    it('retains legacy empty-deck fatigue', () => {
      const session = SDK.GameSession.getInstance();
      const player = session.getCurrentPlayer();
      player.setHasStartingHand(true);
      session.getOpponentPlayer().setHasStartingHand(true);
      session.setStatus(SDK.GameStatus.active);
      const playerDeck = player.getDeck();
      playerDeck.setDrawPile([]);
      const general = session.getGeneralForPlayerId(player.getPlayerId());
      const healthBefore = general.getHP();
      const validatorsBefore = session.getValidators();
      session.setValidators([]);

      session.executeAction(playerDeck.actionDrawCard());
      session.setValidators(validatorsBefore);

      expect(session.getRulesetId()).to.equal('legacy');
      expect(general.getHP()).to.be.lessThan(healthBefore);
    });

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

      const practiceDeck = [{ id: SDK.Cards.Faction1.General }, ...Array(8).fill({ id: SDK.Cards.Neutral.Maw })];
      const aiGeneralId = SDK.Cards.Faction3.AltGeneral;
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

    it('places hex generals at the opposite center-edge axial cells while legacy starts stay square', () => {
      const session = SDK.GameSession.create();
      session.setRuleset('practice-sandbox-hex', 1);
      SDK.GameSetup.setupNewSession(session, {
        userId: 'hex-player-1', name: 'Hex Player 1', deck: [{ id: SDK.Cards.Faction1.General }],
      }, {
        userId: 'hex-player-2', name: 'Hex Player 2', deck: [{ id: SDK.Cards.Faction4.AltGeneral }],
      }, true);
      expect(session.getGeneralForPlayer1().getPosition()).to.deep.equal({ q: -2, r: 4 });
      expect(session.getGeneralForPlayer2().getPosition()).to.deep.equal({ q: 2, r: 4 });
      expect(session.getBoard().isOnBoard(session.getGeneralForPlayer1().getPosition())).to.equal(true);
      expect(session.getBoard().isOnBoard(session.getGeneralForPlayer2().getPosition())).to.equal(true);
      expect(session.getBoard().getUnitAtPosition({ q: -2, r: 4 })).to.equal(session.getGeneralForPlayer1());
      expect(SDK.GameSession.getInstance().getGeneralForPlayer1().getPosition()).to.deep.equal({ x: 0, y: 2 });
    });

    it('puts all eight hex deck cards into matching fixed hand slots in deck order', () => {
      const session = SDK.GameSession.create();
      session.setRuleset('practice-sandbox-hex', 1);
      const deck = [{ id: SDK.Cards.Faction1.General }];
      for (let i = 0; i < 8; i++) deck.push({ id: SDK.Cards.Neutral.Maw });
      SDK.GameSetup.setupNewSession(session, { userId: 'hex-slots-1', name: 'Hex One', deck }, {
        userId: 'hex-slots-2', name: 'Hex Two', deck: [{ id: SDK.Cards.Faction4.AltGeneral }, ...deck.slice(1)],
      }, true);
      const hand = session.getPlayer1().getDeck().getHand();
      expect(hand).to.have.length(8);
      expect(session.getPlayer1().getDeck().getDrawPile()).to.deep.equal([]);
      expect(hand.map((index) => session.getCardByIndex(index).getId())).to.deep.equal(deck.slice(1).map((card) => card.id));
      expect(session.getPlayer2().getDeck().getHand()).to.have.length(8);
      expect(session.getPlayer2().getDeck().getDrawPile()).to.deep.equal([]);
    });

    it('keeps excess cards from unvalidated input instead of dropping them', () => {
      const session = SDK.GameSession.create();
      session.setRuleset('practice-sandbox-hex', 1);
      const deck = [{ id: SDK.Cards.Faction1.General }];
      for (let i = 0; i < 9; i++) deck.push({ id: SDK.Cards.Neutral.Maw });
      SDK.GameSetup.setupNewSession(session, { userId: 'hex-extra-1', name: 'Hex One', deck }, {
        userId: 'hex-extra-2', name: 'Hex Two', deck: [{ id: SDK.Cards.Faction4.AltGeneral }, ...deck.slice(1)],
      }, true);
      const hand = session.getPlayer1().getDeck().getHand();
      const drawPile = session.getPlayer1().getDeck().getDrawPile();
      expect(hand).to.have.length(8);
      expect(drawPile).to.have.length(1);
      expect(session.getCardByIndex(drawPile[0]).getId()).to.equal(SDK.Cards.Neutral.Maw);
    });

    it('preserves empty hex hand slots when rebuilding setup data', () => {
      const session = SDK.GameSession.create();
      session.setRuleset('practice-sandbox-hex', 1);
      const deck = [{ id: SDK.Cards.Faction1.General }];
      for (let i = 0; i < 8; i++) deck.push({ id: SDK.Cards.Neutral.Maw });
      SDK.GameSetup.setupNewSession(session, { userId: 'hex-restore-1', name: 'Hex One', deck }, {
        userId: 'hex-restore-2', name: 'Hex Two', deck: [{ id: SDK.Cards.Faction4.AltGeneral }, ...deck.slice(1)],
      }, true);
      const originalHand = session.getPlayer1().getDeck().getHand();
      const spentCardIndex = originalHand[3];
      session.getPlayer1().getDeck().removeCardIndexFromHand(spentCardIndex);
      const snapshot = JSON.parse(session.serializeToJSON(session));
      const restored = SDK.GameSession.create();
      restored.deserializeSessionFromFirebase(snapshot);
      expect(restored.getPlayer1().getDeck().getHand()).to.have.length(8);
      expect(restored.getPlayer1().getDeck().getHand()[3]).to.equal(null);

      snapshot.gameSetupData.players[0].startingHand[3] = null;
      const replay = SDK.GameSession.create();
      SDK.GameSetup.setupNewSessionFromExistingSessionData(replay, snapshot);
      const restoredHand = replay.getPlayer1().getDeck().getHand();
      expect(restoredHand).to.have.length(8);
      expect(restoredHand[3]).to.equal(null);
      expect(restoredHand[4]).to.equal(snapshot.gameSetupData.players[0].startingHand[4].index);
    });

    it('rejects new-rules mulligan and replacement while preserving fixed slots', () => {
      const session = SDK.GameSession.create();
      session.setIsRunningAsAuthoritative(true);
      session.setRuleset('practice-sandbox-hex', 1);
      const deck = [{ id: SDK.Cards.Faction1.General }];
      for (let i = 0; i < 8; i++) deck.push({ id: SDK.Cards.Neutral.Maw });
      SDK.GameSetup.setupNewSession(session, { userId: 'hex-start-1', name: 'Hex One', deck }, {
        userId: 'hex-start-2', name: 'Hex Two', deck: [{ id: SDK.Cards.Faction4.AltGeneral }, ...deck.slice(1)],
      }, true);
      const player = session.getPlayer1();
      const deckBefore = player.getDeck().getHand().slice();
      const mulligan = player.actionDrawStartingHand([0]);
      session.executeAction(mulligan);
      expect(mulligan.getIsValid()).to.equal(false);
      expect(player.getDeck().getHand()).to.deep.equal(deckBefore);

      const confirmation = player.actionDrawStartingHand([]);
      session.executeAction(confirmation);
      expect(confirmation.getIsValid()).to.equal(true);
      player.setHasStartingHand(true);
      session.getPlayer2().setHasStartingHand(true);
      session.setStatus(SDK.GameStatus.active);
      const replace = player.actionReplaceCardFromHand(0);
      session.executeAction(replace);
      expect(replace.getIsValid()).to.equal(false);
      expect(player.getDeck().getHand()).to.deep.equal(deckBefore);

      const forcedReplace = player.actionReplaceCardFromHand(1);
      forcedReplace.forcedReplace = true;
      session.executeAction(forcedReplace);
      expect(forcedReplace.getIsValid()).to.equal(false);
      expect(player.getDeck().getHand()).to.deep.equal(deckBefore);
    });

    it('does not draw, add, return, or replace cards after hex setup', () => {
      const session = SDK.GameSession.create();
      session.setIsRunningAsAuthoritative(true);
      session.setRuleset('practice-sandbox-hex', 1);
      const deck = [{ id: SDK.Cards.Faction1.General }];
      for (let i = 0; i < 8; i++) deck.push({ id: SDK.Cards.Neutral.Maw });
      SDK.GameSetup.setupNewSession(session, { userId: 'hex-guard-1', name: 'Hex One', deck }, {
        userId: 'hex-guard-2', name: 'Hex Two', deck: [{ id: SDK.Cards.Faction4.AltGeneral }, ...deck.slice(1)],
      }, true);
      const player = session.getPlayer1();
      const playerDeck = player.getDeck();
      player.setHasStartingHand(true);
      session.getPlayer2().setHasStartingHand(true);
      session.setStatus(SDK.GameStatus.active);

      // Leave an empty slot and a card in the draw pile to exercise both
      // automatic refill generation and direct draw execution.
      const drawnCard = playerDeck.getCardIndexInHandAtIndex(0);
      playerDeck.removeCardIndexFromHand(drawnCard);
      session.applyCardToDeck(playerDeck, drawnCard, session.getCardByIndex(drawnCard));
      const handBefore = playerDeck.getHand().slice();
      const drawPileBefore = playerDeck.getDrawPile().slice();
      const resolvedMutationEvents = [];
      const originalPushBufferableEvent = session.pushBufferableEvent;
      session.pushBufferableEvent = function (event) {
        if (event.type === EVENTS.action || event.type === EVENTS.after_action) resolvedMutationEvents.push(event.type);
        return originalPushBufferableEvent.apply(this, arguments);
      };
      expect(playerDeck.actionsDrawCardsToRefillHand()).to.deep.equal([]);
      expect(playerDeck.actionsDrawNewCards()).to.deep.equal([]);

      const draw = playerDeck.actionDrawCard();
      session.executeAction(draw);
      expect(draw.getIsValid()).to.equal(false);
      expect(playerDeck.getHand()).to.deep.equal(handBefore);
      expect(playerDeck.getDrawPile()).to.deep.equal(drawPileBefore);

      const add = new SDK.PutCardInHandAction(session, player.getPlayerId(), { id: SDK.Cards.Faction1.SilverguardSquire });
      session.executeAction(add);
      expect(add.getIsValid()).to.equal(false);
      expect(playerDeck.getHand()).to.deep.equal(handBefore);
      expect(playerDeck.getDrawPile()).to.deep.equal(drawPileBefore);

      // Return-to-hand effects use the same insertion action with an existing
      // card instance; they must not refill the spent slot either.
      const returnToHand = new SDK.PutCardInHandAction(session, player.getPlayerId(), handBefore[1]);
      session.executeAction(returnToHand);
      expect(returnToHand.getIsValid()).to.equal(false);
      expect(playerDeck.getHand()).to.deep.equal(handBefore);

      // Exercise forced replacement even with the configurable validator list
      // removed; the fixed-hand rule is enforced by shared action validation.
      const validatorsBefore = session.getValidators();
      session.setValidators([]);
      const replace = player.actionReplaceCardFromHand(1);
      replace.forcedReplace = true;
      session.executeAction(replace);
      session.setValidators(validatorsBefore);
      expect(replace.getIsValid()).to.equal(false);
      expect(playerDeck.getHand()).to.deep.equal(handBefore);
      expect(playerDeck.getDrawPile()).to.deep.equal(drawPileBefore);

      const returnToDeck = new SDK.PutCardInDeckAction(session, player.getPlayerId(), handBefore[1]);
      session.executeAction(returnToDeck);
      expect(returnToDeck.getIsValid()).to.equal(false);
      expect(playerDeck.getHand()).to.deep.equal(handBefore);
      expect(playerDeck.getDrawPile()).to.deep.equal(drawPileBefore);

      for (let i = 0; i < playerDeck.getHand().length; i++) {
        const cardIndex = playerDeck.getCardIndexInHandAtIndex(i);
        if (cardIndex != null) playerDeck.removeCardIndexFromHand(cardIndex);
      }
      const emptyHandBefore = playerDeck.getHand().slice();
      playerDeck.setDrawPile([]);
      const healthBefore = session.getGeneralForPlayerId(player.getPlayerId()).getHP();
      const emptyDeckDraw = playerDeck.actionDrawCard();
      session.executeAction(emptyDeckDraw);
      expect(emptyDeckDraw.getIsValid()).to.equal(false);
      expect(session.getGeneralForPlayerId(player.getPlayerId()).getHP()).to.equal(healthBefore);
      expect(playerDeck.getHand()).to.deep.equal(emptyHandBefore);
      expect(playerDeck.getDrawPile()).to.deep.equal([]);
      expect(resolvedMutationEvents).to.deep.equal([]);
      session.pushBufferableEvent = originalPushBufferableEvent;
    });

    it('ends a hex turn without refilling or fatigue while still advancing the turn', () => {
      const session = SDK.GameSession.create();
      session.setIsRunningAsAuthoritative(true);
      session.setRuleset('practice-sandbox-hex', 1);
      const deck = [{ id: SDK.Cards.Faction1.General }];
      for (let i = 0; i < 8; i++) deck.push({ id: SDK.Cards.Neutral.Maw });
      SDK.GameSetup.setupNewSession(session, { userId: 'hex-turn-1', name: 'Hex One', deck }, {
        userId: 'hex-turn-2', name: 'Hex Two', deck: [{ id: SDK.Cards.Faction4.AltGeneral }, ...deck.slice(1)],
      }, true);
      const player = session.getCurrentPlayer();
      player.setHasStartingHand(true);
      session.getPlayer2().setHasStartingHand(true);
      session.setStatus(SDK.GameStatus.active);
      const playerDeck = player.getDeck();
      const cardToLeaveInDeck = playerDeck.getCardIndexInHandAtIndex(0);
      playerDeck.removeCardIndexFromHand(cardToLeaveInDeck);
      session.applyCardToDeck(playerDeck, cardToLeaveInDeck, session.getCardByIndex(cardToLeaveInDeck));
      // Spend the remaining slots so turn progression is also covered when
      // the fixed hand is completely empty.
      for (let i = 0; i < playerDeck.getHand().length; i++) {
        const cardIndex = playerDeck.getCardIndexInHandAtIndex(i);
        if (cardIndex != null) playerDeck.removeCardIndexFromHand(cardIndex);
      }
      const handBefore = playerDeck.getHand().slice();
      const drawPileBefore = playerDeck.getDrawPile().slice();
      const healthBefore = session.getGeneralForPlayerId(player.getPlayerId()).getHP();
      const turnsBefore = session.getNumberOfTurns();
      const reserveBefore = player.getReserveMana();
      const maximumManaBefore = player.getMaximumMana();

      session.executeAction(session.actionEndTurn());

      expect(session.getNumberOfTurns()).to.be.greaterThan(turnsBefore);
      expect(playerDeck.getHand()).to.deep.equal(handBefore);
      expect(playerDeck.getDrawPile()).to.deep.equal(drawPileBefore);
      expect(session.getGeneralForPlayerId(player.getPlayerId()).getHP()).to.equal(healthBefore);
      expect(player.getMaximumMana()).to.equal(maximumManaBefore + Math.min(3, reserveBefore));

      const snapshot = JSON.parse(session.serializeToJSON(session));
      const restored = SDK.GameSession.create();
      restored.deserializeSessionFromFirebase(snapshot);
      expect(restored.getRulesetId()).to.equal('practice-sandbox-hex');
      expect(restored.getPlayerById(player.getPlayerId()).getDeck().getHand()).to.deep.equal(handBefore);
      expect(restored.getPlayerById(player.getPlayerId()).getDeck().getDrawPile()).to.deep.equal(drawPileBefore);
      expect(restored.getPlayerById(player.getPlayerId()).getMaximumMana()).to.equal(player.getMaximumMana());
    });

    it('rejects a hex play when its slot no longer contains the selected card instance', () => {
      const session = SDK.GameSession.create();
      session.setIsRunningAsAuthoritative(false);
      session.setRuleset('practice-sandbox-hex', 1);
      const deck = [{ id: SDK.Cards.Faction1.General }];
      for (let i = 0; i < 8; i++) deck.push({ id: SDK.Cards.Neutral.Maw });
      SDK.GameSetup.setupNewSession(session, { userId: 'hex-stale-1', name: 'Hex One', deck }, {
        userId: 'hex-stale-2', name: 'Hex Two', deck: [{ id: SDK.Cards.Faction4.AltGeneral }, ...deck.slice(1)],
      }, true);
      const player = session.getPlayer1();
      player.setHasStartingHand(true);
      session.getPlayer2().setHasStartingHand(true);
      session.setStatus(SDK.GameStatus.active);
      const card = player.getDeck().getCardInHandAtIndex(0);
      const target = card.getValidTargetPositions()[0];
      const action = player.actionPlayCardFromHand(0, target);
      const actionData = JSON.parse(session.serializeToJSON(action));
      const originalIndex = player.getDeck().getCardIndexInHandAtIndex(0);
      const nextIndex = player.getDeck().getCardIndexInHandAtIndex(1);
      player.getDeck().getHand()[0] = nextIndex;
      player.getDeck().flushCachedCardsInHand();
      session.setIsRunningAsAuthoritative(true);
      const receivedAction = session.deserializeActionFromFirebase(actionData);
      session.executeAction(receivedAction);
      expect(receivedAction.expectedHandCardIndex).to.equal(originalIndex);
      expect(receivedAction.getIsValid()).to.equal(false);
      expect(player.getDeck().getCardIndexInHandAtIndex(0)).to.equal(nextIndex);
    });

    it('clears only the played hex slot and rejects a later play from that empty slot', () => {
      const session = SDK.GameSession.create();
      session.setIsRunningAsAuthoritative(true);
      session.setRuleset('practice-sandbox-hex', 1);
      const deck = [{ id: SDK.Cards.Faction1.General }];
      for (let i = 0; i < 8; i++) deck.push({ id: SDK.Cards.Neutral.Maw });
      SDK.GameSetup.setupNewSession(session, { userId: 'hex-play-1', name: 'Hex One', deck }, {
        userId: 'hex-play-2', name: 'Hex Two', deck: [{ id: SDK.Cards.Faction4.AltGeneral }, ...deck.slice(1)],
      }, true);
      const player = session.getPlayer1();
      player.setHasStartingHand(true);
      session.getPlayer2().setHasStartingHand(true);
      session.setStatus(SDK.GameStatus.active);
      const deckHand = player.getDeck().getHand();
      const before = deckHand.slice();
      const card = player.getDeck().getCardInHandAtIndex(0);
      const target = card.getValidTargetPositions()[0];
      const action = player.actionPlayCardFromHand(0, target);
      session.executeAction(action);
      expect(action.getIsValid()).to.equal(true);
      expect(deckHand[0]).to.equal(null);
      for (let index = 1; index < before.length; index++) {
        expect(deckHand[index]).to.equal(before[index]);
      }

      const emptySlotAction = player.actionPlayCardFromHand(0, target);
      session.executeAction(emptySlotAction);
      expect(emptySlotAction.getIsValid()).to.equal(false);
      expect(deckHand[0]).to.equal(null);
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
