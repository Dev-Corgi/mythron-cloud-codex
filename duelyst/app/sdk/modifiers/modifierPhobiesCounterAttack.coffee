ModifierTakeDamageWatch = require './modifierTakeDamageWatch'
Modifier = require './modifier'
DamageAction = require 'app/sdk/actions/damageAction'
CardType = require 'app/sdk/cards/cardType'

class ModifierPhobiesCounterAttack extends ModifierTakeDamageWatch

  type: "ModifierPhobiesCounterAttack"
  @type: "ModifierPhobiesCounterAttack"

  @modifierName: "Counter Attack"
  @description: "Whenever this minion takes damage, deal 35% of that damage (rounded down) to the damage source."

  @getDescription: ->
    return @description

  onBeforeAction: (event) ->
    super(event)
    action = event.action
    if action instanceof DamageAction and action.getTarget() == @getCard() and !@isCounterAttackDamage(action)
      @_private.phobiesDamageBefore ?= {}
      @_private.phobiesDamageBefore[action.getIndex()] = @getCard().getHP()

  onDamageTaken: (action) ->
    return if @isCounterAttackDamage(action)
    damageBefore = @_private.phobiesDamageBefore?[action.getIndex()]
    delete @_private.phobiesDamageBefore[action.getIndex()] if @_private.phobiesDamageBefore?
    return unless damageBefore?

    appliedDamage = Math.max(damageBefore - @getCard().getHP(), 0)
    reflectedDamage = Math.floor(appliedDamage * 0.35)
    return unless reflectedDamage > 0

    targetToDamage = action.getSource()?.getAncestorCardOfType(CardType.Unit)
    if !targetToDamage?
      targetToDamage = @getGameSession().getGeneralForOpponentOfPlayerId(@getCard().getOwnerId())
    return unless targetToDamage?

    damageAction = new DamageAction(@getGameSession())
    damageAction.setOwnerId(@getCard().getOwnerId())
    damageAction.setSource(@getCard())
    damageAction.setTarget(targetToDamage)
    damageAction.setDamageAmount(reflectedDamage)
    @getGameSession().executeAction(damageAction)

  isCounterAttackDamage: (action) ->
    return action.getCreatedByTriggeringModifier() and action.getTriggeringModifier()?.type == @type

module.exports = ModifierPhobiesCounterAttack
