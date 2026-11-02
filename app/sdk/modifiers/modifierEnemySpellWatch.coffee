Modifier = require './modifier'
PlayCardFromHandAction = require 'app/sdk/actions/playCardFromHandAction'
SignaturePlay = require 'app/sdk/actions/signaturePlay'
CardType = require 'app/sdk/cards/cardType'

class ModifierEnemySpellWatch extends Modifier

  type:"ModifierEnemySpellWatch"
  @type:"ModifierEnemySpellWatch"

  @modifierName:"Enemy Spell Watch"
  @description: "Enemy Spell Watch"

  activeInHand: false
  activeInDeck: false
  activeInSignatureCards: false
  activeOnBoard: true

  fxResource: ["FX.Modifiers.ModifierSpellWatch"]

  onBeforeAction: (e) ->
    super(e)

    action = e.action

    # watch for a spell (but not a followup) being cast by player who owns this entity
    if (action instanceof PlayCardFromHandAction or SignaturePlay.matches(action)) and action.getOwnerId() isnt @getCard().getOwnerId() and action.getCard()?.type is CardType.Spell
      @onEnemySpellWatch(action)

  onEnemySpellWatch: (action) ->
    # override me in sub classes to implement special behavior

module.exports = ModifierEnemySpellWatch
