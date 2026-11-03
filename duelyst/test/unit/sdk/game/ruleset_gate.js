const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const { expect } = require('chai');
const Logger = require('../../../../app/common/logger.coffee');
const SDK = require('../../../../app/sdk.coffee');
const UtilsSDK = require('../../../utils/utils_sdk');

Logger.enabled = false;

describe('practice sandbox v2 ruleset gate', () => {
  let gameSession;

  beforeEach(() => {
    UtilsSDK.setupSession([{ id: SDK.Cards.Faction1.General }], [{ id: SDK.Cards.Faction2.General }], true, true);
    gameSession = SDK.GameSession.getInstance();
  });

  afterEach(() => SDK.GameSession.reset());

  it('is true only for practice sandbox version 2', () => {
    gameSession.setRuleset('legacy', 1);
    expect(gameSession.getIsPracticeSandboxV2()).to.equal(false);
    gameSession.setRuleset('practice-sandbox-hex', 1);
    expect(gameSession.getIsPracticeSandboxV2()).to.equal(false);
    gameSession.setRuleset('practice-sandbox-hex', 2);
    expect(gameSession.getIsPracticeSandboxV2()).to.equal(true);
  });

  it('keeps General ability state out of legacy and version 1 matches', () => {
    const general = gameSession.getGeneralForPlayer1();
    gameSession.setRuleset('practice-sandbox-hex', 1);
    expect(general.getActiveAbilityState()).to.equal(null);
    expect(general.activeAbility).to.equal(null);
    general.initializeActiveAbility();
    expect(general.getActiveAbilityState()).to.equal(null);
    expect(gameSession.getPlayer1().getIsSignatureCardActive()).to.equal(false);

    gameSession.setRuleset('legacy', 1);
    gameSession.initializeGeneralActiveAbilities();
    expect(general.getActiveAbilityState()).to.equal(null);
    expect(general.activeAbility).to.equal(null);
  });

  it('initializes General ability state once when version 2 is assigned after setup', () => {
    const general = gameSession.getGeneralForPlayer1();
    expect(general.getActiveAbilityState()).to.equal(null);
    gameSession.setRuleset('practice-sandbox-hex', 2);
    expect(general.getActiveAbilityState()).to.deep.equal({ lockdown: 2, cooldown: 0, baseLockdown: 2, baseCooldown: 2 });
    expect(general.activeAbility).to.include({ lockdown: 2, cooldown: 2 });
    expect(gameSession.getGeneralForPlayer2().getActiveAbilityState()).to.include({ lockdown: 2, cooldown: 0 });

    general.startActiveAbilityCooldown();
    expect(general.getActiveAbilityState().cooldown).to.equal(2);
    gameSession.setRuleset('practice-sandbox-hex', 2);
    general.initializeActiveAbility();
    expect(general.getActiveAbilityState().cooldown).to.equal(2);

    general.decrementActiveAbilityCounters();
    expect(general.getActiveAbilityState()).to.include({ lockdown: 1, cooldown: 1 });
    general.decrementActiveAbilityCounters();
    general.decrementActiveAbilityCounters();
    expect(general.getActiveAbilityState()).to.include({ lockdown: 0, cooldown: 0 });
  });

  it('preserves General ability state when the General is applied to the board again', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    const general = gameSession.getGeneralForPlayer1();
    general.getActiveAbilityState().lockdown = 0;
    general.startActiveAbilityCooldown();
    const position = general.getPosition();
    general.onApplyToBoard(gameSession.getBoard(), position.x, position.y, null);
    general.onRemoveFromBoard(gameSession.getBoard(), position.x, position.y, null);
    general.onApplyToBoard(gameSession.getBoard(), position.x, position.y, null);
    expect(general.getActiveAbilityState()).to.include({ lockdown: 0, cooldown: 2 });
  });

  it('restores General ability state from a serialized version 2 session', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    gameSession.getGeneralForPlayer1().decrementActiveAbilityCounters();
    const serialized = JSON.parse(gameSession.serializeToJSON(gameSession));
    expect(serialized.players.every((playerData) => !('signatureAbilityState' in playerData))).to.equal(true);

    SDK.GameSession.reset();
    UtilsSDK.setupSession([{ id: SDK.Cards.Faction1.General }], [{ id: SDK.Cards.Faction2.General }], true, true);
    const restored = SDK.GameSession.getInstance();
    restored.deserializeSessionFromFirebase(serialized);

    expect(restored.getIsPracticeSandboxV2()).to.equal(true);
    expect(restored.getGeneralForPlayer1().getActiveAbilityState()).to.include({ lockdown: 1, cooldown: 0, baseCooldown: 2 });
    expect(restored.getGeneralForPlayer2().getActiveAbilityState()).to.include({ lockdown: 2, cooldown: 0 });
    const reserialized = JSON.parse(restored.serializeToJSON(restored));
    expect(reserialized.cardsByIndex).to.deep.equal(serialized.cardsByIndex);
  });

  it('moves players[].signatureAbilityState from an old version 2 snapshot onto the General', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    const serialized = JSON.parse(gameSession.serializeToJSON(gameSession));
    for (const cardData of Object.values(serialized.cardsByIndex)) {
      delete cardData.activeAbilityState;
      delete cardData.activeAbility;
    }
    serialized.players[0].signatureAbilityState = { lockdown: 0, cooldown: 1, baseLockdown: 2, baseCooldown: 2 };

    SDK.GameSession.reset();
    UtilsSDK.setupSession([{ id: SDK.Cards.Faction1.General }], [{ id: SDK.Cards.Faction2.General }], true, true);
    const restored = SDK.GameSession.getInstance();
    restored.deserializeSessionFromFirebase(serialized);

    expect(restored.getGeneralForPlayer1().getActiveAbilityState()).to.include({ lockdown: 0, cooldown: 1, baseLockdown: 2, baseCooldown: 2 });
    expect(restored.getGeneralForPlayer2().getActiveAbilityState()).to.include({ lockdown: 2, cooldown: 0 });
    expect(restored.getPlayer1().signatureAbilityState).to.equal(undefined);
    expect(JSON.parse(restored.serializeToJSON(restored)).players[0]).to.not.have.property('signatureAbilityState');
  });

  it('restores old player-level state for player 2 and lets existing General state win', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    const serialized = JSON.parse(gameSession.serializeToJSON(gameSession));
    const general1 = gameSession.getGeneralForPlayer1();
    const general2 = gameSession.getGeneralForPlayer2();
    delete serialized.cardsByIndex[general2.getIndex()].activeAbilityState;
    serialized.cardsByIndex[general1.getIndex()].activeAbilityState = { lockdown: 0, cooldown: 2, baseLockdown: 2, baseCooldown: 2 };
    serialized.players[0].signatureAbilityState = { lockdown: 2, cooldown: 0, baseLockdown: 2, baseCooldown: 2 };
    serialized.players[1].signatureAbilityState = { lockdown: 0, cooldown: 1, baseLockdown: 2, baseCooldown: 2 };

    SDK.GameSession.reset();
    UtilsSDK.setupSession([{ id: SDK.Cards.Faction1.General }], [{ id: SDK.Cards.Faction2.General }], true, true);
    const restored = SDK.GameSession.getInstance();
    restored.deserializeSessionFromFirebase(serialized);

    expect(restored.getGeneralForPlayer1().getActiveAbilityState()).to.include({ lockdown: 0, cooldown: 2 });
    expect(restored.getGeneralForPlayer2().getActiveAbilityState()).to.include({ lockdown: 0, cooldown: 1, baseCooldown: 2 });
  });

  it('keeps the signature card ability definition complete before Generals are initialized', () => {
    gameSession.setRuleset('practice-sandbox-hex', 2);
    const general = gameSession.getGeneralForPlayer1();
    general.activeAbility = null;
    expect(gameSession.getPlayer1().getSignatureCardData().activeAbility).to.include({ lockdown: 2, cooldown: 2 });
    expect(gameSession.getPlayer1().getActiveAbilityForHandSlot(undefined)).to.equal(null);
  });
});
