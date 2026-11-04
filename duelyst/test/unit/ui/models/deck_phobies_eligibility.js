const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../..'));
require('coffeescript/register');
global.Backbone = require('backbone');
global._ = require('underscore');

['app/ui/managers/game_data_manager', 'app/ui/managers/progression_manager', 'app/ui/collections/cards'].forEach((name) => {
  const filename = require.resolve(name);
  require.cache[filename] = {
    id: filename,
    filename,
    loaded: true,
    exports() {},
  };
});

const { expect } = require('chai');
const DeckModel = require('../../../../app/ui/models/deck');

describe('Practice/Sandbox DeckModel Phobies eligibility', () => {
  function card(id) {
    const attributes = {
      id,
      factionId: 1,
      isGeneral: false,
      isNeutral: true,
      deckCount: 0,
      inventoryCount: 1,
    };
    return {
      get: (key) => attributes[key],
      set: (key, value) => { attributes[key] = value; },
      clone: () => card(id),
    };
  }

  function deckContext(purpose = 'practice') {
    return {
      getPurpose: () => purpose,
      get: (key) => ({ isStarter: true, cards: [], faction_id: 1 })[key],
      _cardModels: { get: () => null, add: () => {}, remove: () => {} },
      hasGeneral: () => true,
      getCountForCardId: () => 0,
      getCountForBaseCardId: () => 0,
    };
  }

  it('accepts Phobies IDs and rejects the former neutral roster through DeckModel', () => {
    for (const purpose of ['practice', 'sandbox']) {
      for (let id = 50001; id <= 50035; id += 1) {
        expect(DeckModel.prototype.changeCardModel.call(deckContext(purpose), card(id), 1), `${purpose} deck choice ${id}`).to.equal(true);
      }
    }
    expect(DeckModel.prototype.changeCardModel.call(deckContext(), card(10979), 1)).to.equal(false);
    expect(DeckModel.prototype.changeCardModel.call(deckContext(), card(10019), 1)).to.equal(false);
  });
});
