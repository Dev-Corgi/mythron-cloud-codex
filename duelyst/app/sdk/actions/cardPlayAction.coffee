PlayCardFromHandAction = require './playCardFromHandAction'
UseActiveAbilityAction = require './useActiveAbilityAction'
SignaturePlay = require './signaturePlay'

###
View-facing classification for actions that present a played card. Keep this
separate from SignaturePlay, whose signature-only meaning is used by modifiers.
###
CardPlayAction =
  matchesSignature: (action) ->
    return SignaturePlay.matches(action)

  matches: (action) ->
    isUnitAbility = action instanceof UseActiveAbilityAction and not action.getIsGeneralAbility() and action.getSourceUnit()?
    return action instanceof PlayCardFromHandAction or CardPlayAction.matchesSignature(action) or isUnitAbility

  shouldRevealToPlayer: (action, playerId) ->
    return CardPlayAction.matches(action) and action.getOwnerId() isnt playerId

module.exports = CardPlayAction
