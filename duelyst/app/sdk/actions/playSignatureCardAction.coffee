CONFIG =     require 'app/common/config'
Logger =     require 'app/common/logger'
PlayCardAction =     require './playCardAction'

###
Legacy and version 1 play of the General's signature card.
Version 2 uses UseActiveAbilityAction and rejects this action in its validator.
###
class PlaySignatureCardAction extends PlayCardAction

  @type:"PlaySignatureCardAction"

  constructor: () ->
    @type ?= PlaySignatureCardAction.type
    super

  getManaCost: () ->
    card = @getCard()
    if card? then card.getManaCost() else super()

  _execute: () ->
    super()

    owner = @getCard()?.getOwner()
    if owner?
      # set signature card as inactive
      owner.setIsSignatureCardActive(false)

      # generate new signature card
      @getGameSession().executeAction(owner.actionGenerateSignatureCard())

module.exports = PlaySignatureCardAction
