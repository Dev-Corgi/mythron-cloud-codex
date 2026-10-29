legacy = {id: "legacy", version: 1}
practiceSandboxHex = {id: "practice-sandbox-hex", version: 1}
GameType = require '../gameType'

RULESETS =
  defaultRuleset: legacy
  byIdAndVersion:
    "legacy:1": legacy
    "practice-sandbox-hex:1": practiceSandboxHex

RULESETS.getRuleset = (rulesetId, rulesetVersion) ->
  return RULESETS.byIdAndVersion["#{rulesetId}:#{rulesetVersion}"] ? null

RULESETS.getServerRulesetForGameType = (gameType) ->
  if gameType == GameType.SinglePlayer
    return practiceSandboxHex
  return legacy

RULESETS.assignServerRulesetToSession = (gameSession, gameType) ->
  ruleset = RULESETS.getServerRulesetForGameType(gameType)
  gameSession.setRuleset(ruleset.id, ruleset.version)
  return ruleset

module.exports = RULESETS
