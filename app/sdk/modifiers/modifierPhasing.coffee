CONFIG = require 'app/common/config'
Modifier = require './modifier'

class ModifierPhasing extends Modifier

  type: "ModifierPhasing"
  @type: "ModifierPhasing"

  maxStacks: 1

  attributeBuffs:
    speed: CONFIG.SPEED_INFINITE

  getIsAllowedToBeActiveForCache: () ->
    return super() and @getGameSession().getRulesetId() is 'practice-sandbox-hex' and @getGameSession().getRulesetVersion() is 2

module.exports = ModifierPhasing
