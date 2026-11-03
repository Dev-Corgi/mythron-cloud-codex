Sandbox = require './sandbox'
Deck = require 'app/sdk/cards/deck'

class SandboxDeveloper extends Sandbox

  @type: "SandboxDeveloper"
  type: "SandboxDeveloper"

  skipMulligan: true

  setupSessionModes: (gameSession) ->
    super(gameSession)
    gameSession.setRuleset("legacy", 1)
    gameSession.setIsDeveloperMode(true)

module.exports = SandboxDeveloper
