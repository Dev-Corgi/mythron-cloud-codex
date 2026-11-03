Validator = require("./validator")
Player = require("app/sdk/player")
CardType = require("app/sdk/cards/cardType")
Cards = require("app/sdk/cards/cardsLookupComplete")
PlayCardFromHandAction = require("app/sdk/actions/playCardFromHandAction")
PlaySignatureCardAction = require("app/sdk/actions/playSignatureCardAction")
UseActiveAbilityAction = require("app/sdk/actions/useActiveAbilityAction")
ModifierStunned = require("app/sdk/modifiers/modifierStunned")
DamageAction = require("app/sdk/actions/damageAction")
HexTopology = require("app/sdk/rulesets/hexTopology")
HexAttackGeometry = require("app/sdk/rulesets/hexAttackGeometry")
SpellFilterType = require("app/sdk/spells/spellFilterType")
_ = require("underscore")
i18next = require("i18next")

class ValidatorPlayCard extends Validator

  type:"ValidatorPlayCard"
  @type:"ValidatorPlayCard"

  _isInvalidAbilityEffectTarget: (card, sourceUnit, targetPosition) ->
    if card.getId() is Cards.PhobiesAbility.BullRush
      return HexAttackGeometry.getBullRushPath(@getGameSession().getBoard(), sourceUnit, targetPosition).length isnt 4
    target = @getGameSession().getBoard().getCardAtPosition(targetPosition, card.targetType)
    return true unless target?
    return true if target.getIsGeneral() and !card.canTargetGeneral
    if card.spellFilterType is SpellFilterType.AllyDirect
      return target.getOwnerId() isnt sourceUnit.getOwnerId() or target.getIsGeneral()
    if card.spellFilterType is SpellFilterType.EnemyDirect
      return target.getOwnerId() is sourceUnit.getOwnerId()
    return false

  onValidateAction:(event) ->
    super(event)
    gameSession = @getGameSession()
    action = event.action
    if action? and action.getIsValid() and !action.getIsImplicit() and action instanceof PlaySignatureCardAction and gameSession.getIsPracticeSandboxV2()
      # version 2 uses UseActiveAbilityAction for the General's Bloodbound ability
      @invalidateAction(action, action.getTargetPosition(), i18next.t("validators.cannot_do_that_message"))
    else if action? and action.getIsValid() and !action.getIsImplicit() and action instanceof UseActiveAbilityAction
      sourceUnit = gameSession.getCardByIndex(action.sourceUnitIndex)
      state = sourceUnit?.getActiveAbilityState?()
      card = action.getCard()
      targetPosition = action.getTargetPosition()
      if !sourceUnit? or !state? or action.getOwnerId() isnt sourceUnit.getOwnerId() or !sourceUnit.getIsActive() or sourceUnit.getIsSilenced() or sourceUnit.hasActiveModifierClass(ModifierStunned) or state.lockdown > 0 or state.cooldown > 0 or !sourceUnit.getCanUseActiveAbility()
        @invalidateAction(action, targetPosition, i18next.t("validators.card_isnt_ready_message"))
      else if !card? or !(CardType.getIsSpellCardType(card.getType()) or CardType.getIsAbilityEffectCardType(card.getType())) or !card.getIsPositionValidTarget(targetPosition)
        @invalidateAction(action, targetPosition, i18next.t("validators.invalid_card_target_message"))
      else if CardType.getIsAbilityEffectCardType(card.getType()) and @_isInvalidAbilityEffectTarget(card, sourceUnit, targetPosition)
        @invalidateAction(action, targetPosition, i18next.t("validators.invalid_card_target_message"))
      else if sourceUnit.activeAbility?.useRange? and !sourceUnit.getIsGeneral() and (!targetPosition? or HexTopology.getDistance(sourceUnit.getPosition(), targetPosition) > sourceUnit.activeAbility.useRange or (card.getId() is Cards.PhobiesAbility.GroupHug and !gameSession.getBoard().positionsEqual(sourceUnit.getPosition(), targetPosition)))
        @invalidateAction(action, targetPosition, i18next.t("validators.invalid_card_target_message"))
    else if action? and action.getIsValid() and !action.getIsImplicit() and (action instanceof PlayCardFromHandAction or action instanceof PlaySignatureCardAction)
      card = action.getCard()
      targetPosition = action.getTargetPosition()
      owner = action.getOwner()
      if !card?
        # playing nothing
        @invalidateAction(action, targetPosition, i18next.t("validators.invalid_card_message"))
      else if CardType.getIsAbilityEffectCardType(card.getType())
        # Ability effects are entered only by UseActiveAbilityAction.
        @invalidateAction(action, targetPosition, i18next.t("validators.cannot_do_that_message"))
      else if gameSession.getIsRunningAsAuthoritative() and action.cardDataOrIndex? and _.isObject(action.cardDataOrIndex)
        # playing card data instead of index
        @invalidateAction(action, targetPosition, i18next.t("validators.invalid_card_message"))
      else if !card.getIsPositionValidTarget(targetPosition)
        # playing card to board at an invalid position
        @invalidateAction(action, targetPosition, i18next.t("validators.invalid_card_target_message"))
      else if gameSession.getIsRunningAsAuthoritative() or owner.getPlayerId() == gameSession.getMyPlayerId()
        if action instanceof PlayCardFromHandAction
          currentCardIndex = owner.getDeck().getCardIndexInHandAtIndex(action.indexOfCardInHand)
          if card.getIndex() != currentCardIndex or (gameSession.getRulesetId() is "practice-sandbox-hex" and action.expectedHandCardIndex isnt currentCardIndex)
            # playing a card that does not match the index in hand
            @invalidateAction(action, targetPosition, i18next.t("validators.invalid_card_message"))
          else # validate that player is not simply stalling out the game
            actions = []
            currentTurn = @getGameSession().getCurrentTurn()
            for step in currentTurn.getSteps()
              actions = actions.concat(step.getAction().getFlattenedActionTree())

            hasFoundMeaningfulAction = false
            numCardsPlayedFromHand = 0
            for a in actions by -1
              if a instanceof PlayCardFromHandAction
                numCardsPlayedFromHand++
              if a instanceof DamageAction
                hasFoundMeaningfulAction = true
              if numCardsPlayedFromHand >= 10
                break
            if numCardsPlayedFromHand >= 10 and !hasFoundMeaningfulAction
              @invalidateAction(action, targetPosition, "Too many cards played without advancing board state.")
        else if action instanceof PlaySignatureCardAction
          if !card.getOwner().getIsSignatureCardActive()
            # trying to play signature card when it should not be active
            @invalidateAction(action, targetPosition, i18next.t("validators.card_isnt_ready_message"))
          else if card.getIndex() != owner.getCurrentSignatureCardIndex()
            # playing a card that does not match the index of the current signature card
            @invalidateAction(action, targetPosition, i18next.t("validators.invalid_card_message"))

module.exports = ValidatorPlayCard
