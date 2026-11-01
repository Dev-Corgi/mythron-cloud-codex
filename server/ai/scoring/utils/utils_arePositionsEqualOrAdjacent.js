/**
 * Returns whether two positions are equal or adjacent.
 * @param {Vec2} positionA
 * @param {Vec2} positionB
 * @returns {Boolean}
 */
const arePositionsEqualOrAdjacent = function (positionA, positionB) {
  if (Number.isInteger(positionA.q) && Number.isInteger(positionA.r)
    && Number.isInteger(positionB.q) && Number.isInteger(positionB.r)) {
    const dq = positionA.q - positionB.q;
    const dr = positionA.r - positionB.r;
    return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) <= 1;
  }
  return Math.abs(positionA.x - positionB.x) <= 1 && Math.abs(positionA.y - positionB.y) <= 1;
};

module.exports = arePositionsEqualOrAdjacent;
