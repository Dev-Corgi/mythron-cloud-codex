const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');
const { expect } = require('chai');
const CONFIG = require('../../../../app/common/config');
const SDK = require('../../../../app/sdk.coffee');
const UtilsSDK = require('../../../utils/utils_sdk');
const Logger = require('../../../../app/common/logger.coffee');
const BonusManaAction = require('../../../../app/sdk/actions/bonusManaAction.coffee');
const BonusManaCoreAction = require('../../../../app/sdk/actions/bonusManaCoreAction.coffee');
const RestoreManaAction = require('../../../../app/sdk/actions/restoreManaAction.coffee');

Logger.enabled = false;

describe('persistent reserve-funded mana', () => {
  const deck1 = [{ id: SDK.Cards.Faction1.General }];
  const deck2 = [{ id: SDK.Cards.Faction2.General }];

  afterEach(() => SDK.GameSession.reset());

  function setup(hex) {
    SDK.GameSession.reset();
    const session = SDK.GameSession.getInstance();
    session.setIsRunningAsAuthoritative(true);
    session.setIsDeveloperMode(true);
    if (hex) session.setRuleset('practice-sandbox-hex', 1);
    SDK.GameSetup.setupNewSession(session, {
      userId: 'player1_id', name: 'player1_name', deck: deck1,
    }, {
      userId: 'player2_id', name: 'player2_name', deck: deck2,
    });
    session.setStatus(SDK.GameStatus.active);
    return session;
  }

  it('allocates the fixed opening pools and transfers reserve before end-turn observers', () => {
    const session = setup(true);
    const first = session.getPlayer1();
    const second = session.getPlayer2();
    expect([first.getRemainingMana(), first.getReserveMana()]).to.deep.equal([3, 17]);
    expect([second.getRemainingMana(), second.getReserveMana()]).to.deep.equal([4, 16]);
    let observed;
    session.getEventBus().on('end_turn', () => {
      observed = [first.getRemainingMana(), first.getMaximumMana(), first.getReserveMana()];
    });
    session.p_endTurn();
    expect(observed).to.deep.equal([6, 6, 14]);
    expect(second.getReserveMana()).to.equal(16);
  });

  it('preserves mana through start turns and exhausts reserve only by available amount', () => {
    const session = setup(true);
    const first = session.getPlayer1();
    first.remainingMana = 8;
    first.maximumMana = 8;
    first.setReserveMana(2);
    session.p_endTurn();
    expect(first.getRemainingMana()).to.equal(10);
    expect(first.getReserveMana()).to.equal(0);
    session.p_startTurn();
    expect(first.getRemainingMana()).to.equal(10);
    expect(first.getMaximumMana()).to.equal(10);
  });

  it('does not transfer depleted reserve on later own turns or repeat an ended turn', () => {
    const session = setup(true);
    const first = session.getPlayer1();
    first.remainingMana = 5;
    first.maximumMana = 5;
    first.setReserveMana(0);
    let firstEndTurnEvents = 0;
    session.getEventBus().on('end_turn', (event) => {
      if (event.turn.getPlayerId() === first.getPlayerId()) firstEndTurnEvents += 1;
    });

    session.executeAction(session.actionEndTurn());
    expect(first.getRemainingMana()).to.equal(5);
    expect(first.getReserveMana()).to.equal(0);
    expect(firstEndTurnEvents).to.equal(1);

    session.executeAction(session.actionEndTurn());
    expect(session.getCurrentPlayer()).to.equal(first);
    session.executeAction(session.actionEndTurn());
    expect(first.getRemainingMana()).to.equal(5);
    expect(first.getMaximumMana()).to.equal(5);
    expect(first.getReserveMana()).to.equal(0);
    expect(firstEndTurnEvents).to.equal(2);

    session.p_endTurn();
    expect(first.getRemainingMana()).to.equal(5);
    expect(first.getReserveMana()).to.equal(0);
    expect(firstEndTurnEvents).to.equal(2);
  });

  it('transfers each player reserve in three-mana chunks with a final partial payout', () => {
    const session = setup(true);
    const first = session.getPlayer1();
    const second = session.getPlayer2();
    first.remainingMana = 1;
    second.remainingMana = 2;
    const players = [first, second];
    const manaAfterPayout = [1, 2];
    const expectedReserve = [17, 16];
    const payouts = [[], []];

    for (let turn = 0; turn < 12; turn += 1) {
      const ownerIndex = session.getCurrentPlayer() === first ? 0 : 1;
      const owner = players[ownerIndex];
      const payout = Math.min(3, expectedReserve[ownerIndex]);
      session.executeAction(session.actionEndTurn());
      expectedReserve[ownerIndex] -= payout;
      manaAfterPayout[ownerIndex] += payout;
      payouts[ownerIndex].push(payout);
      expect(owner.getRemainingMana()).to.equal(manaAfterPayout[ownerIndex]);
      expect(owner.getMaximumMana()).to.equal(3 + ownerIndex + payouts[ownerIndex].reduce((sum, n) => sum + n, 0));
      expect(owner.getReserveMana()).to.equal(expectedReserve[ownerIndex]);

      // Starting the opponent's turn must leave this player's spendable mana untouched.
      expect(session.getCurrentPlayer().getRemainingMana()).to.equal(manaAfterPayout[1 - ownerIndex]);
    }

    expect(payouts[0]).to.deep.equal([3, 3, 3, 3, 3, 2]);
    expect(payouts[1]).to.deep.equal([3, 3, 3, 3, 3, 1]);
  });

  it('charges spendable mana when a hex card is played', () => {
    const session = setup(true);
    const player = session.getPlayer1();
    player.remainingMana = 3;
    UtilsSDK.executeActionWithoutValidation(new SDK.PutCardInHandAction(
      session, player.getPlayerId(), { id: SDK.Cards.Faction1.WindbladeAdept },
    ));
    const card = player.getDeck().getCardInHandAtIndex(0);
    const cost = card.getManaCost();
    expect(cost).to.be.greaterThan(0);
    UtilsSDK.executeActionWithoutValidation(player.actionPlayCardFromHand(0, -1, 3));
    expect(player.getRemainingMana()).to.equal(3 - cost);
  });

  it('keeps legacy starting mana and turn progression unchanged', () => {
    const session = setup(false);
    const first = session.getPlayer1();
    expect(first.getReserveMana()).to.equal(0);
    expect(first.getMaximumMana()).to.equal(2);
    session.p_endTurn();
    session.p_startTurn();
    expect(session.getCurrentPlayer().getMaximumMana()).to.equal(3);
    first.maximumMana = CONFIG.MAX_MANA + 2;
    expect(first.getMaximumMana()).to.equal(CONFIG.MAX_MANA);
  });

  it('serializes reserve in player snapshots and setup data for replay reconstruction', () => {
    const session = setup(true);
    const first = session.getPlayer1();
    session.p_endTurn();
    const snapshot = JSON.parse(session.serializeToJSON(session));
    expect(snapshot.players[0].reserveMana).to.equal(14);
    expect(snapshot.gameSetupData.players[0].reserveMana).to.equal(17);

    const restored = SDK.GameSession.create();
    restored.deserializeSessionFromFirebase(snapshot);
    expect(restored.getPlayer1().getReserveMana()).to.equal(14);
    expect(restored.getPlayer1().getMaximumMana()).to.equal(6);

    const replay = SDK.GameSession.create();
    SDK.GameSetup.setupNewSessionFromExistingSessionData(replay, snapshot);
    expect(replay.getPlayer1().getReserveMana()).to.equal(17);
    expect(replay.getPlayer1().getMaximumMana()).to.equal(3);
  });

  it('restores reserve, mana, and end-turn action history from an executed sequence', () => {
    const session = setup(true);
    const first = session.getPlayer1();
    first.remainingMana = 2;
    session.executeAction(session.actionEndTurn());
    const snapshot = JSON.parse(session.serializeToJSON(session));
    const restored = SDK.GameSession.create();
    restored.deserializeSessionFromFirebase(snapshot);

    expect(restored.getPlayer1().getReserveMana()).to.equal(first.getReserveMana());
    expect(restored.getPlayer1().getRemainingMana()).to.equal(first.getRemainingMana());
    expect(restored.getPlayer1().getMaximumMana()).to.equal(first.getMaximumMana());
    expect(restored.getTurns().length).to.equal(session.getTurns().length);
    expect(JSON.stringify(restored.getTurns())).to.equal(JSON.stringify(session.getTurns()));
  });

  it('blocks bonus, bonus-core, and restore grants in hex matches', () => {
    const session = setup(true);
    const player = session.getPlayer1();
    const general = session.getGeneralForPlayer(player);
    const bonusMana = new BonusManaAction(session);
    bonusMana.setTarget(general);
    UtilsSDK.executeActionWithoutValidation(bonusMana);
    UtilsSDK.executeActionWithoutValidation(new BonusManaCoreAction(session));
    const restore = new RestoreManaAction(session);
    restore.setManaAmount(3);
    UtilsSDK.executeActionWithoutValidation(restore);
    expect(player.getRemainingMana()).to.equal(3);
    expect(player.getMaximumMana()).to.equal(3);
    expect(player.getReserveMana()).to.equal(17);
  });

  it('normalizes and caps reserve assignments to the unallocated 20-point pool', () => {
    const session = setup(true);
    const player = session.getPlayer1();
    player.setReserveMana(Infinity);
    expect(player.getReserveMana()).to.equal(0);
    player.setReserveMana(100);
    expect(player.getReserveMana()).to.equal(17);
    player.setReserveMana(4.8);
    expect(player.getReserveMana()).to.equal(4);
    player.setReserveMana(NaN);
    expect(player.getReserveMana()).to.equal(0);
    player.maximumMana = 8;
    player.setReserveMana(100);
    expect(player.getReserveMana()).to.equal(12);
  });

  it('normalizes missing and oversized reserve values when restoring a hex snapshot', () => {
    const session = setup(true);
    const snapshot = JSON.parse(session.serializeToJSON(session));
    snapshot.players[0].maximumMana = 8;
    delete snapshot.players[0].reserveMana;
    const restoredMissing = SDK.GameSession.create();
    restoredMissing.deserializeSessionFromFirebase(snapshot);
    expect(restoredMissing.getPlayer1().getReserveMana()).to.equal(12);

    snapshot.players[0].reserveMana = 100;
    const restoredOversized = SDK.GameSession.create();
    restoredOversized.deserializeSessionFromFirebase(snapshot);
    expect(restoredOversized.getPlayer1().getReserveMana()).to.equal(12);
  });
});
