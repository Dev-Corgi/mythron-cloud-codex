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

  function deckContext() {
    return {
      getPurpose: () => 'practice',
      get: (key) => ({ isStarter: true, cards: [], faction_id: 1 })[key],
      _cardModels: { get: () => null, add: () => {}, remove: () => {} },
      hasGeneral: () => true,
      getCountForCardId: () => 0,
      getCountForBaseCardId: () => 0,
    };
  }

  it('accepts Phobies IDs and rejects the former neutral roster through DeckModel', () => {
    expect(DeckModel.prototype.changeCardModel.call(deckContext(), card(50001), 1)).to.equal(true);
    expect(DeckModel.prototype.changeCardModel.call(deckContext(), card(50003), 1)).to.equal(true);
    expect(DeckModel.prototype.changeCardModel.call(deckContext(), card(10979), 1)).to.equal(false);
    expect(DeckModel.prototype.changeCardModel.call(deckContext(), card(10019), 1)).to.equal(false);
  });
});
