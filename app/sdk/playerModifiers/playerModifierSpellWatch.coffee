PlayerModifier = require './playerModifier'
PlayCardFromHandAction = require 'app/sdk/actions/playCardFromHandAction'
SignaturePlay = require 'app/sdk/actions/signaturePlay'
CardType = require 'app/sdk/cards/cardType'
Stringifiers = require 'app/sdk/helpers/stringifiers'

class PlayerModifierSpellWatch extends PlayerModifier

  type:"PlayerModifierSpellWatch"
  @type:"PlayerModifierSpellWatch"

  onBeforeAction: (e) ->
    super(e)

    action = e.action

    # watch for a spell (but not a followup) being cast by player who owns this entity
    if (action instanceof PlayCardFromHandAction or SignaturePlay.matches(action)) and action.getOwnerId() is @getCard().getOwnerId() and action.getCard()?.type is CardType.Spell
      @onSpellWatch(action)

  onSpellWatch: (action) ->
    # override me in sub classes to implement special behavior

module.exports = PlayerModifierSpellWatch
