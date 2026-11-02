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

  it('keeps signature ability state out of legacy and version 1 matches', () => {
    const player = gameSession.getPlayer1();
    gameSession.setRuleset('practice-sandbox-hex', 1);
    expect(player.getSignatureAbilityState()).to.equal(null);
    player.initializeSignatureAbilityState();
    expect(player.getSignatureAbilityState()).to.equal(null);
  });

  it('initializes signature ability state when version 2 is assigned and does not reset it later', () => {
    const player = gameSession.getPlayer1();
    gameSession.setRuleset('practice-sandbox-hex', 2);
    expect(player.getSignatureAbilityState()).to.deep.equal({ lockdown: 2, cooldown: 0, baseLockdown: 2, baseCooldown: 2 });

    player.startSignatureAbilityCooldown();
    expect(player.getSignatureAbilityState().cooldown).to.equal(2);
    player.initializeSignatureAbilityState();
    expect(player.getSignatureAbilityState().cooldown).to.equal(2);

    player.decrementSignatureAbilityCounters();
    expect(player.getSignatureAbilityState()).to.include({ lockdown: 1, cooldown: 1 });
    player.decrementSignatureAbilityCounters();
    player.decrementSignatureAbilityCounters();
    expect(player.getSignatureAbilityState()).to.include({ lockdown: 0, cooldown: 0 });
  });

  it('restores signature ability state from a serialized version 2 session', () => {
    const player = gameSession.getPlayer1();
    gameSession.setRuleset('practice-sandbox-hex', 2);
    player.decrementSignatureAbilityCounters();
    const serialized = JSON.parse(gameSession.serializeToJSON(gameSession));

    SDK.GameSession.reset();
    UtilsSDK.setupSession([{ id: SDK.Cards.Faction1.General }], [{ id: SDK.Cards.Faction2.General }], true, true);
    const restored = SDK.GameSession.getInstance();
    restored.deserializeSessionFromFirebase(serialized);

    expect(restored.getIsPracticeSandboxV2()).to.equal(true);
    expect(restored.getPlayer1().getSignatureAbilityState()).to.include({ lockdown: 1, cooldown: 0, baseCooldown: 2 });
    expect(restored.getPlayer2().getSignatureAbilityState()).to.include({ lockdown: 2, cooldown: 0 });
  });
});
