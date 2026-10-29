const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');
const { expect } = require('chai');
const SDK = require('../../../../app/sdk.coffee');
const CardEligibility = require('../../../../app/sdk/rulesets/cardEligibility.coffee');
const CONFIG = require('../../../../app/common/config');
const UtilsSDK = require('../../../utils/utils_sdk');

describe('new-rules card eligibility', () => {
  it('allows only audited exact neutral IDs and canonical general/signature pairs', () => {
    expect(CardEligibility.validateDeck([
      { id: 1 }, { id: 10979 }, { id: 19052 }, { id: 19038 }, { id: 10205 },
      { id: 10001 }, { id: 19051 }, { id: 10954 }, { id: 10206 },
    ]).valid).to.equal(true);
    expect(CardEligibility.validateDeck([{ id: 1 }, { id: 10980 }]).valid).to.equal(false);
    expect(CardEligibility.validateDeck([{ id: 2 }, { id: 10979 }]).valid).to.equal(false);
    expect(CardEligibility.isDeckChoiceId(20174)).to.equal(false);
    expect(CardEligibility.validateDeck([{ id: 1 }, { id: 20142 }]).valid).to.equal(false);
    expect(CardEligibility.validateDeck([{ id: 1 }, { id: 10979, modifiersContextObjects: [] }]).valid).to.equal(false);
    expect(CardEligibility.isGeneratedDependencyId(20142)).to.equal(true);
    expect(CardEligibility.isGeneratedDependencyId(43)).to.equal(true);
    expect(CardEligibility.isGeneratedDependencyId(40004)).to.equal(true);
  });

  it('rejects excluded cards at new-rules setup before setup mutates the session', () => {
    const session = SDK.GameSession.create();
    session.setRuleset('practice-sandbox-hex', 1);
    expect(() => SDK.GameSetup.setupNewSession(session, {
      userId: 'p1', name: 'Player', deck: [{ id: 1 }, { id: 10980 }],
    }, {
      userId: 'p2', name: 'Opponent', deck: [{ id: 23 }, { id: 10979 }],
    })).to.throw(/not audited/);
    expect(session.getPlayer1().getPlayerId()).to.not.equal('p1');
  });

  it('rejects excluded direct board applications in new-rules sessions', () => {
    const session = SDK.GameSession.create();
    session.setRuleset('practice-sandbox-hex', 1);
    const excludedCard = session.getCardCaches().getCardById(10980);
    const positionBefore = excludedCard.getPosition();
    expect(session.applyCardToBoard(excludedCard, 0, 0)).to.equal(false);
    expect(excludedCard.getPosition()).to.deep.equal(positionBefore);
  });

  it('invalidates an excluded authoritative board action before application', () => {
    UtilsSDK.setupSession([{ id: 1 }, { id: 10979 }], [{ id: 23 }, { id: 10979 }]);
    const session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', 1);
    const action = new SDK.ApplyCardToBoardAction(session, 'player1_id', { q: 0, r: 0 }, { id: 10980 });
    session.validateAction(action, false);
    expect(action.getIsValid()).to.equal(false);
    expect(action.getValidatorType()).to.equal('ValidatorCardEligibility');
    expect(session.getBoard().getCards().some((card) => card.getId() === 10980)).to.equal(false);
  });

  it('uses six axial neighbors for Maw in hex and preserves its legacy square pattern', () => {
    const hexSession = SDK.GameSession.create();
    hexSession.setRuleset('practice-sandbox-hex', 1);
    const hexMaw = hexSession.createCardForIdentifier(10979);
    expect(hexMaw.getFollowups()[0]._private.followupSourcePattern).to.deep.equal([
      { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
    ]);

    const legacySession = SDK.GameSession.create();
    const legacyMaw = legacySession.createCardForIdentifier(10979);
    expect(legacyMaw.getFollowups()[0]._private.followupSourcePattern).to.deep.equal(CONFIG.PATTERN_3x3);
  });
  it('rejects unaudited replay hand cards and incompatible starting-board signatures', () => {
    const session = SDK.GameSession.create();
    session.setRuleset('practice-sandbox-hex', 1);
    const base = [{ id: 1 }, { id: 10979 }];
    expect(CardEligibility.validateSetupData(session, {
      deck: base,
      startingHand: [{ id: 10980 }],
    }).valid).to.equal(false);
    expect(CardEligibility.validateSetupData(session, {
      deck: base,
      startingBoardCardsData: [{ id: 20175, position: { q: 0, r: 0 }, ownerId: 'p1' }],
    }).valid).to.equal(false);
    expect(CardEligibility.validateSetupData(session, {
      deck: base,
      startingHand: Array(9).fill({ id: 10979 }),
    }).valid).to.equal(false);
  });
});
