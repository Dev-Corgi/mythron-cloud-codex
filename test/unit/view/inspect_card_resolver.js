const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const { expect } = require('chai');
const { getRelatedInspectCardId } = require('../../../app/view/layers/game/InspectCardResolver');

describe('inspect related card resolver', () => {
  const referencedCard = { id: 700 };
  const card = (activeAbility, reference = referencedCard) => ({
    activeAbility,
    getReferencedCardData: () => reference,
  });

  it('selects the active ability effect card in Practice/Sandbox v2', () => {
    expect(getRelatedInspectCardId(card({ effectCardId: 701 }), 'practice-sandbox-hex', 2)).to.equal(701);
  });

  it('leaves the related position clear for an invalid active ability effect ID', () => {
    expect(getRelatedInspectCardId(card({}), 'practice-sandbox-hex', 2)).to.equal(null);
    expect(getRelatedInspectCardId(card({ effectCardId: -1 }), 'practice-sandbox-hex', 2)).to.equal(null);
    expect(getRelatedInspectCardId(card({ effectCardId: 1.5 }), 'practice-sandbox-hex', 2)).to.equal(null);
    expect(getRelatedInspectCardId(card({ effectCardId: Infinity }), 'practice-sandbox-hex', 2)).to.equal(null);
    expect(getRelatedInspectCardId(card({ effectCardId: NaN }), 'practice-sandbox-hex', 2)).to.equal(null);
  });

  it('preserves referenced cards when there is no active ability', () => {
    expect(getRelatedInspectCardId(card(null), 'practice-sandbox-hex', 2)).to.equal(700);
    expect(getRelatedInspectCardId(card(null, null), 'practice-sandbox-hex', 2)).to.equal(null);
  });

  it('does not show active ability cards outside Practice/Sandbox v2', () => {
    const unit = card({ effectCardId: 701 }, null);
    expect(getRelatedInspectCardId(unit, 'practice-sandbox-hex', 1)).to.equal(null);
    expect(getRelatedInspectCardId(unit, 'ranked', 1)).to.equal(null);
  });

  it('keeps ordinary referenced-card behavior in legacy modes', () => {
    expect(getRelatedInspectCardId(card({ effectCardId: 701 }), 'ranked', 1)).to.equal(700);
  });
});
