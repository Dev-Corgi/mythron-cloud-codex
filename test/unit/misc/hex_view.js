const path = require('path');
const fs = require('fs');
require('app-module-path').addPath(path.join(__dirname, '../../../'));

require('coffeescript/register');
const { expect } = require('chai');
const CONFIG = require('../../../app/common/config');
const HexTopology = require('../../../app/sdk/rulesets/hexTopology.coffee');
const UtilsHexView = require('../../../app/common/utils/utils_hex_view');
const UtilsEngine = require('../../../app/common/utils/utils_engine');

global.cc = global.cc || { p: (x, y) => ({ x, y }) };

describe('hex display mapping', () => {
  const origin = { x: 120, y: 80 };

  it('round trips the centers of the 9-8-9-8-9 horizontal rows', () => {
    const positions = [];
    for (let k = 0; k <= 4; k++) {
      for (let c = 0; c <= (k % 2 === 0 ? 8 : 7); c++) positions.push(HexTopology.renderedToAxial(c, k));
    }
    expect(positions).to.have.length(43);
    positions.forEach((position) => {
      const screen = UtilsHexView.positionToScreen(position, origin);
      const actual = UtilsHexView.screenToPosition(screen, origin);
      expect(actual).to.deep.equal(position);
      expect(UtilsHexView.getCellIndex(position)).to.be.within(0, 44);
    });
  });

  it('projects every valid axial neighbor pair at one equal center distance', () => {
    const expectedDistance = Math.sqrt(3) * UtilsHexView.getHexRadius();
    for (let c = 0; c <= 8; c++) {
      for (let k = 0; k <= 4; k++) {
        const position = HexTopology.renderedToAxial(c, k);
        const center = UtilsHexView.positionToScreen(position, origin);
        HexTopology.getNeighbors(position).filter(HexTopology.isOnBoard).forEach((neighbor) => {
          const neighborCenter = UtilsHexView.positionToScreen(neighbor, origin);
          const dx = center.x - neighborCenter.x;
          const dy = center.y - neighborCenter.y;
          expect(Math.sqrt(dx * dx + dy * dy)).to.be.closeTo(expectedDistance, 1e-8);
        });
      }
    }
  });

  it('staggered odd rows sit half a cell to the right and below even rows', () => {
    for (let k = 0; k < 4; k += 2) {
      const evenCenter = UtilsHexView.positionToScreen(HexTopology.renderedToAxial(0, k), origin);
      const oddCenter = UtilsHexView.positionToScreen(HexTopology.renderedToAxial(0, k + 1), origin);
      expect(oddCenter.x - evenCenter.x).to.be.closeTo(Math.sqrt(3) * UtilsHexView.getHexRadius() * 0.5, 1e-8);
      expect(evenCenter.y - oddCenter.y).to.be.closeTo(1.5 * UtilsHexView.getHexRadius(), 1e-8);
    }
  });

  it('resolves shared edges deterministically and rejects points outside the board', () => {
    const first = HexTopology.renderedToAxial(0, 0);
    const firstCenter = UtilsHexView.positionToScreen(first, origin);
    const second = HexTopology.getNeighbors(first).find(HexTopology.isOnBoard);
    const secondCenter = UtilsHexView.positionToScreen(second, origin);
    const sharedEdge = {
      x: (firstCenter.x + secondCenter.x) * 0.5,
      y: (firstCenter.y + secondCenter.y) * 0.5,
    };
    const edgeHit = UtilsHexView.screenToPosition(sharedEdge, origin);
    expect([first, second]).to.deep.include(edgeHit);
    expect(UtilsHexView.screenToPosition(sharedEdge, origin)).to.deep.equal(edgeHit);
    expect(UtilsHexView.screenToPosition({ x: origin.x - UtilsHexView.getHexRadius() * 2, y: origin.y }, origin)).to.equal(null);
    UtilsHexView.getHexVertices().forEach((vertex) => {
      const inside = UtilsHexView.screenToPosition({ x: firstCenter.x + vertex.x * 0.8, y: firstCenter.y + vertex.y * 0.8 }, origin);
      expect(inside).to.deep.equal(first);
    });
  });

  it('reports the full rendered hex board bounds', () => {
    const radius = UtilsHexView.getHexRadius();
    const size = UtilsHexView.getBoardPixelSize();
    expect(size.width).to.be.closeTo(9 * Math.sqrt(3) * radius, 1e-8);
    expect(size.height).to.be.closeTo(8 * radius, 1e-8);
  });

  it('keeps square transforms available when no hex session is active', () => {
    UtilsEngine._screenBoardOrigin = origin;
    const screen = UtilsEngine.transformBoardToScreen({ x: 2, y: 3 });
    expect(screen).to.deep.equal({ x: origin.x + 2 * CONFIG.TILESIZE, y: origin.y + 3 * CONFIG.TILESIZE });
    expect(UtilsEngine.transformScreenToBoard(screen)).to.deep.equal({ x: 2, y: 3 });
  });

  it('uses the axial adapter for an active hex ruleset', function () {
    this.timeout(20000);
    const SDK = require('../../../app/sdk.coffee');
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 1);
    UtilsEngine._screenBoardOrigin = origin;
    const position = HexTopology.renderedToAxial(7, 3);
    const screen = UtilsEngine.transformBoardToScreen(position);
    expect(UtilsEngine.transformHexScreenToBoardIndex(screen)).to.deep.equal(position);
    const transformTileMapToScreen = UtilsEngine.transformTileMapToScreen;
    try {
      UtilsEngine.transformTileMapToScreen = (point) => point;
      expect(UtilsEngine.transformPointerTileMapToBoard(screen, true)).to.deep.equal(position);
      expect(UtilsEngine.transformPointerTileMapToBoard(screen, false)).to.deep.equal(position);
    } finally {
      UtilsEngine.transformTileMapToScreen = transformTileMapToScreen;
    }
    expect(UtilsEngine.transformScreenToBoard(screen)).to.deep.equal({
      x: (screen.x - origin.x) / CONFIG.TILESIZE,
      y: (screen.y - origin.y) / CONFIG.TILESIZE,
    });
    expect(UtilsEngine.transformScreenToBoardIndex(screen)).to.deep.equal({
      x: Math.floor((screen.x - origin.x + CONFIG.TILESIZE * 0.5) / CONFIG.TILESIZE),
      y: Math.floor((screen.y - origin.y + CONFIG.TILESIZE * 0.5) / CONFIG.TILESIZE),
    });
    SDK.GameSession.reset();
  });

  it('routes pointer move, press, and release through the tested board mapper', () => {
    const playerSource = fs.readFileSync(path.join(__dirname, '../../../app/view/Player.js'), 'utf8');
    const methodBody = (name) => {
      const match = playerSource.match(new RegExp(`${name}\\(screenLocation\\) \\{([\\s\\S]*?)\\n  \\},`));
      expect(match, `${name} handler`).not.to.equal(null);
      return match[1];
    };
    const move = methodBody('setMouseScreenPosition');
    const down = methodBody('setMouseScreenDownPosition');
    const up = methodBody('setMouseScreenUpPosition');
    expect(move).to.include('transformPointerTileMapToBoard(this.mouseGlobalScaleInvertedScreenPosition, false)');
    expect(move).to.include('transformPointerTileMapToBoard(this.mouseGlobalScaleInvertedScreenPosition, true)');
    expect(down).to.include('transformPointerTileMapToBoard(this.mouseGlobalScaleInvertedScreenDownPosition, true)');
    expect(down).to.include('transformPointerTileMapToBoard(this.mouseGlobalScaleInvertedScreenDownPosition, false)');
    expect(up).to.include('transformPointerTileMapToBoard(this.mouseGlobalScaleInvertedScreenUpPosition, true)');
    expect(up).to.include('transformPointerTileMapToBoard(this.mouseGlobalScaleInvertedScreenUpPosition, false)');
  });
});
