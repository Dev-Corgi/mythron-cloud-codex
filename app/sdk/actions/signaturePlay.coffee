PlaySignatureCardAction = require './playSignatureCardAction'
UseActiveAbilityAction = require './useActiveAbilityAction'

###
Single place that answers "is this action a play of the General's signature (Bloodbound) spell?".
Legacy and version 1 matches use PlaySignatureCardAction. Version 2 uses UseActiveAbilityAction
with a General as its source.
###
SignaturePlay =
  matches: (action) ->
    return action instanceof PlaySignatureCardAction or (action instanceof UseActiveAbilityAction and action.getIsGeneralAbility())

module.exports = SignaturePlay
