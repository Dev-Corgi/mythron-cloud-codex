Logger = require 'app/common/logger'
HealAction = require 'app/sdk/actions/healAction'
DamageAction = require 'app/sdk/actions/damageAction'
Modifier = require './modifier'

class ModifierHealSelfWhenDealingDamage extends Modifier

  type:"ModifierHealSelfWhenDealingDamage"
  @type:"ModifierHealSelfWhenDealingDamage"

  @description:"Whenever this deals damage, restore that much Health to it"

  healRatio: 1.0

  @getDescription: (contextObject) ->
    healRatio = contextObject?.healRatio ? 1.0
    return @description if healRatio == 1.0
    percentage = Math.floor(healRatio * 100)
    return "Lifegain — Whenever this minion deals damage, restore Health to it equal to #{percentage}% of the damage dealt (rounded down)."

  activeInHand: false
  activeInDeck: false
  activeInSignatureCards: false
  activeOnBoard: true

  onBeforeAction: (event) ->
    super(event)
    action = event.action
    if action instanceof DamageAction and action.getSource() == @getCard()
      if @getCard().getHP() < @getCard().getMaxHP()
        healAction = @getCard().getGameSession().createActionForType(HealAction.type)
        healAction.setTarget(@getCard())
        damageToHeal = action.getTotalDamageAmount()
        # Phobies Lifegain is based on HP actually removed, excluding overkill.
        # Keep the legacy 1.0 behavior unchanged for existing cards.
        if @healRatio != 1.0 and action.getTarget()?
          damageToHeal = Math.min(damageToHeal, action.getTarget().getHP())
        damageToHeal = Math.floor(damageToHeal * @healRatio)
        if damageToHeal > @getCard().getDamage()
          damageToHeal = @getCard().getDamage()
        healAction.setHealAmount(damageToHeal)
        @getCard().getGameSession().executeAction(healAction)

module.exports = ModifierHealSelfWhenDealingDamage
