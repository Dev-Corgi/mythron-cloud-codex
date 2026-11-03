ModifierStartTurnWatch = require './modifierStartTurnWatch'
HealAction = require 'app/sdk/actions/healAction'

class ModifierPhobiesRegatorate extends ModifierStartTurnWatch

  type: "ModifierPhobiesRegatorate"
  @type: "ModifierPhobiesRegatorate"

  @modifierName: "Regatorate"
  @description: "At the start of your turn, restore 400 Health to this minion."

  @getDescription: ->
    return @description

  onTurnWatch: (action) ->
    return unless @getCard().getDamage() > 0
    healAction = new HealAction(@getGameSession())
    healAction.setOwnerId(@getCard().getOwnerId())
    healAction.setSource(@getCard())
    healAction.setTarget(@getCard())
    healAction.setHealAmount(400)
    @getGameSession().executeAction(healAction)

module.exports = ModifierPhobiesRegatorate
