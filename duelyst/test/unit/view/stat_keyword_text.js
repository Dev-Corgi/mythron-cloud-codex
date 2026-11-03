const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const { expect } = require('chai');
const { removeStatKeywordText } = require('../../../app/view/nodes/cards/statKeywordText');

describe('stat keyword text', () => {
  const stat = ['Flying', 'Phasing', 'Ranged', 'Blast'];
  const all = ['Flying', 'Ranged', 'Provoke', 'Rush'];

  it('removes a description that is only a movement keyword', () => {
    expect(removeStatKeywordText('Flying', stat, all)).to.equal('');
    expect(removeStatKeywordText('<b>Flying</b>', stat, all)).to.equal('');
  });

  it('removes stat keywords from a keyword list and keeps the others', () => {
    expect(removeStatKeywordText('<b>Provoke</b>, <b>Flying</b>', stat, all)).to.equal('<b>Provoke</b>');
    expect(removeStatKeywordText('Flying, Ranged', stat, all)).to.equal('');
  });

  it('keeps the other lines of a multi-line description', () => {
    expect(removeStatKeywordText('Flying\nWhenever this attacks, draw a card.', stat, all))
      .to.equal('Whenever this attacks, draw a card.');
  });

  it('leaves prose that merely mentions a stat keyword', () => {
    const prose = 'Your Flying minions gain +1 attack.';
    expect(removeStatKeywordText(prose, stat, all)).to.equal(prose);
  });

  it('returns descriptions without stat keywords unchanged', () => {
    expect(removeStatKeywordText('Provoke', stat, all)).to.equal('Provoke');
    expect(removeStatKeywordText('', stat, all)).to.equal('');
    expect(removeStatKeywordText('Flying', [], all)).to.equal('Flying');
  });
});
