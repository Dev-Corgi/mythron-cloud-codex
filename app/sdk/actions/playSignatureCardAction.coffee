CONFIG =     require 'app/common/config'
Logger =     require 'app/common/logger'
PlayCardAction =     require './playCardAction'

class PlaySignatureCardAction extends PlayCardAction

  @type:"PlaySignatureCardAction"

  constructor: () ->
    @type ?= PlaySignatureCardAction.type
    super

  getManaCost: () ->
    if @getGameSession()?.getIsPracticeSandboxV2?()
      return 0
    card = @getCard()
    if card? then card.getManaCost() else super()

  _execute: () ->
    owner = @getOwner()
    session = @getGameSession()
    if session?.getIsPracticeSandboxV2?()
      general = session.getGeneralForPlayerId(@getOwnerId())
      state = general?.getActiveAbilityState()
      return unless general? and state? and general.getIsActive() and !general.getIsSilenced() and general.getActionPoints() > 0 and state.lockdown is 0 and state.cooldown is 0
      return unless general.spendActionPoint()
      general.startActiveAbilityCooldown()
      @_private.source = general
    super()

    owner = @getCard()?.getOwner()
    if owner?
      if @getGameSession()?.getIsPracticeSandboxV2?()
        owner.setIsSignatureCardActive(false)
        owner.getGameSession().executeAction(owner.actionGenerateSignatureCard())
        return
      # set signature card as inactive
      owner.setIsSignatureCardActive(false)

      # generate new signature card
      @getGameSession().executeAction(owner.actionGenerateSignatureCard())

module.exports = PlaySignatureCardAction
