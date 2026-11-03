const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');
const { expect } = require('chai');
const SDK = require('../../../../app/sdk.coffee');
const CardEligibility = require('../../../../app/sdk/rulesets/cardEligibility.coffee');
const CONFIG = require('../../../../app/common/config');
const UtilsSDK = require('../../../utils/utils_sdk');
const CardSetFactory = require('../../../../app/sdk/cards/cardSetFactory.coffee');
const isExcludedFromLegacyCardPools = require('../../../../app/sdk/cards/isExcludedFromLegacyCardPools.coffee');
const CardFactory = require('../../../../app/sdk/cards/cardFactory.coffee');
const FactionFactory = require('../../../../app/sdk/cards/factionFactory.coffee');
const ValidatorExecuteExplicitAction = require('../../../../app/sdk/validators/validatorExecuteExplicitAction.coffee');

describe('new-rules card eligibility', () => {
  it('registers the Phobies set and resolves every reserved roster ID to a unit', () => {
    expect(SDK.CardSet.Phobies).to.equal(9);
    expect(CardSetFactory.cardSetForIdentifier(SDK.CardSet.Phobies)).to.include({ enabled: false, isUnlockableThroughOrbs: false });
    expect(Object.values(SDK.Cards.Phobies).filter((id) => id >= 50001 && id <= 50035)).to.deep.equal(Array.from({ length: 35 }, (_, index) => 50001 + index));
    const session = SDK.GameSession.create();
    for (let id = 50001; id <= 50035; id += 1) {
      const card = SDK.CardFactory.cardForIdentifier(id, session);
      expect(card, `card ${id}`).to.exist;
      expect(card.getId()).to.equal(id);
      expect(card.getCardSetId()).to.equal(SDK.CardSet.Phobies);
      expect(card.getFactionId()).to.equal(SDK.Factions.Neutral);
      expect(card.type).to.equal(SDK.CardType.Unit);
    }
  });

  it('prefixes only Phobies names and excludes their set from generic legacy pools', () => {
    const card = new SDK.Card();
    card.name = 'Ion';
    card.setCardSetId(SDK.CardSet.Phobies);
    expect(card.getName()).to.equal('[PB] Ion');
    card.name = '[PB] Ion';
    expect(card.getName()).to.equal('[PB] Ion');
    expect(isExcludedFromLegacyCardPools(card)).to.equal(true);

    card.setCardSetId(SDK.CardSet.Core);
    card.name = 'Ion';
    expect(card.getName()).to.equal('Ion');
    expect(isExcludedFromLegacyCardPools(card)).to.equal(false);
  });

  it('filters cache pool arrays while retaining direct ID lookup for excluded cards', () => {
    const oldGetAllCards = CardFactory.getAllCards;
    const oldGetAllFactions = FactionFactory.getAllFactions;
    const oldCachedAt = SDK.GameSession._cardsCachedAt;
    const oldCaches = SDK.GameSession._cardCaches;
    const makeCard = (id, cardSetId) => ({
      getId: () => id,
      getCardSetId: () => cardSetId,
      getFactionId: () => 1,
      getIsAvailable: () => true,
    });
    const phobiesCard = makeCard(50001, SDK.CardSet.Phobies);
    const legacyCard = makeCard(1, SDK.CardSet.Core);
    try {
      CardFactory.getAllCards = () => [legacyCard, phobiesCard];
      FactionFactory.getAllFactions = () => [{ id: 1, isInDevelopment: false }];
      SDK.GameSession._cardsCachedAt = null;
      SDK.GameSession._cardCaches = null;
      const caches = SDK.GameSession.getCardCaches();
      expect(caches.getCards()).to.deep.equal([legacyCard]);
      expect(caches.getCardById(50001)).to.equal(phobiesCard);
    } finally {
      CardFactory.getAllCards = oldGetAllCards;
      FactionFactory.getAllFactions = oldGetAllFactions;
      SDK.GameSession._cardsCachedAt = oldCachedAt;
      SDK.GameSession._cardCaches = oldCaches;
    }
  });

  it('allows Phobies and the temporary bot roster in v2 and preserves v1 deck eligibility', () => {
    const v1 = SDK.GameSession.create();
    v1.setRuleset('practice-sandbox-hex', 1);
    const v2 = SDK.GameSession.create();
    v2.setRuleset('practice-sandbox-hex', 2);

    expect(CardEligibility.isDeckChoiceId(10979, v1)).to.equal(true);
    expect(CardEligibility.isDeckChoiceId(50001, v1)).to.equal(false);
    expect(CardEligibility.isDeckChoiceId(50001, v2)).to.equal(true);
    expect(CardEligibility.isDeckChoiceId(50001, { rulesetId: 'legacy', rulesetVersion: 2 })).to.equal(false);
    expect(CardEligibility.isDeckChoiceId(10979, v2)).to.equal(true);
    expect(CardEligibility.isDeckChoiceId(10019, v2)).to.equal(false);
    expect(CardEligibility.isDeckChoiceId(50036, v2)).to.equal(false);
    const v1Deck = [1, 10979, 19052, 19038, 10205, 10001, 19051, 10954, 10206].map((id) => ({ id }));
    const v2Deck = [1, ...Array.from({ length: 8 }, (_, index) => 50001 + index)].map((id) => ({ id }));
    expect(CardEligibility.validateDeck(v1Deck, v1).valid).to.equal(true);
    expect(CardEligibility.validateDeck(v2Deck, v2).valid).to.equal(true);
    expect(CardEligibility.validateDeck(v1Deck, v2).valid).to.equal(true);
    const v2Context = { rulesetId: 'practice-sandbox-hex', rulesetVersion: 2 };
    expect(CardEligibility.validateSavedDeck({ id: 1, purpose: 'sandbox', cards: v2Deck }, 'sandbox', v2Context).valid).to.equal(true);
    expect(CardEligibility.validateSavedDeck({ id: 2, purpose: 'sandbox', cards: v1Deck }, 'sandbox', v2Context).valid).to.equal(true);
  });

  it('allows ability effects only when derived from the acting unit and its owner', () => {
    const session = SDK.GameSession.create();
    session.setRuleset('practice-sandbox-hex', 2);
    const sourceUnit = { getOwnerId: () => 'owner', getIsGeneral: () => false };
    session.getCardByIndex = () => sourceUnit;
    const effectCard = session.createCardForIdentifier(SDK.Cards.PhobiesAbility.Terrorform);
    effectCard.ownerId = 'owner';
    const action = Object.create(SDK.UseActiveAbilityAction.prototype);
    action.sourceUnitIndex = 7;
    const originalEffectId = SDK.UseActiveAbilityAction.getEffectCardId;
    try {
      SDK.UseActiveAbilityAction.getEffectCardId = () => SDK.Cards.PhobiesAbility.Terrorform;
      expect(CardEligibility.isAllowedRuntimeCard(session, effectCard, action)).to.equal(true);
      effectCard.ownerId = 'other';
      expect(CardEligibility.isAllowedRuntimeCard(session, effectCard, action)).to.equal(false);
      effectCard.ownerId = 'owner';
      SDK.UseActiveAbilityAction.getEffectCardId = () => SDK.Cards.PhobiesAbility.Behold;
      expect(CardEligibility.isAllowedRuntimeCard(session, effectCard, action)).to.equal(false);
    } finally {
      SDK.UseActiveAbilityAction.getEffectCardId = originalEffectId;
    }
  });

  it('allows only audited exact neutral IDs and canonical general/signature pairs', () => {
    const validDeck = [1, 10979, 19052, 19038, 10205, 10001, 19051, 10954, 10206].map((id) => ({ id }));
    expect(CardEligibility.validateDeck(validDeck).valid).to.equal(true);
    expect(CardEligibility.validateDeck(validDeck.slice(0, 8)).valid).to.equal(false);
    expect(CardEligibility.validateDeck(validDeck.concat({ id: 10979 })).valid).to.equal(false);
    expect(CardEligibility.validateDeck([{ id: 1 }, ...new Array(CONFIG.MAX_DECK_DUPLICATES + 1).fill({ id: 10979 }), ...validDeck.slice(CONFIG.MAX_DECK_DUPLICATES + 2, 9)]).valid).to.equal(false);
    expect(CardEligibility.validateDeck(validDeck.map((card, index) => ({ id: index === 1 ? 10980 : card.id }))).valid).to.equal(false);
    expect(CardEligibility.validateDeck([{ id: 2 }, ...validDeck.slice(1)]).valid).to.equal(false);
    expect(CardEligibility.isDeckChoiceId(20174)).to.equal(false);
    expect(CardEligibility.validateDeck([{ id: 1 }, { id: 20142 }, ...validDeck.slice(2)]).valid).to.equal(false);
    expect(CardEligibility.validateDeck([{ id: 1 }, { id: 10979, modifiersContextObjects: [] }, ...validDeck.slice(2)]).valid).to.equal(false);
    expect(CardEligibility.isGeneratedDependencyId(20142)).to.equal(true);
    expect(CardEligibility.isGeneratedDependencyId(43)).to.equal(true);
    expect(CardEligibility.isGeneratedDependencyId(40004)).to.equal(true);
  });

  it('rejects excluded cards at new-rules setup before setup mutates the session', () => {
    const session = SDK.GameSession.create();
    session.setRuleset('practice-sandbox-hex', 1);
    expect(() => SDK.GameSetup.setupNewSession(session, {
      userId: 'p1', name: 'Player', deck: [1, 10980, 19052, 19038, 10205, 10001, 19051, 10954, 10206].map((id) => ({ id })),
    }, {
      userId: 'p2', name: 'Opponent', deck: [23, 10979, 19052, 19038, 10205, 10001, 19051, 10954, 10206].map((id) => ({ id })),
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

  it('allows only neutral actionless Wall and Methron Point setup in replacement rules version 2', () => {
    const wallSession = SDK.GameSession.create();
    wallSession.setRuleset('practice-sandbox-hex', 2);
    const wall = wallSession.createCardForIdentifier(SDK.Cards.Tile.Wall);
    expect(CardEligibility.isAllowedRuntimeCard(wallSession, wall, null)).to.equal(true);
    wall.ownerId = 'player1_id';
    expect(CardEligibility.isAllowedRuntimeCard(wallSession, wall, null)).to.equal(false);
    wall.ownerId = null;
    expect(CardEligibility.isAllowedRuntimeCard(wallSession, wall, {})).to.equal(false);

    const methronPoint = wallSession.createCardForIdentifier(SDK.Cards.Tile.MethronPoint);
    expect(CardEligibility.isAllowedRuntimeCard(wallSession, methronPoint, null)).to.equal(true);
    methronPoint.ownerId = 'player1_id';
    expect(CardEligibility.isAllowedRuntimeCard(wallSession, methronPoint, null)).to.equal(false);
    methronPoint.ownerId = null;
    expect(CardEligibility.isAllowedRuntimeCard(wallSession, methronPoint, {})).to.equal(false);

    const legacyHexSession = SDK.GameSession.create();
    legacyHexSession.setRuleset('practice-sandbox-hex', 1);
    const legacyWall = legacyHexSession.createCardForIdentifier(SDK.Cards.Tile.Wall);
    expect(CardEligibility.isAllowedRuntimeCard(legacyHexSession, legacyWall, null)).to.equal(false);
    const legacyMethronPoint = legacyHexSession.createCardForIdentifier(SDK.Cards.Tile.MethronPoint);
    expect(CardEligibility.isAllowedRuntimeCard(legacyHexSession, legacyMethronPoint, null)).to.equal(false);
  });

  it('allows an ownerless Wall only from the Terrorform board-application action', () => {
    const session = SDK.GameSession.create();
    session.setRuleset('practice-sandbox-hex', 2);
    const caster = session.createCardForIdentifier(50011);
    caster.ownerId = 'player1_id';
    session.getCardByIndex = () => caster;
    const ability = new SDK.UseActiveAbilityAction(session, caster.getOwnerId(), caster.getIndex(), { q: 3, r: 2 });
    const apply = new SDK.ApplyCardToBoardAction(session, caster.getOwnerId(), { q: 3, r: 2 }, { id: SDK.Cards.Tile.Wall }, true);
    apply.getRootAction = () => ability;
    const wall = session.createCardForIdentifier(SDK.Cards.Tile.Wall);
    const originalEffectId = SDK.UseActiveAbilityAction.getEffectCardId;
    try {
      SDK.UseActiveAbilityAction.getEffectCardId = () => SDK.Cards.PhobiesAbility.Terrorform;
      expect(CardEligibility.isAllowedRuntimeCard(session, wall, apply)).to.equal(true);
    } finally {
      SDK.UseActiveAbilityAction.getEffectCardId = originalEffectId;
    }
    wall.ownerId = caster.getOwnerId();
    expect(CardEligibility.isAllowedRuntimeCard(session, wall, apply)).to.equal(false);
    wall.ownerId = null;

    const unrelated = new SDK.ApplyCardToBoardAction(session, caster.getOwnerId(), { q: 3, r: 2 }, { id: SDK.Cards.Tile.Wall }, true);
    expect(CardEligibility.isAllowedRuntimeCard(session, wall, unrelated)).to.equal(false);
    const otherAbility = session.createCardForIdentifier(50035);
    otherAbility.ownerId = caster.getOwnerId();
    const otherRoot = new SDK.UseActiveAbilityAction(session, otherAbility.getOwnerId(), otherAbility.getIndex(), { q: 4, r: 2 });
    otherRoot.getSourceUnit = () => otherAbility;
    unrelated.getRootAction = () => otherRoot;
    expect(CardEligibility.isAllowedRuntimeCard(session, wall, unrelated)).to.equal(false);
  });

  it('binds Terrorform Wall actions to its selected adjacent tile', () => {
    const session = SDK.GameSession.create();
    session.setRuleset('practice-sandbox-hex', 2);
    const caster = session.createCardForIdentifier(50011);
    caster.ownerId = 'player1_id';
    caster.setPosition({ q: 2, r: 2 });
    const selectedPosition = { q: 3, r: 2 };
    const root = new SDK.UseActiveAbilityAction(session, caster.getOwnerId(), caster.getIndex(), selectedPosition);
    root.getSourceUnit = () => caster;
    root.getTargetPosition = () => selectedPosition;
    const validator = new ValidatorExecuteExplicitAction(session);
    const apply = new SDK.ApplyCardToBoardAction(session, caster.getOwnerId(), { q: 4, r: 2 }, { id: SDK.Cards.Tile.Wall, ownerId: null }, true);
    apply.getRootAction = () => root;
    expect(validator._isTerrorformWallApply(apply)).to.equal(false);

    const remove = new SDK.RemoveAction(session);
    remove.setTarget(session.createCardForIdentifier(SDK.Cards.Tile.Wall));
    remove.setTargetPosition({ q: 4, r: 2 });
    remove.getRootAction = () => root;
    expect(validator._isTerrorformWallRemove(remove)).to.equal(false);
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
