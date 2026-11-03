const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
const { expect } = require('chai');
const HandSlotUtils = require('../../../../app/view/layers/game/handSlotUtils');

describe('fixed hand slots', () => {
  it('uses eight UI slots only for hex rules and retains the configured legacy size', () => {
    expect(HandSlotUtils.getHandSlotCount('practice-sandbox-hex', 6)).to.equal(8);
    expect(HandSlotUtils.getHandSlotCount('legacy', 6)).to.equal(6);
  });

  it('binds empty positions by their original hand index', () => {
    const hand = [101, null, 303];
    const cardNodes = [{ cardIndex: null }, { cardIndex: null }, { cardIndex: null }];
    HandSlotUtils.bindHandSlots(hand, cardNodes, (handIndex, cardIndex) => {
      cardNodes[handIndex].cardIndex = cardIndex;
    });
    expect(cardNodes.map((cardNode) => cardNode.cardIndex)).to.deep.equal([101, null, 303]);
    expect(HandSlotUtils.getHandSlotBindings(hand)).to.deep.equal([
      { handIndex: 0, cardIndex: 101 },
      { handIndex: 1, cardIndex: null },
      { handIndex: 2, cardIndex: 303 },
    ]);
  });
});
