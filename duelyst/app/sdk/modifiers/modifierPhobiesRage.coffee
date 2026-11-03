ModifierMyGeneralDamagedWatch = require './modifierMyGeneralDamagedWatch'
Modifier = require './modifier'

class ModifierPhobiesRage extends ModifierMyGeneralDamagedWatch

  type: "ModifierPhobiesRage"
  @type: "ModifierPhobiesRage"

  @modifierName: "Rage"
  @description: "When your General has 3000 or less Health, this minion permanently gains +300 Attack."

  rageTriggered: false

  @createContextObject: (options) ->
    contextObject = super(options)
    contextObject.rageTriggered = false
    return contextObject

  @getDescription: ->
    return @description

  onDamageDealtToGeneral: (action) ->
    return if @rageTriggered
    general = action.getTarget()
    return unless general.getHP() <= 3000
    @rageTriggered = true
    buff = Modifier.createContextObjectWithAttributeBuffs(300, 0, {
      modifierName: "Rage"
      description: "Permanently gains +300 Attack."
    })
    @getGameSession().applyModifierContextObject(buff, @getCard())

module.exports = ModifierPhobiesRage
