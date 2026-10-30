// View-only adapter for the canonical axial board. SDK positions stay {q,r}.
const HexTopology = require('../../sdk/rulesets/hexTopology.coffee');
const CONFIG = require('../config');

const UtilsHexView = {};

UtilsHexView.getRenderedPosition = function (position) {
  return HexTopology.isOnBoard(position) ? HexTopology.axialToRendered(position) : null;
};

UtilsHexView.getCellKey = function (position) {
  const rendered = UtilsHexView.getRenderedPosition(position);
  return rendered ? `${rendered.c},${rendered.k}` : null;
};

UtilsHexView.getCellIndex = function (position) {
  const rendered = UtilsHexView.getRenderedPosition(position);
  return rendered ? rendered.c * 5 + rendered.k : -1;
};

UtilsHexView.getHexRadius = function () {
  return CONFIG.TILESIZE * 0.5;
};

UtilsHexView.getBoardPixelSize = function () {
  const radius = UtilsHexView.getHexRadius();
  return {
    // Five horizontal pointy-top rows: 9, 8, 9, 8, 9 cells. Include the
    // outer half-hex bounds around the centers.
    width: Math.sqrt(3) * radius * 9,
    height: radius * 8,
  };
};

UtilsHexView.positionToScreen = function (position, origin) {
  if (!HexTopology.isOnBoard(position)) return null;
  const radius = UtilsHexView.getHexRadius();
  return cc.p(
    origin.x + Math.sqrt(3) * radius * (position.q + position.r * 0.5),
    origin.y - 1.5 * radius * position.r,
  );
};

UtilsHexView.screenToPosition = function (point, origin) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  const radius = UtilsHexView.getHexRadius();
  const halfWidth = Math.sqrt(3) * radius * 0.5;
  let hit = null;
  let hitCount = 0;
  let nearestHitDistance = Infinity;
  for (let c = 0; c <= 8; c++) {
    for (let k = 0; k <= 4; k++) {
      const position = HexTopology.renderedToAxial(c, k);
      if (!position) continue;
      const center = UtilsHexView.positionToScreen(position, origin);
      const dx = Math.abs(point.x - center.x);
      const dy = Math.abs(point.y - center.y);
      if (dx > halfWidth + 1e-9 || dy > radius + 1e-9) continue;
      if (dy <= radius * 0.5 + 1e-9 || dx <= Math.sqrt(3) * (radius - dy) + 1e-9) {
        hitCount += 1;
        const distance = dx * dx + dy * dy;
        if (distance < nearestHitDistance) {
          hit = position;
          nearestHitDistance = distance;
        }
      }
    }
  }
  return hitCount > 0 ? hit : null;
};

UtilsHexView.getHexVertices = function () {
  const radius = UtilsHexView.getHexRadius();
  const halfWidth = Math.sqrt(3) * radius * 0.5;
  return [
    cc.p(0, radius),
    cc.p(halfWidth, radius * 0.5),
    cc.p(halfWidth, -radius * 0.5),
    cc.p(0, -radius),
    cc.p(-halfWidth, -radius * 0.5),
    cc.p(-halfWidth, radius * 0.5),
  ];
};

UtilsHexView.createHexNode = function (position, origin, fillColor, borderColor, borderWidth) {
  const node = cc.DrawNode.create();
  const current = {
    fillColor,
    borderColor,
    borderWidth: borderWidth || 0,
  };
  const draw = () => {
    node.clear();
    node.drawPoly(
      UtilsHexView.getHexVertices(),
      cc.color(current.fillColor.r, current.fillColor.g, current.fillColor.b, current.fillColor.a == null ? 255 : current.fillColor.a),
      current.borderWidth,
      cc.color(current.borderColor.r, current.borderColor.g, current.borderColor.b, current.borderColor.a == null ? 255 : current.borderColor.a),
    );
  };
  node.setColor = (color) => {
    current.fillColor = color;
    current.borderColor = color;
    draw();
  };
  draw();
  node.setPosition(UtilsHexView.positionToScreen(position, origin));
  return node;
};

module.exports = UtilsHexView;
