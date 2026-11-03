const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');
const express = require('express');
const request = require('supertest');
const sinon = require('sinon');
const { expect } = require('chai');
const Bluebird = require('bluebird');
const Decks = require('../../../../server/lib/data_access/decks.coffee');
const Users = require('../../../../server/lib/data_access/users.coffee');
const config = require('../../../../config/config');
const SDK = require('../../../../app/sdk.coffee');
const Eligibility = require('../../../../app/sdk/rulesets/cardEligibility.coffee');

const ids = [1, 50003, 50004, 50006, 50007, 50008, 50022, 50023, 50028];
const cards = ids.map((id) => ({ id }));

// Replace only the route's construction/database boundaries; keep its real
// validation and ownership checks, without Firebase or database credentials.
const creatorPath = require.resolve('../../../../server/lib/create_single_player_game.coffee');
const knexPath = require.resolve('../../../../server/lib/data_access/knex.coffee');
require('../../../../server/lib/create_single_player_game.coffee');

const originalCreator = require.cache[creatorPath].exports;
const originalKnex = require.cache[knexPath].exports;
let createGame;
require.cache[creatorPath].exports = (...args) => createGame(...args);
require.cache[knexPath].exports = () => ({ where: () => ({ first: () => Bluebird.resolve({ win_count: 5 }) }) });
const router = require('../../../../server/routes/api/me/games.coffee');

require.cache[creatorPath].exports = originalCreator;
require.cache[knexPath].exports = originalKnex;

describe('Practice and Sandbox entry', () => {
  describe('Practice saved-deck HTTP entry', () => {
    let app;
    let lookup;
    let availability;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use((req, res, next) => { req.user = { d: { id: 'entry-user' } }; next(); });
      app.use('/api/me/games', router);
      lookup = sinon.stub(Decks, 'deckForUser').returns(Bluebird.resolve({ id: 'saved', purpose: 'practice', cards: ids }));
      availability = sinon.stub(Users, 'isAllowedToUseDeck').returns(Bluebird.resolve(true));
      createGame = sinon.stub().returns(Bluebird.resolve({ game_id: 'created' }));
    });

    afterEach(() => { lookup.restore(); availability.restore(); });
    function post(body, status) {
      return new Promise((resolve, reject) => {
        request(app).post('/api/me/games/single_player').send(body).expect(status)
          .end((error, response) => (error ? reject(error) : resolve(response)));
      });
    }

    it('uses authenticated owner and saved cards, ignoring forged purpose and submitted cards', async () => {
      await post({
        deck_id: 'saved', deck: [{ id: 2 }], purpose: 'sandbox', ai_general_id: 23, ai_difficulty: 0.8,
      }, 200);
      expect(lookup.calledWith('entry-user', 'saved')).to.equal(true);
      expect(availability.firstCall.args[1]).to.deep.equal(cards);
      expect(availability.firstCall.args[5].purpose).to.equal('practice');
      expect(createGame.firstCall.args[3]).to.deep.equal(cards);
    });

    it('accepts the Phobies roster from a saved v2 Practice deck', async () => {
      const phobiesIds = [1, ...Array.from({ length: 8 }, (_, index) => 50001 + index)];
      lookup.returns(Bluebird.resolve({ id: 'saved', purpose: 'practice', cards: phobiesIds }));
      await post({ deck_id: 'saved', ai_general_id: 23 }, 200);
      expect(availability.firstCall.args[1]).to.deep.equal(phobiesIds.map((id) => ({ id })));
      expect(createGame.called).to.equal(true);
    });
    ['sandbox', 'legacy', null, 'unknown'].forEach((purpose) => {
      it(`rejects saved purpose ${purpose} before availability or setup`, async () => {
        lookup.returns(Bluebird.resolve({ id: 'saved', purpose, cards: ids }));
        await post({
          deck_id: 'saved', purpose: 'practice', deck: cards, ai_general_id: 23,
        }, 400);
        expect(availability.called).to.equal(false);
        expect(createGame.called).to.equal(false);
      });
    });
    [undefined, { id: 'saved', purpose: 'practice', cards: ids.slice(1) }, { id: 'saved', purpose: 'practice', cards: [2, ...ids.slice(1)] }, { id: 'saved', purpose: 'practice', cards: [1, 10980, ...ids.slice(2)] }].forEach((invalid) => {
      it('rejects missing, incomplete, or unaudited saved records before setup', async () => {
        lookup.returns(Bluebird.resolve(invalid));
        await post({ deck_id: 'saved', ai_general_id: 23 }, 400);
        expect(availability.called).to.equal(false);
        expect(createGame.called).to.equal(false);
      });
    });

    it('rejects card-array-only requests', async () => {
      await post({ deck: cards, ai_general_id: 23 }, 400);
      expect(lookup.called).to.equal(false);
    });
  });

  describe('Practice validation before global availability bypass', () => {
    let get;

    beforeEach(() => {
      const originalGet = config.get.bind(config);
      get = sinon.stub(config, 'get', (key) => (key === 'allCardsAvailable' ? true : originalGet(key)));
    });

    afterEach(() => get.restore());

    it('accepts a valid saved practice deck', async () => {
      expect(await Users.isAllowedToUseDeck('entry-user', cards, SDK.GameType.SinglePlayer, null, false, { id: 'saved', purpose: 'practice', cards: ids })).to.equal(true);
    });

    it('accepts Phobies IDs for Practice before the global availability bypass', async () => {
      const phobiesIds = [1, ...Array.from({ length: 8 }, (_, index) => 50001 + index)];
      const phobiesCards = phobiesIds.map((id) => ({ id }));
      expect(await Users.isAllowedToUseDeck('entry-user', phobiesCards, SDK.GameType.SinglePlayer, null, false, { id: 'saved', purpose: 'practice', cards: phobiesIds })).to.equal(true);
    });

    it('rejects invalid purpose and excluded cards even when all cards are available', async () => {
      await Promise.all([{ id: 'saved', purpose: 'sandbox', cards: ids }, { id: 'saved', purpose: 'practice', cards: [1, 10980, ...ids.slice(2)] }, null].map(async (saved) => {
        let error;
        try { await Users.isAllowedToUseDeck('entry-user', cards, SDK.GameType.SinglePlayer, null, false, saved); } catch (failure) { error = failure; }
        expect(error).to.be.instanceOf(Error);
      }));
    });

    it('retains the legacy availability bypass', async () => {
      expect(await Users.isAllowedToUseDeck('entry-user', [{ id: 2 }], SDK.GameType.BossBattle)).to.equal(true);
    });

    it('accepts a nine-card fixed-rarity Practice deck when global availability is disabled', async () => {
      get.restore();
      const originalGet = config.get.bind(config);
      get = sinon.stub(config, 'get', (key) => (key === 'allCardsAvailable' ? false : originalGet(key)));
      const result = await Users.isAllowedToUseDeck('entry-user', cards, SDK.GameType.SinglePlayer, null, false, { id: 'saved', purpose: 'practice', cards: ids });
      expect(result).to.deep.equal([true, true]);
    });
  });

  describe('concrete Sandbox saved descriptors', () => {
    function sandbox(first, second) {
      const challenge = new SDK.Sandbox();
      challenge.setPlayer1DeckData(first);
      challenge.setPlayer2DeckData(second);
      return challenge;
    }
    const descriptor = () => ({ id: 'sandbox-deck', purpose: 'sandbox', cards: ids });

    it('starts with two saved Sandbox descriptors and numeric stored cards', () => {
      const session = SDK.GameSession.create();
      session.setUserId('sandbox-user');
      sandbox(descriptor(), descriptor()).setupSession(session);
      expect(session.getRulesetId()).to.equal('practice-sandbox-hex');
      expect(session.getPlayer1().getDeck().getHand()).to.have.length(8);
    });
    [cards, { id: 'wrong', purpose: 'practice', cards: ids }, { id: 'short', purpose: 'sandbox', cards: ids.slice(1) }, { id: 'excluded', purpose: 'sandbox', cards: [1, 10980, ...ids.slice(2)] }].forEach((invalid) => {
      it('rejects either invalid descriptor before session setup', () => {
        for (const pair of [[invalid, descriptor()], [descriptor(), invalid]]) {
          const session = SDK.GameSession.create();
          expect(() => sandbox(...pair).setupSession(session)).to.throw();
          expect(session.getRulesetId()).to.equal('legacy');
        }
      });
    });

    it('keeps Developer Sandbox raw legacy arrays', () => {
      const session = SDK.GameSession.create();
      session.setUserId('developer');
      const challenge = new SDK.SandboxDeveloper();
      challenge.setPlayer1DeckData([{ id: 1 }, { id: 10980 }]);
      challenge.setPlayer2DeckData([{ id: SDK.Cards.Faction2.General }, { id: 10980 }]);
      challenge.setupSession(session);
      expect(session.getRulesetId()).to.equal('legacy');
    });
  });

  describe('fixed Practice bot at every difficulty', () => {
    const GameManager = require('../../../../server/redis/index.coffee').GameManager;
    const Games = require('../../../../server/lib/data_access/games.coffee');
    const UsableDecks = require('../../../../server/ai/decks/usable_decks');
    let generate;
    let save;
    let record;
    let legacyDeck;
    let snapshot;

    beforeEach(() => {
      generate = sinon.stub(GameManager, 'generateGameId').returns(Bluebird.resolve('bot-game'));
      save = sinon.stub(GameManager, 'saveGameSession', (id, data) => { snapshot = JSON.parse(data); return Bluebird.resolve(); });
      record = sinon.stub(Games, 'newUserGame').returns(Bluebird.resolve());
      legacyDeck = sinon.stub(UsableDecks, 'getAutomaticUsableDeck').throws(new Error('Legacy provider must not run for Practice'));
    });

    afterEach(() => { generate.restore(); save.restore(); record.restore(); legacyDeck.restore(); });
    function start(general, difficulty) {
      return originalCreator('bot-human', 'Human', SDK.GameType.SinglePlayer, cards, null, null, 'bot', 'Bot', general, null, difficulty, 20, null, null);
    }
    Eligibility.getPracticeGeneralIds().forEach((general) => {
      [0, 0.5, 1].forEach((difficulty) => {
        it(`uses exact roster for general ${general} at difficulty ${difficulty}`, async () => {
          await start(general, difficulty);
          const bot = snapshot.gameSetupData.players.find((player) => player.userId === 'bot');
          expect(bot.deck.map((card) => card.id)).to.deep.equal([general, ...ids.slice(1)]);
          expect(bot.startingHand.filter(Boolean)).to.have.length(8);
          expect(legacyDeck.called).to.equal(false);
        });
      });
    });
    [ids.slice(1, 7), [10980, ...ids.slice(2)]].forEach((roster) => {
      it('fails closed before saving for an incomplete or ineligible roster', async () => {
        const rosterStub = sinon.stub(Eligibility, 'getPracticeBotRoster').returns(roster);
        try {
          let error;
          try { await start(1, 1); } catch (failure) { error = failure; }
          expect(error).to.be.instanceOf(Error);
          expect(save.called).to.equal(false);
        } finally { rosterStub.restore(); }
      });
    });
  });
});
