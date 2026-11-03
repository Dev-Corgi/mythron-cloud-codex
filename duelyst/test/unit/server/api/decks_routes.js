const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const express = require('express');
const request = require('supertest');
const sinon = require('sinon');
const { expect } = require('chai');
const decksRouter = require('../../../../server/routes/api/me/decks.coffee');
const DecksModule = require('../../../../server/lib/data_access/decks.coffee');

describe('/api/me/decks purpose validation', () => {
  let app;
  let addDeckStub;
  let updateDeckStub;
  let decksForUserStub;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { d: { id: 'unit-test-user' } };
      next();
    });
    app.use('/api/me/decks', decksRouter);
    addDeckStub = sinon.stub(DecksModule, 'addDeck').returns(Promise.resolve({}));
    updateDeckStub = sinon.stub(DecksModule, 'updateDeck').returns(Promise.resolve({}));
    decksForUserStub = sinon.stub(DecksModule, 'decksForUser').returns(Promise.resolve([]));
  });

  afterEach(() => {
    if (addDeckStub && addDeckStub.restore) addDeckStub.restore();
    if (updateDeckStub && updateDeckStub.restore) updateDeckStub.restore();
    if (decksForUserStub && decksForUserStub.restore) decksForUserStub.restore();
  });

  function deckInput(purpose, ids) {
    return {
      name: 'Invalid deck',
      purpose,
      cards: ids.map((id) => ({ id })),
      faction_id: 1,
      spell_count: 0,
      minion_count: 8,
      artifact_count: 0,
      color_code: 0,
    };
  }

  it('rejects an invalid Practice deck on POST before persistence', async () => {
    const ids = [1, 10979, 10979, 10979, 10979, 19052, 19038, 10205, 10001];
    await new Promise((resolve, reject) => request(app).post('/api/me/decks')
      .send(deckInput('practice', ids)).expect(400).end((error) => error ? reject(error) : resolve()));
    expect(addDeckStub.called).to.equal(false);
  });

  it('rejects an invalid Sandbox deck on PUT before persistence', async () => {
    const ids = [23, 10979, 19052, 19038, 10205, 10001, 19051, 10954, 10980];
    await new Promise((resolve, reject) => request(app).put('/api/me/decks/deck-id')
      .send(deckInput('sandbox', ids)).expect(400).end((error) => error ? reject(error) : resolve()));
    expect(updateDeckStub.called).to.equal(false);
  });

  it('normalizes an old row with no purpose to legacy without changing its IDs', async () => {
    const ids = [1, 10979, 19052, 19038, 10205, 10001, 19051, 10954, 10206];
    decksForUserStub.returns(Promise.resolve([{ id: 'old-deck', purpose: null, cards: ids }]));
    const response = await new Promise((resolve, reject) => request(app).get('/api/me/decks').expect(200).end((error, result) => error ? reject(error) : resolve(result)));
    expect(response.body[0].purpose).to.equal('legacy');
    expect(response.body[0].cards.map((card) => card.id)).to.deep.equal(ids);
  });
});
