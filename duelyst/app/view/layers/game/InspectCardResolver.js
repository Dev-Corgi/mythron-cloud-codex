const V2_RULESET_ID = 'practice-sandbox-hex';
const V2_RULESET_VERSION = 2;

/**
 * Resolves the secondary card shown beside an inspected card.
 * Active ability data takes precedence only in Practice/Sandbox v2.
 */
function getRelatedInspectCardId(sdkCard, rulesetId, rulesetVersion) {
  if (sdkCard == null) return null;

  if (rulesetId === V2_RULESET_ID && rulesetVersion === V2_RULESET_VERSION && sdkCard.activeAbility != null) {
    const effectCardId = sdkCard.activeAbility.effectCardId;
    return Number.isInteger(effectCardId) && effectCardId > 0 ? effectCardId : null;
  }

  const referencedCardData = sdkCard.getReferencedCardData && sdkCard.getReferencedCardData();
  return referencedCardData && referencedCardData.id || null;
}

module.exports = { getRelatedInspectCardId };
