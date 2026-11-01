const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const { expect } = require('chai');
const SDK = require('../../../../app/sdk.coffee');
const UtilsSDK = require('../../../utils/utils_sdk');
const BoardGeometry = require('../../../../server/ai/scoring/utils/utils_boardGeometry');
const StarterAI = require('../../../../server/ai/starter_ai');

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

  it('scores only the enemy Unit when it shares a position with a Wall', () => {
    const session = SDK.GameSession.getInstance();
    const board = session.getBoard();
    const source = session.getGeneralForPlayer1();
    const enemy = session.getGeneralForPlayer2();
    const position = { q: 6, r: 0 };
    source.setPosition({ q: 5, r: 0 });
    source.setReach(2);
    source.refreshExhaustion();
    enemy.setPosition(position);
    const wall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    wall.setPosition(position);
    wall.setIsPlayed(true);
    wall.setIsRemoved(false);
    board.addCard(wall);

    const ai = new StarterAI(session, session.getPlayer1Id(), 1);
    const objectives = ai._findSortedFilteredAttackObjectivesAndScoresForUnit(source, source.getPosition(), false, false);
    expect(objectives.map((entry) => entry.objective)).to.deep.equal([enemy]);
  });
});
