const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const { expect } = require('chai');

describe('owned Practice/Sandbox deck purge', () => {
  const knexPath = require.resolve('../../../../server/lib/data_access/knex.coffee');
  const decksPath = require.resolve('../../../../server/lib/data_access/decks.coffee');
  const inventoryPath = require.resolve('../../../../server/lib/data_access/inventory.coffee');
  const eligibilityPath = require.resolve('../../../../app/sdk/rulesets/cardEligibility.coffee');
  const cardsPath = require.resolve('../../../../app/sdk/cards/cardsLookupComplete.coffee');
  let oldKnexModule;
  let oldDecksModule;
  let oldInventoryModule;
  let oldEligibilityModule;
  let oldCardsModule;
  let calls;
  let rows;
  let Decks;

  beforeEach(() => {
    oldKnexModule = require.cache[knexPath];
    oldDecksModule = require.cache[decksPath];
    oldInventoryModule = require.cache[inventoryPath];
    oldEligibilityModule = require.cache[eligibilityPath];
    oldCardsModule = require.cache[cardsPath];
    calls = [];
    rows = [];
    const fakeKnex = (table) => {
      const query = {
        where: (...args) => { calls.push({ table, where: args.length === 1 ? args[0] : args }); return query; },
        whereIn: (column, values) => { calls.push({ table, whereIn: [column, values] }); return query; },
        select: () => Promise.resolve(rows),
        first: () => Promise.resolve(rows[0]),
        del: () => { calls.push({ table, delete: true }); return Promise.resolve(1); },
      };
      return query;
    };
    const eligibleIds = [1, ...Array.from({ length: 35 }, (_, index) => 50001 + index)];
    require.cache[eligibilityPath] = {
      id: eligibilityPath,
      filename: eligibilityPath,
      loaded: true,
      exports: {
        validateSavedDeck: (deck, purpose) => ({
          valid: ['practice', 'sandbox'].includes(purpose)
            && deck.cards.length === 9
            && deck.cards.every((cardId, index) => {
              if (index === 0) return cardId === 1;
              return eligibleIds.includes(cardId);
            }),
        }),
      },
    };
    require.cache[cardsPath] = {
      id: cardsPath,
      filename: cardsPath,
      loaded: true,
      exports: { getBaseCardId: (cardId) => cardId },
    };
    require.cache[inventoryPath] = {
      id: inventoryPath,
      filename: inventoryPath,
      loaded: true,
      exports: {},
    };
    require.cache[knexPath] = {
      id: knexPath,
      filename: knexPath,
      loaded: true,
      exports: fakeKnex,
    };
    delete require.cache[decksPath];
    Decks = require('../../../../server/lib/data_access/decks.coffee');
  });

  afterEach(() => {
    delete require.cache[decksPath];
    if (oldDecksModule) require.cache[decksPath] = oldDecksModule;
    [
      [inventoryPath, oldInventoryModule],
      [eligibilityPath, oldEligibilityModule],
      [cardsPath, oldCardsModule],
    ].forEach(([modulePath, oldModule]) => {
      if (oldModule) require.cache[modulePath] = oldModule;
      else delete require.cache[modulePath];
    });
    if (oldKnexModule) require.cache[knexPath] = oldKnexModule;
    else delete require.cache[knexPath];
  });

  function validCards() {
    return [1, ...Array.from({ length: 8 }, (_, index) => 50001 + index)];
  }

  it('purges only invalid owned mode decks and retains valid mode and legacy rows', async () => {
    rows = [
      { id: 'bad-practice', purpose: 'practice', cards: [1, 10979, ...validCards().slice(2)] },
      { id: 'good-sandbox', purpose: 'sandbox', cards: validCards() },
      { id: 'legacy', purpose: 'legacy', cards: [1, 10979] },
      { id: 'bad-sandbox', purpose: 'sandbox', cards: [1, 10019, ...validCards().slice(2)] },
    ];

    const result = await Decks.decksForUser('authenticated-owner');

    expect(result.map((deck) => deck.id)).to.deep.equal(['good-sandbox', 'legacy']);
    const deletions = calls.filter((call) => call.delete);
    expect(deletions).to.have.length(2);
    const ownership = calls.filter((call) => call.where && typeof call.where === 'object');
    expect(ownership).to.deep.include({ table: 'user_decks', where: { user_id: 'authenticated-owner', id: 'bad-practice' } });
    expect(ownership).to.deep.include({ table: 'user_decks', where: { user_id: 'authenticated-owner', id: 'bad-sandbox' } });
    expect(calls).to.deep.include({ table: 'user_decks', whereIn: ['purpose', ['practice', 'sandbox']] });
    expect(calls).to.deep.include({ table: 'user_decks', where: ['cards', rows[0].cards] });
  });

  it('purges an invalid owner-scoped entry lookup and omits it from the result', async () => {
    rows = [{ id: 'owned-invalid', purpose: 'practice', cards: [1, 10979, ...validCards().slice(2)] }];
    const result = await Decks.deckForUser('authenticated-owner', 'owned-invalid');
    expect(result).to.equal(undefined);
    expect(calls).to.deep.include({ table: 'user_decks', where: { user_id: 'authenticated-owner', id: 'owned-invalid' } });
    expect(calls.filter((call) => call.delete)).to.have.length(1);
  });
});
