const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const { expect } = require('chai');
const SDK = require('../../../../app/sdk.coffee');
const UtilsSDK = require('../../../utils/utils_sdk');
const BoardGeometry = require('../../../../server/ai/scoring/utils/utils_boardGeometry');

describe('Practice AI board geometry', () => {
  beforeEach(() => {
    UtilsSDK.setupSession(
      [{ id: SDK.Cards.Faction1.General }],
      [{ id: SDK.Cards.Faction4.General }],
      true,
      true,
    );
    SDK.GameSession.getInstance().setRuleset('practice-sandbox-hex', 2);
  });

  afterEach(() => {
    SDK.GameSession.reset();
  });

  it('uses shared version 2 row, column, and distance geometry', () => {
    const session = SDK.GameSession.getInstance();
    const board = session.getBoard();
    const center = SDK.HexTopology.renderedToAxial(4, 2);
    const farColumn = SDK.HexTopology.renderedToAxial(8, 2);

    expect(BoardGeometry.isHex(session)).to.equal(true);
    expect(BoardGeometry.column(session, center)).to.equal(4);
    expect(BoardGeometry.row(session, center)).to.equal(2);
    expect(BoardGeometry.distanceFromColumn(session, center, farColumn)).to.equal(4);
    expect(BoardGeometry.maxDistance(session, 0)).to.equal(10);
    expect(board.getHexNeighbors(center)).to.have.length(6);
  });
});
