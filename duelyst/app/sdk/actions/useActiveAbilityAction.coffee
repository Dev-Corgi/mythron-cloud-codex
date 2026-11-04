PlayCardAction = require './playCardAction'
ModifierStunned = require 'app/sdk/modifiers/modifierStunned'

class UseActiveAbilityAction extends PlayCardAction

  @type: "UseActiveAbilityAction"
  sourceUnitIndex: null

  ###*
   * Resolves the id of the spell an ability source resolves into.
   * Units use their ability definition; a General uses the current signature card data of its owner
   * (so prismatic Generals and PlayerModifierChangeSignatureCard are respected).
   ###
  @getEffectCardId: (gameSession, sourceUnit) ->
    return null unless sourceUnit?
    if sourceUnit.getIsGeneral?()
      return sourceUnit.getOwner?()?.getSignatureCardData?()?.id
    return sourceUnit.activeAbility?.effectCardId

  constructor: (gameSession, ownerId, sourceUnitIndex, targetPosition) ->
    @type ?= UseActiveAbilityAction.type
    @sourceUnitIndex = sourceUnitIndex
    sourceUnit = gameSession?.getCardByIndex(sourceUnitIndex)
    effectCardId = UseActiveAbilityAction.getEffectCardId(gameSession, sourceUnit)
    super(gameSession, ownerId, targetPosition, {id: effectCardId})
    @sourceIndex = sourceUnitIndex

  getSourceUnit: () ->
    return @getGameSession().getCardByIndex(@sourceUnitIndex)

  getIsGeneralAbility: () ->
    return !!@getSourceUnit()?.getIsGeneral?()

  # Mark an embedded move, attack, damage, or heal as ability-originated while
  # preserving the casting Entity as its causal source.
  setAbilityOriginOn: (action) ->
    return action unless action?
    action.setIsAbilityOrigin(true)
    action.setSource(@getSourceUnit())
    @addSubAction(action) if @getIndex()?
    return action

  _execute: () ->
    session = @getGameSession()
    sourceUnit = session.getCardByIndex(@sourceUnitIndex)
    state = sourceUnit?.getActiveAbilityState?()
    return unless sourceUnit? and state? and sourceUnit.getIsActive() and !sourceUnit.getIsSilenced() and !sourceUnit.hasActiveModifierClass(ModifierStunned) and state.lockdown is 0 and state.cooldown is 0 and sourceUnit.getCanUseActiveAbility()
    sourceUnit.recordAttack()
    sourceUnit.startActiveAbilityCooldown()
    @_private.source = sourceUnit
    super()

    # the General's Bloodbound spell is replaced after use, as PlaySignatureCardAction did
    if sourceUnit.getIsGeneral()
      owner = sourceUnit.getOwner()
      if owner?
        owner.setIsSignatureCardActive(false)
        session.executeAction(owner.actionGenerateSignatureCard())

module.exports = UseActiveAbilityAction
