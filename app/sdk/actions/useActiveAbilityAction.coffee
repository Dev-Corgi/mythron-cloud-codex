PlayCardAction = require './playCardAction'

class UseActiveAbilityAction extends PlayCardAction

  @type: "UseActiveAbilityAction"
  sourceUnitIndex: null

  constructor: (gameSession, ownerId, sourceUnitIndex, targetPosition) ->
    @type ?= UseActiveAbilityAction.type
    @sourceUnitIndex = sourceUnitIndex
    sourceUnit = gameSession?.getCardByIndex(sourceUnitIndex)
    effectCardId = sourceUnit?.activeAbility?.effectCardId
    super(gameSession, ownerId, targetPosition, {id: effectCardId})
    @sourceIndex = sourceUnitIndex

  _execute: () ->
    session = @getGameSession()
    sourceUnit = session.getCardByIndex(@sourceUnitIndex)
    state = sourceUnit?.getActiveAbilityState?()
    return unless sourceUnit? and state? and sourceUnit.getIsActive() and !sourceUnit.getIsSilenced() and state.lockdown is 0 and state.cooldown is 0 and sourceUnit.spendActionPoint()
    sourceUnit.startActiveAbilityCooldown()
    @_private.source = sourceUnit
    super()

module.exports = UseActiveAbilityAction
