const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const { expect } = require('chai');
const Logger = require('../../../../app/common/logger.coffee');
const SDK = require('../../../../app/sdk.coffee');
const UtilsSDK = require('../../../utils/utils_sdk');

Logger.enabled = false;

describe('active ability state', () => {
  let gameSession;

  beforeEach(() => {
    UtilsSDK.setupSession(
      [{ id: SDK.Cards.Faction1.General }, { id: SDK.Cards.Neutral.GolemMetallurgist }, { id: SDK.Cards.Neutral.PlanarScout }],
      [{ id: SDK.Cards.Faction2.General }], true, true);
    gameSession = SDK.GameSession.getInstance();
    gameSession.setRuleset('practice-sandbox-hex', 2);
  });

  afterEach(() => SDK.GameSession.reset());

  it('defines Planar Scout Phoenix Fire and initializes per-instance Lockdown/Cooldown', () => {
    const scout = gameSession.createCardForIdentifier(SDK.Cards.Neutral.PlanarScout);
    expect(scout.activeAbility).to.deep.equal({ effectCardId: SDK.Cards.Spell.PhoenixFire, lockdown: 1, cooldown: 1 });

    const deployed = gameSession.createCardForIdentifier(SDK.Cards.Neutral.PlanarScout);
    deployed.setOwnerId(gameSession.getPlayer1Id());
    gameSession.applyCardToBoard(deployed, 0, 1, deployed.createNewCardData(), null);
    expect(deployed.getActiveAbilityState()).to.include({ lockdown: 1, cooldown: 0, baseLockdown: 1, baseCooldown: 1 });
    const data = deployed.createCardData();
    expect(data.activeAbilityState).to.deep.equal(deployed.getActiveAbilityState());
  });

  it('starts a non-General unit with fresh ability state even when it carries copied state', () => {
    const copy = gameSession.createCardForIdentifier(SDK.Cards.Neutral.PlanarScout);
    copy.setOwnerId(gameSession.getPlayer1Id());
    copy.activeAbilityState = { lockdown: 0, cooldown: 1, baseLockdown: 1, baseCooldown: 1, handSlotIndex: 5 };
    gameSession.applyCardToBoard(copy, 0, 1, copy.createNewCardData(), null);
    expect(copy.getActiveAbilityState()).to.deep.equal({ lockdown: 1, cooldown: 0, baseLockdown: 1, baseCooldown: 1 });
  });

  it('does not let the generic ability action use the General as its source', () => {
    const general = gameSession.getGeneralForPlayer1();
    general.getActiveAbilityState().lockdown = 0;
    general.getActiveAbilityState().cooldown = 0;
    const before = JSON.stringify(general.getActiveAbilityState());
    const actionPoints = general.getActionPoints();
    const action = gameSession.getPlayer1().actionUseActiveAbility(general.getIndex(), { q: 4, r: 0 });
    gameSession.executeAction(action);
    expect(action.getIsValid()).to.equal(false);
    expect(general.getActionPoints()).to.equal(actionPoints);
    expect(JSON.stringify(general.getActiveAbilityState())).to.equal(before);
  });

  it('freezes unit counters while silenced and resumes them from the same values', () => {
    const ModifierSilence = require('../../../../app/sdk/modifiers/modifierSilence.coffee');
    const scout = gameSession.createCardForIdentifier(SDK.Cards.Neutral.PlanarScout);
    scout.setOwnerId(gameSession.getPlayer1Id());
    gameSession.applyCardToBoard(scout, 0, 1, scout.createNewCardData(), null);
    scout.getActiveAbilityState().cooldown = 1;
    gameSession.applyModifierContextObject(ModifierSilence.createContextObject(), scout);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(scout.getActiveAbilityState()).to.include({ lockdown: 1, cooldown: 1 });
    gameSession.executeAction(gameSession.actionEndTurn());
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(scout.getActiveAbilityState()).to.include({ lockdown: 1, cooldown: 1 });
    gameSession.removeModifierFromCardByClass(ModifierSilence, scout);
    gameSession.executeAction(gameSession.actionEndTurn()); // opponent's turn end: no change
    expect(scout.getActiveAbilityState()).to.include({ lockdown: 1, cooldown: 1 });
    gameSession.executeAction(gameSession.actionEndTurn()); // owner's turn end: resumes
    expect(scout.getActiveAbilityState()).to.include({ lockdown: 0, cooldown: 0 });
  });

  it('freezes the General counters while silenced', () => {
    const ModifierSilence = require('../../../../app/sdk/modifiers/modifierSilence.coffee');
    const general = gameSession.getGeneralForPlayer1();
    gameSession.applyModifierContextObject(ModifierSilence.createContextObject(), general);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(general.getActiveAbilityState()).to.include({ lockdown: 2, cooldown: 0 });
    gameSession.executeAction(gameSession.actionEndTurn());
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(general.getActiveAbilityState()).to.include({ lockdown: 2, cooldown: 0 });
    gameSession.removeModifierFromCardByClass(ModifierSilence, general);
    gameSession.executeAction(gameSession.actionEndTurn()); // opponent's turn end: no change
    expect(general.getActiveAbilityState()).to.include({ lockdown: 2, cooldown: 0 });
    gameSession.executeAction(gameSession.actionEndTurn()); // owner's turn end: resumes
    expect(general.getActiveAbilityState()).to.include({ lockdown: 1, cooldown: 0 });
  });

  it('counts counters down at the owning player end turn only', () => {
    const deployed = gameSession.createCardForIdentifier(SDK.Cards.Neutral.PlanarScout);
    deployed.setOwnerId(gameSession.getPlayer1Id());
    gameSession.applyCardToBoard(deployed, 0, 1, deployed.createNewCardData(), null);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(deployed.getActiveAbilityState().lockdown).to.equal(0);
    deployed.getActiveAbilityState().cooldown = 1;
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(deployed.getActiveAbilityState().lockdown).to.equal(0);
    expect(deployed.getActiveAbilityState().cooldown).to.equal(1);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(deployed.getActiveAbilityState().cooldown).to.equal(0);
  });

  it('retains card metadata but does not initialize active ability state outside Practice/Sandbox v2', () => {
    gameSession.setRuleset('practice-sandbox-hex', 1);
    const deployed = gameSession.createCardForIdentifier(SDK.Cards.Neutral.PlanarScout);
    expect(deployed.activeAbility).to.deep.equal({ effectCardId: SDK.Cards.Spell.PhoenixFire, lockdown: 1, cooldown: 1 });
    deployed.setOwnerId(gameSession.getPlayer1Id());
    gameSession.applyCardToBoard(deployed, 0, 1, deployed.createNewCardData(), null);
    expect(deployed.getActiveAbilityState()).to.equal(null);
  });

  it('plays the ability from its original hand slot for one AP and no mana', () => {
    const player = gameSession.getPlayer1();
    const opposingGeneral = gameSession.getGeneralForPlayer2();
    const general = gameSession.getGeneralForPlayer1();
    general.setPosition({ q: 4, r: 0 });
    opposingGeneral.setPosition({ q: 4, r: 4 });
    const position = gameSession.getBoard().getHexNeighbors(general.getPosition()).find((candidate) =>
      gameSession.getBoard().hasTileAtPosition(candidate) && !gameSession.getBoard().getUnitAtPosition(candidate));
    let otherCardSlot = -1;
    let abilitySlot = -1;
    for (let slot = 0; slot < 8; slot++) {
      const handCard = player.getDeck().getCardInHandAtIndex(slot);
      if (handCard?.getId() === SDK.Cards.Neutral.GolemMetallurgist) otherCardSlot = slot;
      if (handCard?.getId() === SDK.Cards.Neutral.PlanarScout) abilitySlot = slot;
    }
    expect(otherCardSlot).to.be.at.least(0);
    expect(abilitySlot).to.be.at.least(0);
    const scoutInHand = player.getDeck().getCardInHandAtIndex(abilitySlot);
    scoutInHand.activeAbility = {effectCardId: SDK.Cards.Spell.PhoenixFire, lockdown: 1, cooldown: 1};
    const otherCardIndex = player.getDeck().getCardIndexInHandAtIndex(otherCardSlot);
    const playScout = player.actionPlayCardFromHand(abilitySlot, position);
    gameSession.executeAction(playScout);

    expect(playScout.getIsValid(), playScout.getValidationMessage()).to.equal(true);
    const scout = gameSession.getBoard().getUnitAtPosition(position);
    const ability = player.getActiveAbilityForHandSlot(abilitySlot);
    expect(ability.unit).to.equal(scout);
    expect(player.getDeck().getCardIndexInHandAtIndex(abilitySlot)).to.equal(null);
    expect(player.getDeck().getCardIndexInHandAtIndex(otherCardSlot)).to.equal(otherCardIndex);

    gameSession.executeAction(gameSession.actionEndTurn());
    gameSession.executeAction(gameSession.actionEndTurn());
    const manaBefore = player.getRemainingMana();
    const useAbility = player.actionUseActiveAbility(scout.getIndex(), opposingGeneral.getPosition());
    gameSession.executeAction(useAbility);

    expect(useAbility.getIsValid(), useAbility.getValidationMessage()).to.equal(true);
    expect(useAbility.getIsValidApplication()).to.equal(true);
    expect(opposingGeneral.getDamage()).to.equal(3);
    expect(scout.getActionPoints()).to.equal(1);
    expect(player.getRemainingMana()).to.equal(manaBefore);
    expect(ability.state).to.include({ lockdown: 0, cooldown: 1 });

    const cooldownRetry = player.actionUseActiveAbility(scout.getIndex(), opposingGeneral.getPosition());
    gameSession.executeAction(cooldownRetry);
    expect(cooldownRetry.getIsValid()).to.equal(false);
    expect(scout.getActionPoints()).to.equal(1);
    expect(ability.state.cooldown).to.equal(1);

    ability.state.cooldown = 0;
    const ModifierSilence = require('../../../../app/sdk/modifiers/modifierSilence.coffee');
    gameSession.applyModifierContextObject(ModifierSilence.createContextObject(), scout);
    expect(player.getActiveAbilityForHandSlot(abilitySlot).silenced).to.equal(true);
    const silencedUse = player.actionUseActiveAbility(scout.getIndex(), opposingGeneral.getPosition());
    gameSession.executeAction(silencedUse);
    expect(silencedUse.getIsValid()).to.equal(false);
    expect(ability.state).to.include({ lockdown: 0, cooldown: 0 });
    expect(scout.getActionPoints()).to.equal(1);
    gameSession.removeModifierFromCardByClass(ModifierSilence, scout);
    expect(player.getActiveAbilityForHandSlot(abilitySlot).silenced).to.equal(false);

    gameSession.executeAction(gameSession.actionEndTurn());
    expect(ability.state.cooldown).to.equal(0);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(ability.state.cooldown).to.equal(0);

    UtilsSDK.executeActionWithoutValidation(scout.actionDie());
    expect(player.getActiveAbilityForHandSlot(abilitySlot)).to.equal(null);
  });

  it('rejects invalid targets and a fresh summon with no action points', () => {
    const player = gameSession.getPlayer1();
    const scout = gameSession.createCardForIdentifier(SDK.Cards.Neutral.PlanarScout);
    scout.setOwnerId(player.getPlayerId());
    gameSession.applyCardToBoard(scout, 1, 0, scout.createNewCardData(), null);
    const state = scout.getActiveAbilityState();
    state.lockdown = 0;
    const enemyGeneral = gameSession.getGeneralForPlayer2();
    const noPoints = player.actionUseActiveAbility(scout.getIndex(), enemyGeneral.getPosition());
    gameSession.executeAction(noPoints);
    expect(noPoints.getIsValid()).to.equal(false);
    expect(scout.getActionPoints()).to.equal(0);
    expect(state.cooldown).to.equal(0);

    scout.refreshExhaustion();
    const invalidTarget = player.actionUseActiveAbility(scout.getIndex(), { q: 99, r: 99 });
    gameSession.executeAction(invalidTarget);
    expect(invalidTarget.getIsValid()).to.equal(false);
    expect(scout.getActionPoints()).to.equal(2);
    expect(state.cooldown).to.equal(0);
  });

  it('uses each general Bloodbound Spell through its L2/C2 signature ability', () => {
    const player = gameSession.getPlayer1();
    const general = gameSession.getGeneralForPlayer1();
    general.setPosition({ q: 4, r: 0 });
    const enemyGeneral = gameSession.getGeneralForPlayer2();
    enemyGeneral.setPosition({ q: 4, r: 4 });
    const ally = gameSession.createCardForIdentifier(SDK.Cards.Neutral.GolemMetallurgist);
    ally.setOwnerId(player.getPlayerId());
    gameSession.applyCardToBoard(ally, 3, 0, null, null);
    const state = general.getActiveAbilityState();
    const generalSignatureData = general.getSignatureCardData();
    const generalSignatureManaCost = generalSignatureData.manaCost;
    expect(state).to.include({ lockdown: 2, cooldown: 0, baseLockdown: 2, baseCooldown: 2 });
    expect(player.getSignatureCardData().activeAbility).to.include({ lockdown: 2, cooldown: 2 });
    expect(player.getSignatureCardData().manaCost).to.equal(0);
    expect(general.getSignatureCardData()).to.equal(generalSignatureData);
    expect(generalSignatureData.activeAbility).to.equal(undefined);
    expect(generalSignatureData.manaCost).to.equal(generalSignatureManaCost);

    gameSession.executeAction(gameSession.actionEndTurn());
    expect(state.lockdown).to.equal(1);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(state.lockdown).to.equal(1);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(state.lockdown).to.equal(0);
    gameSession.executeAction(gameSession.actionEndTurn());

    const signature = player.getCurrentSignatureCard();
    const targetPosition = signature.getValidTargetPositions()[0];
    const manaBefore = player.getRemainingMana();
    const use = player.actionPlaySignatureCard(targetPosition);
    gameSession.executeAction(use);

    expect(use.getIsValid(), use.getValidationMessage()).to.equal(true);
    expect(state.cooldown).to.equal(2);
    expect(general.getActionPoints()).to.equal(1);
    expect(player.getRemainingMana()).to.equal(manaBefore);
    expect(player.getIsSignatureCardActive()).to.equal(false);

    gameSession.executeAction(gameSession.actionEndTurn());
    expect(state.cooldown).to.equal(1);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(state.cooldown).to.equal(1);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(state.cooldown).to.equal(0);
    gameSession.executeAction(gameSession.actionEndTurn());
    expect(state.cooldown).to.equal(0);

    const serialized = JSON.parse(gameSession.serializeToJSON(gameSession));
    const generalData = serialized.cardsByIndex[general.getIndex()];
    expect(generalData.activeAbilityState).to.deep.equal(state);
    const playerData = serialized.players.find((candidate) => candidate.playerId === player.getPlayerId());
    expect(playerData).to.not.have.property('signatureAbilityState');
    // the opponent's counters are untouched by this player's turn ends
    expect(gameSession.getGeneralForPlayer2().getActiveAbilityState()).to.include({ lockdown: 0, cooldown: 0 });
  });
});
