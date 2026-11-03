/* eslint-disable import/no-unresolved, mocha/max-top-level-suites */
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
require('coffeescript/register');
const { expect } = require('chai');

const CardPlayAction = require('../../../app/sdk/actions/cardPlayAction.coffee');
const PlayCardFromHandAction = require('../../../app/sdk/actions/playCardFromHandAction.coffee');
const PlaySignatureCardAction = require('../../../app/sdk/actions/playSignatureCardAction.coffee');
const ReplaceCardFromHandAction = require('../../../app/sdk/actions/replaceCardFromHandAction.coffee');
const MoveAction = require('../../../app/sdk/actions/moveAction.coffee');
const AttackAction = require('../../../app/sdk/actions/attackAction.coffee');
const UseActiveAbilityAction = require('../../../app/sdk/actions/useActiveAbilityAction.coffee');
const SignaturePlay = require('../../../app/sdk/actions/signaturePlay.coffee');

const makeAction = (Action, extra = {}) => Object.assign(Object.create(Action.prototype), extra);

describe('view played card action classification', () => {
  it('recognizes hand plays, legacy signatures, General abilities, and unit abilities', () => {
    const handPlay = makeAction(PlayCardFromHandAction);
    const legacySignature = makeAction(PlaySignatureCardAction);
    const generalAbility = makeAction(UseActiveAbilityAction, { getIsGeneralAbility: () => true });
    const unitAbility = makeAction(UseActiveAbilityAction, {
      getIsGeneralAbility: () => false,
      getSourceUnit: () => ({}),
    });

    expect(CardPlayAction.matches(handPlay)).to.equal(true);
    expect(CardPlayAction.matches(legacySignature)).to.equal(true);
    expect(CardPlayAction.matches(generalAbility)).to.equal(true);
    expect(CardPlayAction.matches(unitAbility)).to.equal(true);
    expect(CardPlayAction.matchesSignature(generalAbility)).to.equal(true);
    expect(CardPlayAction.matchesSignature(unitAbility)).to.equal(false);
    expect(SignaturePlay.matches(unitAbility)).to.equal(false);
  });

  it('does not newly classify non-card actions', () => {
    expect(CardPlayAction.matches({})).to.equal(false);
    expect(CardPlayAction.matches(null)).to.equal(false);
    const missingUnit = makeAction(UseActiveAbilityAction, {
      getIsGeneralAbility: () => false,
      getSourceUnit: () => null,
    });
    expect(CardPlayAction.matches(makeAction(MoveAction))).to.equal(false);
    expect(CardPlayAction.matches(makeAction(AttackAction))).to.equal(false);
    expect(CardPlayAction.matches(makeAction(ReplaceCardFromHandAction))).to.equal(false);
    expect(CardPlayAction.matches(missingUnit)).to.equal(false);
  });

  it('reveals card plays only to a viewer who is not the action owner', () => {
    const opponentAbility = makeAction(UseActiveAbilityAction, {
      getIsGeneralAbility: () => false,
      getSourceUnit: () => ({}),
      getOwnerId: () => 'opponent',
    });
    const ownAbility = makeAction(UseActiveAbilityAction, {
      getIsGeneralAbility: () => false,
      getSourceUnit: () => ({}),
      getOwnerId: () => 'viewer',
    });

    expect(CardPlayAction.shouldRevealToPlayer(opponentAbility, 'viewer')).to.equal(true);
    expect(CardPlayAction.shouldRevealToPlayer(ownAbility, 'viewer')).to.equal(false);
    expect(CardPlayAction.shouldRevealToPlayer({}, 'viewer')).to.equal(false);

    const ownerAction = (Action, extra = {}) => makeAction(Action, { getOwnerId: () => 'opponent', ...extra });
    const handPlay = ownerAction(PlayCardFromHandAction);
    const legacySignature = ownerAction(PlaySignatureCardAction);
    const generalAbility = ownerAction(UseActiveAbilityAction, { getIsGeneralAbility: () => true });
    expect(CardPlayAction.shouldRevealToPlayer(handPlay, 'viewer')).to.equal(true);
    expect(CardPlayAction.shouldRevealToPlayer(legacySignature, 'viewer')).to.equal(true);
    expect(CardPlayAction.shouldRevealToPlayer(generalAbility, 'viewer')).to.equal(true);
    expect(CardPlayAction.matchesSignature(handPlay)).to.equal(false);
    expect(CardPlayAction.matchesSignature(legacySignature)).to.equal(true);
    expect(CardPlayAction.matchesSignature(generalAbility)).to.equal(true);
    expect(CardPlayAction.matchesSignature(opponentAbility)).to.equal(false);
  });
});

describe('view follow-up selection events', () => {
  let PlayerClass;
  const selectionEvents = [];
  const session = { getGeneralForPlayerId: () => null };
  const sdk = {
    IntentType: { NeutralIntent: 'neutral', DeckIntent: 'deck' },
    CardPlayAction,
    PlayCardFromHandAction,
    UseActiveAbilityAction,
    SignaturePlay,
    GameSession: { getInstance: () => session },
    NetworkManager: { getInstance: () => ({ broadcastGameEvent: (event) => selectionEvents.push(event) }) },
  };

  before(() => {
    const Module = require('module');
    const originalLoad = Module._load;
    global.cc = Object.assign(global.cc || {}, {
      Class: {
        extend: (properties) => {
          const Class = function PlayerStub() {};
          Class.prototype = properties;
          return Class;
        },
      },
    });
    Module._load = (request, parent, isMain) => {
      if (parent && parent.filename.endsWith(`${path.sep}Player.js`)) {
        if (request === 'app/sdk') return sdk;
        if (request === 'app/common/event_types') {
          return {
            network_game_select: 'network_game_select',
            followup_card_start: 'followup_card_start',
            followup_card_stop: 'followup_card_stop',
          };
        }
        return {};
      }
      return originalLoad.call(this, request, parent, isMain);
    };
    try {
      PlayerClass = require('../../../app/view/Player');
    } finally {
      Module._load = originalLoad;
    }
  });

  function runSelection(playedByAction) {
    selectionEvents.length = 0;
    const gameLayer = {
      getIsActive: () => true,
      getNodeForSdkCard: () => null,
      updateReadinessTagForAllEntities() {},
      stopShowingInspectCard() {},
      getEventBus: () => ({ trigger() {} }),
      updateMouseCursor() {},
    };
    const player = Object.create(PlayerClass.prototype);
    Object.assign(player, {
      followupCard: null,
      getScene: () => ({ getGameLayer: () => gameLayer }),
      getSdkPlayer: () => ({ getPlayerId: () => 'player1' }),
      getIsMyPlayer: () => true,
      getIsAltPlayer: () => false,
      getIsPlayer2: () => false,
      getIntentType: () => 'target',
      setIntentType() {},
      _showFollowupFX() {},
      showCardTiles() {},
    });
    const rootCard = { getAppliedToBoardByAction: () => playedByAction };
    player.setFollowupCard({ getRootCard: () => rootCard });
    return selectionEvents[0];
  }

  it('broadcasts the unit ability source slot without General signature fields', () => {
    const unit = { getActiveAbilityState: () => ({ handSlotIndex: 5 }) };
    const unitAbility = makeAction(UseActiveAbilityAction, {
      getIsGeneralAbility: () => false,
      getSourceUnit: () => unit,
    });
    const event = runSelection(unitAbility);

    expect(event).to.include({ type: 'network_game_select', handIndex: 5, intentType: 'target' });
    expect(event).not.to.have.property('player1SignatureCard');
    expect(event).not.to.have.property('player2SignatureCard');
  });

  it('preserves General signature selection fields', () => {
    const generalAbility = makeAction(UseActiveAbilityAction, { getIsGeneralAbility: () => true });
    const event = runSelection(generalAbility);

    expect(event).to.include({ type: 'network_game_select', intentType: 'target', player1SignatureCard: true });
    expect(event).not.to.have.property('handIndex');
    expect(event).not.to.have.property('player2SignatureCard');
  });
});
