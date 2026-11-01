const distance = require('./utils_distanceBetweenBoardPositions');

const isHex = (session) => session.getRulesetId() === 'practice-sandbox-hex';
const column = (session, position) => isHex(session)
  ? session.getBoard().getHexRenderedColumn(position) : position.x;
const row = (session, position) => isHex(session) ? position.r : position.y;
const rowUnits = (session, position, type) => isHex(session)
  ? session.getBoard().getUnits().filter((unit) => unit.getPosition().r === position.r)
  : session.getBoard().getEntitiesInRow(position.y, type);
const columnEntities = (session, position) => isHex(session)
  ? session.getBoard().getEntities().filter((unit) => column(session, unit.getPosition()) === column(session, position))
  : session.getBoard().getEntitiesInColumn(position.x);
const maxDistance = (session, legacyMaximum) => {
  if (!isHex(session)) return legacyMaximum;
  const positions = session.getBoard().getPositions();
  let maximum = 0;
  for (const a of positions) for (const b of positions) maximum = Math.max(maximum, distance(a, b));
  return maximum;
};
const distanceFromColumn = (session, position, target) => {
  if (!isHex(session)) return distance({ x: position.x, y: target.y }, target);
  const targetColumn = column(session, target);
  return Math.min(...session.getBoard().getPositions()
    .filter((cell) => column(session, cell) === targetColumn)
    .map((cell) => distance(position, cell)));
};
module.exports = { isHex, column, row, rowUnits, columnEntities, maxDistance, distanceFromColumn };
