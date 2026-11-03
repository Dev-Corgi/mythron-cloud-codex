Modifier = require './modifier'
DamageAction = require 'app/sdk/actions/damageAction'

class ModifierPhobiesHeartAttack extends Modifier

  type: "ModifierPhobiesHeartAttack"
  @type: "ModifierPhobiesHeartAttack"

  @modifierName: "Heart Attack"
  @description: "Deals +400 damage when attacking the enemy General."

  activeInHand: false
  activeInDeck: false
  activeInSignatureCards: false
  activeOnBoard: true

  @getDescription: ->
    return @description

  onModifyActionForExecution: (event) ->
    super(event)
    action = event.action
    if action instanceof DamageAction and action.getSource() == @getCard() and action.getTarget()?.getIsGeneral() and action.getTarget().getOwnerId() != @getCard().getOwnerId()
      action.setChangedByModifier(@)
      action.changeDamageBy(400)

module.exports = ModifierPhobiesHeartAttack
