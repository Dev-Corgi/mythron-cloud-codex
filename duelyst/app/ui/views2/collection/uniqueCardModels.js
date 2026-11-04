'use strict';

/** Keeps the first model for each card id, preserving the collection order. */
function uniqueCardModels(cards) {
  const seenIds = Object.create(null);
  return (cards || []).filter((cardModel) => {
    const id = cardModel && typeof cardModel.get === 'function' ? cardModel.get('id') : null;
    if (id == null || seenIds[id]) return false;
    seenIds[id] = true;
    return true;
  });
}

module.exports = uniqueCardModels;
