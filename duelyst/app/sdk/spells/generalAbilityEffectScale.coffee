# Effect magnitudes scale only while resolving a v2 General ability.
module.exports = (spell, sourceAction) ->
  session = spell.getGameSession()
  root = sourceAction?.getRootAction?() ? sourceAction
  return 1 unless session.getIsPracticeSandboxV2() and root?.getIsGeneralAbility?() and root.getIsGeneralAbility()
  # A triggered secondary spell can share the causal root without being its effect.
  return 1 unless root.getCard?() is spell
  return session.getRulesetConfig().bloodboundSpellEffectScale
