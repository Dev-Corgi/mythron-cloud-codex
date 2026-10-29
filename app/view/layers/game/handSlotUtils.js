const HEX_HAND_SIZE = 8;

function getHandSlotCount(rulesetId, legacyHandSize) {
  return rulesetId === 'practice-sandbox-hex' ? HEX_HAND_SIZE : legacyHandSize;
}

function getHandSlotBindings(hand) {
  const slots = [];
  for (let index = 0; index < hand.length; index++) {
    slots.push({ handIndex: index, cardIndex: hand[index] == null ? null : hand[index] });
  }
  return slots;
}

function bindHandSlots(hand, cardNodes, bindCardNodeAtIndex) {
  const slots = getHandSlotBindings(hand);
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (cardNodes[slot.handIndex]) bindCardNodeAtIndex(slot.handIndex, slot.cardIndex);
  }
}

module.exports = { getHandSlotCount, getHandSlotBindings, bindHandSlots };
