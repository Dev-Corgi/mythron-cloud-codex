const { expect } = require('chai');
const uniqueCardModels = require('../../../app/ui/views2/collection/uniqueCardModels');

describe('unique collection card models', () => {
  const model = (id, name) => ({ get: (key) => (key === 'id' ? id : name) });

  it('keeps only the first occurrence of a repeated card id', () => {
    const first = model(50001, 'Phobies Ion');
    const duplicate = model(50001, 'Phobies Ion duplicate');
    const other = model(50002, 'Phobies Numbskull');
    expect(uniqueCardModels([first, duplicate, other])).to.deep.equal([first, other]);
  });

  it('preserves distinct variants and ignores entries without a card id', () => {
    const base = model(50001, 'Phobies Ion');
    const prismatic = model(5000101, 'Prismatic Phobies Ion');
    expect(uniqueCardModels([null, {}, base, prismatic])).to.deep.equal([base, prismatic]);
  });
});
