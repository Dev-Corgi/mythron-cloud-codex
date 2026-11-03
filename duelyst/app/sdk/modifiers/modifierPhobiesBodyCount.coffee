ModifierKillWatch = require './modifierKillWatch'
Modifier = require './modifier'

class ModifierPhobiesBodyCount extends ModifierKillWatch

  type: "ModifierPhobiesBodyCount"
  @type: "ModifierPhobiesBodyCount"

  @modifierName: "Body Count"
  @description: "Whenever this minion destroys an enemy by attacking, it permanently gains +200 Attack."

  @createContextObject: (options) ->
    return super(false, true, options)

  onKillWatch: (action) ->
    buff = Modifier.createContextObjectWithAttributeBuffs(200, 0, {
      modifierName: "Body Count"
      description: "Permanently gains +200 Attack."
    })
    @getGameSession().applyModifierContextObject(buff, @getCard())

module.exports = ModifierPhobiesBodyCount
