legacy = {id: "legacy", version: 1}
practiceSandboxHex = {id: "practice-sandbox-hex", version: 1}
practiceSandboxHexV2 = {id: "practice-sandbox-hex", version: 2}
practiceSandboxHexV2Config =
  generalHealth: 6000
  generalAttackScale: 100
  bloodboundSpellEffectScale: 100
  methronDamagePerControlPoint: 200
  wallHealth: 2000
GameType = require '../gameType'

RULESETS =
  defaultRuleset: legacy
  byIdAndVersion:
    "legacy:1": legacy
    "practice-sandbox-hex:1": practiceSandboxHex
    "practice-sandbox-hex:2": practiceSandboxHexV2

RULESETS.getRuleset = (rulesetId, rulesetVersion) ->
  return RULESETS.byIdAndVersion["#{rulesetId}:#{rulesetVersion}"] ? null

RULESETS.getRulesetConfig = (rulesetId, rulesetVersion) ->
  return Object.assign({}, practiceSandboxHexV2Config) if RULESETS.isPracticeSandboxV2(rulesetId, rulesetVersion)
  return {}

RULESETS.isPracticeSandboxV2 = (rulesetId, rulesetVersion) ->
  return rulesetId is practiceSandboxHexV2.id and rulesetVersion is practiceSandboxHexV2.version

RULESETS.getServerRulesetForGameType = (gameType) ->
  if gameType == GameType.SinglePlayer
    return practiceSandboxHexV2
  return legacy

RULESETS.assignServerRulesetToSession = (gameSession, gameType) ->
  ruleset = RULESETS.getServerRulesetForGameType(gameType)
  gameSession.setRuleset(ruleset.id, ruleset.version)
  return ruleset

module.exports = RULESETS
