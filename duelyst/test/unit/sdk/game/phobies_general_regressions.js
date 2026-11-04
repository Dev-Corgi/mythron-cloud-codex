const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');
const { expect } = require('chai');
const SDK = require('../../../../app/sdk.coffee');
const UtilsSDK = require('../../../utils/utils_sdk');
const Eligibility = require('../../../../app/sdk/rulesets/cardEligibility.coffee');
require('../../../../app/common/logger.coffee').enabled = false;

const pairs = [[1, 20174], [23, 20175], [51, 20301], [101, 20176], [123, 20177], [152, 20302], [201, 20178], [223, 20179], [254, 20304], [301, 20180], [323, 20181], [355, 20303], [401, 20182], [418, 20183], [449, 20305], [501, 20184], [527, 20185], [558, 20306]];

describe('Phobies General runtime regressions', () => {
  let session;
  const createSession = (id, version = 2) => {
    SDK.GameSession.reset();
    UtilsSDK.setupSession([{ id }, { id: 50003 }, { id: 50003 }], [{ id: 101 }], true, true);
    session = SDK.GameSession.getInstance();
    session.setRuleset('practice-sandbox-hex', version);
    for (const tile of session.getBoard().getTiles()) if (tile.getId() === SDK.Cards.Tile.Wall) tile.setIsRemoved(true);
    const general = session.getGeneralForPlayer1();
    general.setPosition({ q: 2, r: 2 });
    session.getGeneralForPlayer2().setPosition({ q: 5, r: 2 });
    general.setActionPoints(2);
    if (version === 2) general.getActiveAbilityState().lockdown = 0;
    return general;
  };
  const deploy = (owner, position) => {
    const unit = session.createCardForIdentifier(50003);
    unit.setOwnerId(owner);
    session.applyCardToBoard(unit, position.q, position.r, unit.createNewCardData(), null);
    expect(unit.getIsActive()).to.equal(true);
    return unit;
  };

  afterEach(() => SDK.GameSession.reset());

  pairs.forEach(([id, signatureId]) => {
    it(`regenerates and executes General ${id}'s canonical signature ${signatureId}`, () => {
      const general = createSession(id);
      const player = session.getPlayer1();
      const ally = deploy(player.getPlayerId(), { q: 3, r: 2 });
      if (signatureId === 20175) ally.setDamage(500);
      const enemy = deploy(session.getPlayer2Id(), { q: 2, r: 3 });
      const warbirdColumn = signatureId === 20184 ? deploy(session.getPlayer2Id(), { q: 5, r: 1 }) : null;
      const warbirdAlly = signatureId === 20184 ? deploy(player.getPlayerId(), { q: 5, r: 3 }) : null;
      expect(Eligibility.getSignatureId(id, session)).to.equal(signatureId);
      expect(Eligibility.isSignatureForPlayer(session, signatureId, player.getPlayerId())).to.equal(true);
      expect(Eligibility.isSignatureForPlayer(session, signatureId === 20174 ? 20175 : 20174, player.getPlayerId())).to.equal(false);
      session.executeAction(session.actionEndTurn());
      session.executeAction(session.actionEndTurn());
      general.getActiveAbilityState().lockdown = 0;
      general.setActionPoints(2);
      expect(player.getCurrentSignatureCard().getId()).to.equal(signatureId);
      const mana = player.getRemainingMana();
      if ([20302, 20183].includes(signatureId)) {
        expect(general.getCanUseActiveAbility()).to.equal(false);
        const action = player.actionUseActiveAbility(general.getIndex(), enemy.getPosition());
        session.executeAction(action);
        expect(action.getIsValid()).to.equal(false);
        expect(general.getActionPoints()).to.equal(2);
        expect(general.getActiveAbilityState().cooldown).to.equal(0);
      } else {
        const baseAttack = general.getATK();
        const positions = SDK.UseActiveAbilityAction.getLegalTargetPositions(session, general);
        expect(positions.length, `General ${id} has legal targets`).to.be.above(0);
        const selected = signatureId === 20181 ? enemy.getPosition() : positions[0];
        const action = player.actionUseActiveAbility(general.getIndex(), selected);
        session.executeAction(action);
        expect(action.getIsValid(), action.getValidationMessage()).to.equal(true);
        expect(general.getActionPoints()).to.equal(1);
        if (signatureId === 20174) expect(ally.getATK()).to.equal(500);
        if (signatureId === 20175) expect(ally.getDamage()).to.equal(200);
        if (signatureId === 20182) expect(general.getATK()).to.equal(baseAttack + 100);
        if (signatureId === 20181) expect(enemy.getDamage()).to.equal(100);
        if (signatureId === 20184) {
          expect(session.getGeneralForPlayer2().getDamage()).to.equal(200);
          expect(warbirdColumn.getDamage()).to.equal(200);
          expect(enemy.getDamage()).to.equal(0);
          expect(warbirdAlly.getDamage()).to.equal(0);
        }
        for (const [spell, token] of [[20177, 108], [20178, 225], [20180, 315], [20305, 411]]) {
          if (signatureId === spell) expect(session.getBoard().getUnits().some((unit) => unit.getId() === token)).to.equal(true);
        }
        expect(general.getActiveAbilityState().cooldown).to.equal(2);
        const invalid = action.getFlattenedActionTree().filter((child) => !child.getIsValid());
        expect(invalid.map((child) => `${child.getType()}: ${child.getValidationMessage()}`)).to.deep.equal([]);
        expect(player.getCurrentSignatureCard().getId()).to.equal(signatureId);
        const followup = action.getCard().getCurrentFollowupCard();
        if ([20176, 20303].includes(signatureId)) expect(followup, `signature ${signatureId} exposes its canonical followup`).to.exist;
        if (followup) {
          const target = followup.getValidTargetPositions()[0];
          expect(target).to.exist;
          const followupAction = player.actionPlayFollowup(followup, target);
          session.executeAction(followupAction);
          expect(followupAction.getIsValid(), followupAction.getValidationMessage()).to.equal(true);
          if (signatureId === 20176) expect(session.getBoard().getUnitAtPosition(target)).to.exist;
          if (signatureId === 20303) expect(session.getBoard().getUnitAtPosition(target).getId()).to.equal(346);
          expect(followupAction.getFlattenedActionTree().filter((child) => !child.getIsValid()).map((child) => child.getValidationMessage())).to.deep.equal([]);
        }
      }
      expect(player.getRemainingMana()).to.equal(mana);
      if (signatureId === 20305) {
        for (let turn = 0; turn < 2; turn += 1) {
          const endTurn = session.actionEndTurn();
          session.executeAction(endTurn);
          expect(endTurn.getFlattenedActionTree().filter((child) => !child.getIsValid()).map((child) => `${child.getType()}: ${child.getValidationMessage()}`)).to.deep.equal([]);
        }
        expect(session.getBoard().getUnits().some((unit) => unit.getId() === 442), 'Egg hatches into Ripper').to.equal(true);
      }
    });
  });

  it('keeps secondary spell magnitudes unchanged under a General ability root', () => {
    const general = createSession(501);
    const action = session.getPlayer1().actionUseActiveAbility(general.getIndex(), { q: 5, r: 2 });
    const effect = action.getCard();
    const secondary = session.createCardForIdentifier(SDK.Cards.Spell.PhoenixFire);
    const scale = require('../../../../app/sdk/spells/generalAbilityEffectScale.coffee');
    expect(scale(effect, action)).to.equal(100);
    expect(scale(secondary, action)).to.equal(1);
  });

  [[123, 108], [101, 20053]].forEach(([generalId, dependency]) => {
    it(`permits prismatic General ${generalId}'s actual dependency ${dependency}`, () => {
      const general = createSession(SDK.Cards.getPrismaticCardId(generalId));
      const player = session.getPlayer1();
      const ally = deploy(player.getPlayerId(), { q: 3, r: 2 });
      const target = generalId === 101 ? ally.getPosition() : { q: 1, r: 2 };
      const action = player.actionUseActiveAbility(general.getIndex(), target);
      session.executeAction(action);
      expect(action.getIsValid(), action.getValidationMessage()).to.equal(true);
      if (generalId === 123) {
        const token = session.getBoard().getUnits().find((unit) => SDK.Cards.getNonPrismaticCardId(unit.getId()) === dependency);
        expect(token).to.exist;
        expect(SDK.Cards.getIsPrismaticCardId(token.getId())).to.equal(true);
      } else {
        const followup = action.getCard().getCurrentFollowupCard();
        expect(followup).to.exist;
        expect(followup.getFollowupSourcePattern().every((position) => Number.isInteger(position.q) && Number.isInteger(position.r))).to.equal(true);
        const destination = followup.getValidTargetPositions()[0];
        const teleport = player.actionPlayFollowup(followup, destination);
        session.executeAction(teleport);
        expect(teleport.getIsValid(), teleport.getValidationMessage()).to.equal(true);
        expect(ally.getPosition()).to.deep.equal(destination);
      }
    });
  });

  it('rejects a generated token with a previously played signature as unrelated source', () => {
    const general = createSession(123);
    const player = session.getPlayer1();
    const action = player.actionUseActiveAbility(general.getIndex(), { q: 1, r: 2 });
    session.executeAction(action);
    expect(action.getIsValid(), action.getValidationMessage()).to.equal(true);
    const unrelated = new SDK.PlayCardAction(session, player.getPlayerId(), { q: 2, r: 1 }, { id: 108 });
    unrelated.setSource(action.getCard());
    session.validateAction(unrelated, false);
    expect(unrelated.getIsValid()).to.equal(false);
  });

  it('scales Kinetic Surge for earlier and later summons without scaling token base stats', () => {
    const general = createSession(527);
    const player = session.getPlayer1();
    player.setStartingMana(9);
    const play = (position) => {
      const slot = player.getDeck().getHand().findIndex((index) => index != null && session.getCardByIndex(index).getId() === 50003);
      const action = player.actionPlayCardFromHand(slot, position);
      session.executeAction(action);
      expect(action.getIsValid(), action.getValidationMessage()).to.equal(true);
      return session.getBoard().getUnitAtPosition(position);
    };
    const before = play({ q: 3, r: 2 });
    const action = player.actionUseActiveAbility(general.getIndex(), SDK.UseActiveAbilityAction.getLegalTargetPositions(session, general)[0]);
    session.executeAction(action);
    expect(action.getIsValid(), action.getValidationMessage()).to.equal(true);
    expect([before.getATK(), before.getMaxHP()]).to.deep.equal([400, 700]);
    const after = play({ q: 1, r: 2 });
    expect([after.getATK(), after.getMaxHP()]).to.deep.equal([400, 700]);
  });

  it('keeps ordinary legacy spell damage, healing and buffs unchanged in actual resolution', () => {
    [[SDK.Cards.Spell.PhoenixFire, 'damage'], [SDK.Cards.Spell.Afterglow, 'heal'], [SDK.Cards.Spell.Roar, 'buff']].forEach(([spellId, kind]) => {
      SDK.GameSession.reset();
      UtilsSDK.setupSession([{ id: 1 }, { id: spellId }], [{ id: 101 }], true, true);
      session = SDK.GameSession.getInstance();
      const player = session.getPlayer1();
      player.setStartingMana(9);
      let target = session.getGeneralForPlayer2();
      if (kind !== 'damage') {
        target = session.createCardForIdentifier(10204);
        target.setOwnerId(player.getPlayerId());
        session.applyCardToBoard(target, 1, 2, null, null);
        target.setDamage(3);
      }
      const atk = target.getATK();
      const slot = player.getDeck().getHand().findIndex((index) => index != null && session.getCardByIndex(index).getId() === spellId);
      const position = target.getPosition();
      const action = player.actionPlayCardFromHand(slot, position.x, position.y);
      session.executeAction(action);
      expect(action.getIsValid(), action.getValidationMessage()).to.equal(true);
      if (kind === 'damage') expect(target.getDamage()).to.equal(3);
      if (kind === 'heal') expect(target.getDamage()).to.equal(0);
      if (kind === 'buff') expect(target.getATK()).to.equal(atk + 2);
    });
  });

  [[1, 'buff'], [23, 'heal']].forEach(([generalId, kind]) => {
    it(`preserves v1 General ${generalId}'s original effect magnitude`, () => {
      createSession(generalId, 1);
      const player = session.getPlayer1();
      player.setStartingMana(9);
      player.setIsSignatureCardActive(true);
      const ally = session.createCardForIdentifier(10979);
      ally.setOwnerId(player.getPlayerId());
      session.applyCardToBoard(ally, 3, 2, null, null);
      expect(ally.getIsActive()).to.equal(true);
      ally.setDamage(3);
      const atk = ally.getATK();
      const action = player.actionPlaySignatureCard(ally.getPosition());
      session.executeAction(action);
      expect(action.getIsValid(), action.getValidationMessage()).to.equal(true);
      if (kind === 'buff') expect(ally.getATK()).to.equal(atk + 2);
      if (kind === 'heal') expect(ally.getDamage()).to.equal(0);
      expect(Eligibility.isAllowedRuntimeId(108, session)).to.equal(false);
      expect(Eligibility.isSignatureId(20177, session)).to.equal(false);
    });
  });
});
