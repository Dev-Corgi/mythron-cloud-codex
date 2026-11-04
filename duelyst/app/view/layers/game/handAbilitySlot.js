/* eslint-disable prefer-object-spread, mocha/no-empty-description --
   the build uses babel es2015 (no object spread), and describeHandAbilitySlot is not a mocha suite */
/**
 * Pure decision logic for showing a unit's active ability in its emptied hand slot,
 * and for the live counters shown on ability faces in the inspect views.
 *
 * Nothing in this module touches cocos nodes. Inputs are plain SDK objects (read through
 * duck typing) so every rule can be covered by mocha tests.
 */

const LOCKDOWN = 'lockdown';
const COOLDOWN = 'cooldown';

// Number colors from active-ability-rules.md (#e8b9ff and #7be6f5).
const COUNTER_STYLES = {
  [LOCKDOWN]: {
    type: LOCKDOWN,
    ringResource: 'collection_card_ability_lockdown_ring',
    iconResource: 'collection_card_ability_lockdown_icon',
    color: { r: 232, g: 185, b: 255 },
  },
  [COOLDOWN]: {
    type: COOLDOWN,
    ringResource: 'collection_card_ability_cooldown_ring',
    iconResource: 'collection_card_ability_cooldown_icon',
    color: { r: 123, g: 230, b: 245 },
  },
};

function toCount(value) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * Only the nonzero counter is shown. Lockdown wins when (against the rules) both are nonzero.
 * @param {Object} state active ability state with lockdown and cooldown
 * @returns {{type: string, value: number}|null} null when the ability is ready
 */
function getLiveCounter(state) {
  if (state == null) return null;
  const lockdown = toCount(state.lockdown);
  if (lockdown > 0) return { type: LOCKDOWN, value: lockdown };
  const cooldown = toCount(state.cooldown);
  if (cooldown > 0) return { type: COOLDOWN, value: cooldown };
  return null;
}

function isValidEffectCardId(effectCardId) {
  return Number.isInteger(effectCardId) && effectCardId > 0;
}

/**
 * Usability follows the rules for using an ability: both counters are 0, the unit is not silenced,
 * the unit can use its active ability and it is my turn (and selection is not locked, like a spell).
 */
function isAbilityUsable({
  state, silenced, canUse, isMyTurn, selectionLocked,
}) {
  return state != null
    && getLiveCounter(state) == null
    && !silenced
    && !!canUse
    && !!isMyTurn
    && !selectionLocked;
}

/**
 * Describes what a hand slot should show for the result of Player.getActiveAbilityForHandSlot.
 * @param {{unit: Object, definition: Object, state: Object, silenced: Boolean}|null} slotInfo
 * @param {{isMyTurn: Boolean, selectionLocked: Boolean}} [context]
 * @returns {Object|null} null when the slot should stay empty
 */
function describeHandAbilitySlot(slotInfo, context) {
  if (slotInfo == null || slotInfo.unit == null || slotInfo.state == null || slotInfo.definition == null) return null;
  const { unit, definition, state } = slotInfo;
  const { effectCardId } = definition;
  if (!isValidEffectCardId(effectCardId)) return null;

  const ctx = context || {};
  const silenced = !!slotInfo.silenced;
  const canUse = typeof unit.getCanUseActiveAbility === 'function' ? !!unit.getCanUseActiveAbility() : false;
  const counter = getLiveCounter(state);
  const usable = isAbilityUsable({
    state, silenced, canUse, isMyTurn: ctx.isMyTurn, selectionLocked: ctx.selectionLocked,
  });
  const unitIndex = typeof unit.getIndex === 'function' ? unit.getIndex() : null;

  return {
    unit,
    unitIndex,
    effectCardId,
    counter,
    usable,
    silenced,
    // no mana: using an ability never costs mana
    showManaCost: false,
    key: [unitIndex, effectCardId, counter ? `${counter.type}:${counter.value}` : 'ready', usable ? 1 : 0, silenced ? 1 : 0].join('|'),
  };
}

/**
 * Looks up and describes the ability of a hand slot. Returns null outside Practice/Sandbox v2
 * (legacy and version 1 matches never have ability slots).
 * @param {Player} player SDK player owning the hand
 * @param {Number} slotIndex
 * @param {Object|Function} [context] context, or a function returning it
 */
function getHandAbilitySlot(player, slotIndex, context) {
  if (player == null || slotIndex == null || typeof player.getActiveAbilityForHandSlot !== 'function') return null;
  const slotInfo = player.getActiveAbilityForHandSlot(slotIndex);
  if (slotInfo == null) return null;
  // the context may be a function so it is only built for slots that actually have an ability
  return describeHandAbilitySlot(slotInfo, typeof context === 'function' ? context() : context);
}

/**
 * Face data for CardNode.setPhobiesAbilityFaceEnabled.
 * With a live state the face is flagged `live` and carries the single nonzero counter;
 * without a state (collection, no session, unit not on board) the definition is returned
 * untouched so the face keeps showing the base counters.
 */
function buildAbilityFaceData(definition, state) {
  if (definition == null) return null;
  if (state == null) return definition;
  return Object.assign({}, definition, {
    lockdown: toCount(state.lockdown),
    cooldown: toCount(state.cooldown),
    live: true,
    liveCounter: getLiveCounter(state),
  });
}

function isV2Session(session) {
  return !!session && typeof session.getIsPracticeSandboxV2 === 'function' && !!session.getIsPracticeSandboxV2();
}

/**
 * Face data for the ability card shown beside an inspected deployed unit.
 * @param {Object} unit inspected card
 * @param {Number} relatedCardId card shown in the related position
 */
function getUnitAbilityFaceData(unit, relatedCardId) {
  if (unit == null || unit.activeAbility == null || unit.activeAbility.effectCardId !== relatedCardId) return null;
  const state = typeof unit.getActiveAbilityState === 'function' ? unit.getActiveAbilityState() : null;
  return buildAbilityFaceData(unit.activeAbility, state);
}

/**
 * Face data for the General's Bloodbound (signature) card in a version 2 match.
 * @param {Object} sdkCard inspected card
 * @param {Object} session game session
 * @returns {Object|null} null when the card is not a signature card with a live ability
 */
function getSignatureAbilityFaceData(sdkCard, session) {
  if (!isV2Session(session) || sdkCard == null || typeof sdkCard.isSignatureCard !== 'function' || !sdkCard.isSignatureCard()) return null;
  const owner = typeof sdkCard.getOwner === 'function' ? sdkCard.getOwner() : null;
  if (owner == null || typeof session.getGeneralForPlayerId !== 'function') return null;
  const general = session.getGeneralForPlayerId(owner.getPlayerId());
  const state = general && typeof general.getActiveAbilityState === 'function' ? general.getActiveAbilityState() : null;
  if (state == null) return null;
  let definition = general.activeAbility;
  if (definition == null && typeof general.getGeneralActiveAbilityDefinition === 'function') {
    definition = general.getGeneralActiveAbilityDefinition();
  }
  return buildAbilityFaceData(Object.assign({}, definition, { effectCardId: sdkCard.getId() }), state);
}

/**
 * Face data for the effect card shown by a hand ability slot.
 */
function getSlotAbilityFaceData(slotModel, definition) {
  if (slotModel == null || slotModel.unit == null) return null;
  const { unit } = slotModel;
  const state = typeof unit.getActiveAbilityState === 'function' ? unit.getActiveAbilityState() : null;
  return buildAbilityFaceData(Object.assign({}, definition || unit.activeAbility, { effectCardId: slotModel.effectCardId }), state);
}

/**
 * Face data for the primary (large) inspect card.
 * @param {Object} params
 * @param {Object} params.sdkCard inspected card
 * @param {Object|null} params.slotModel model of the hand ability slot being inspected, if any
 * @param {Object} params.session game session
 */
function getPrimaryInspectFaceData({ sdkCard, slotModel, session }) {
  if (!isV2Session(session)) return null;
  if (slotModel != null) return getSlotAbilityFaceData(slotModel);
  return getSignatureAbilityFaceData(sdkCard, session);
}

/**
 * Badge geometry, scaled from ability-layout.json (2x canvas pixels, so half size at normal card size).
 * Offsets are relative to the ring center in cocos coordinates (y points up).
 * @param {Object} layout parsed ability-layout.json
 * @param {String} type LOCKDOWN or COOLDOWN
 */
function getBadgeGeometry(layout, type) {
  const counter = layout.counters[type];
  return {
    ringSize: counter.size[0] / 2,
    iconSize: counter.iconSize[0] / 2,
    iconOffset: {
      x: (counter.iconCenter[0] - counter.center[0]) / 2,
      y: -(counter.iconCenter[1] - counter.center[1]) / 2,
    },
  };
}

module.exports = {
  LOCKDOWN,
  COOLDOWN,
  COUNTER_STYLES,
  getLiveCounter,
  isValidEffectCardId,
  isAbilityUsable,
  describeHandAbilitySlot,
  getHandAbilitySlot,
  buildAbilityFaceData,
  getUnitAbilityFaceData,
  getSignatureAbilityFaceData,
  getSlotAbilityFaceData,
  getPrimaryInspectFaceData,
  getBadgeGeometry,
};
