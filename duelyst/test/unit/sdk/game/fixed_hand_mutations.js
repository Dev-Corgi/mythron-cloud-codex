const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');
const { expect } = require('chai');
const SDK = require('../../../../app/sdk.coffee');
const Eligibility = require('../../../../app/sdk/rulesets/cardEligibility.coffee');
const Logger = require('../../../../app/common/logger.coffee');

Logger.enabled = false;

describe('fixed hand direct mutation boundaries', () => {
  function createSession(hex = true) {
    const session = SDK.GameSession.create();
    session.setIsRunningAsAuthoritative(true);
    if (hex) session.setRuleset('practice-sandbox-hex', 1);
    const cards = Eligibility.getPracticeBotRoster().map((id) => ({ id }));
    SDK.GameSetup.setupNewSession(session, {
      userId: 'guard-one', name: 'One', deck: [{ id: 1 }, ...cards],
    }, {
      userId: 'guard-two', name: 'Two', deck: [{ id: 23 }, ...cards],
    }, true);
    return session;
  }

  afterEach(() => SDK.GameSession.reset());

  it('rejects session and raw insertions after setup before any indexing, relocation, data, or event side effect', () => {
    const session = createSession();
    const deck = session.getPlayer1().getDeck();
    const existing = deck.getCardInHandAtIndex(0);
    const spent = deck.getCardIndexInHandAtIndex(3);
    deck.removeCardIndexFromHand(spent);
    const extra = session.createCardForIdentifier(SDK.Cards.Neutral.GolemMetallurgist);
    extra.setOwnerId(session.getPlayer1Id());
    const before = session.serializeToJSON(session);
    const extraBefore = session.serializeToJSON(extra);
    let pushes = 0;
    const originalPush = session.pushBufferableEvent;
    session.pushBufferableEvent = function (...args) { pushes += 1; return originalPush.apply(this, args); };
    session.applyCardToHand(deck, { id: extra.getId(), damage: 99 }, extra, 3);
    session.applyCardToDeck(deck, { id: extra.getId(), damage: 99 }, extra);
    session.applyCardToDeck(deck, existing.getIndex(), existing);
    session.applyCardToHand(deck, spent, session.getCardByIndex(spent), 3);
    deck.putCardIndexInHand(spent);
    deck.putCardIndexInHandAtIndex(spent, 3);
    deck.putCardIndexIntoDeck(existing.getIndex());
    expect(session.serializeToJSON(session)).to.equal(before);
    expect(session.serializeToJSON(extra)).to.equal(extraBefore);
    expect(pushes).to.equal(0);
    expect(deck.getHand()[3]).to.equal(null);
  });

  it('does not serialize initialization permission and restores snapshot and replay hand gaps', () => {
    const session = createSession();
    expect(session._private.initializingFixedDeck).to.equal(undefined);
    const deck = session.getPlayer1().getDeck();
    deck.removeCardIndexFromHand(deck.getCardIndexInHandAtIndex(3));
    const json = session.serializeToJSON(session);
    expect(json).not.to.contain('initializingFixedDeck');
    const snapshot = JSON.parse(json);
    const restored = SDK.GameSession.create();
    restored.deserializeSessionFromFirebase(snapshot);
    expect(restored.getPlayer1().getDeck().getHand()).to.deep.equal(deck.getHand());
    snapshot.gameSetupData.players[0].startingHand[3] = null;
    const replay = SDK.GameSession.create();
    SDK.GameSetup.setupNewSessionFromExistingSessionData(replay, snapshot);
    expect(replay.getPlayer1().getDeck().getHand()[3]).to.equal(null);
    expect(replay.getPlayer1().getDeck().getHand()).to.have.length(8);
    expect(replay._private.initializingFixedDeck).to.equal(undefined);
  });

  for (const method of ['addCardsToDeck', 'addCardsToDeckFromData']) {
    it(`cleans initialization permission when ${method} throws`, () => {
      const session = createSession();
      const original = session.getExistingCardFromIndexOrCreateCardFromData;
      session.getExistingCardFromIndexOrCreateCardFromData = () => { throw new Error('fixture failure'); };
      try {
        const invoke = method === 'addCardsToDeck'
          ? () => SDK.GameSetup[method](session, session.getPlayer1(), {}, [{ id: 1 }, { id: 10979 }])
          : () => SDK.GameSetup[method](session, session.getPlayer1(), { startingDrawPile: [{ id: 10979 }], startingHand: [] });
        expect(invoke).to.throw('fixture failure');
      } finally { session.getExistingCardFromIndexOrCreateCardFromData = original; }
      expect(session._private.initializingFixedDeck).to.equal(undefined);
      const deck = session.getPlayer1().getDeck();
      const before = deck.getDrawPile().slice();
      deck.putCardIndexIntoDeck(deck.getHand()[0]);
      expect(deck.getDrawPile()).to.deep.equal(before);
    });
  }

  it('keeps legacy session and raw insertion behavior', () => {
    const session = createSession(false);
    const deck = session.getPlayer1().getDeck();
    const card = session.createCardForIdentifier(SDK.Cards.Neutral.GolemMetallurgist);
    card.setOwnerId(session.getPlayer1Id());
    session.applyCardToDeck(deck, null, card);
    expect(deck.getDrawPile()).to.include(card.getIndex());
    deck.removeCardIndexFromDeck(card.getIndex());
    const empty = deck.getHand().findIndex((index) => index == null);
    session.applyCardToHand(deck, null, card, empty);
    expect(deck.getHand()[empty]).to.equal(card.getIndex());
    deck.removeCardIndexFromHand(card.getIndex());
    deck.putCardIndexInHandAtIndex(card.getIndex(), empty);
    expect(deck.getHand()[empty]).to.equal(card.getIndex());
    deck.putCardIndexIntoDeck(999);
    expect(deck.getDrawPile()).to.include(999);
  });
});
