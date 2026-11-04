Validator = require("./validator")
Entity = require("app/sdk/entities/entity")
CardType = require("app/sdk/cards/cardType")
ApplyCardToBoardAction = require("app/sdk/actions/applyCardToBoardAction")
RandomPlayCardSilentlyAction = require("app/sdk/actions/randomPlayCardSilentlyAction")
i18next = require("i18next")
ModifierCustomSpawn = require 'app/sdk/modifiers/modifierCustomSpawn'
PlayCardFromHandAction = require 'app/sdk/actions/playCardFromHandAction'

class ValidatorApplyCardToBoard extends Validator

  type:"ValidatorApplyCardToBoard"
  @type:"ValidatorApplyCardToBoard"

  onValidateAction:(event) ->
    super(event)
    action = event.action
    if action? and action.getIsValid() and action instanceof ApplyCardToBoardAction
      # applying a card to board
      card = action.getCard()
      targetPosition = action.getTargetPosition()
      if !card?
        @invalidateAction(action, targetPosition, i18next.t("validators.invalid_card_message"))
      else if @getGameSession().getIsPracticeSandboxV2() and card.getType() is CardType.Unit and !@getGameSession().getBoard().hasTileAtPosition(targetPosition)
        # Movement-capable units may occupy holes; summons never may.
        @invalidateAction(action, targetPosition, i18next.t("validators.obstructed_position_message"))
      else if !(action instanceof RandomPlayCardSilentlyAction) and !@getGameSession().getBoard().isOnBoard(targetPosition)
        # applying a card to a position outside the board
        @invalidateAction(action, targetPosition, i18next.t("validators.position_off_board_message"))
      else if !(action instanceof RandomPlayCardSilentlyAction) and card instanceof Entity and !(action instanceof PlayCardFromHandAction and card.hasActiveModifierClass(ModifierCustomSpawn))
        obstruction = @getGameSession().getBoard().getSummonObstructionAtPositionForEntity(targetPosition, card)
        if obstruction? and !obstruction.getIsRemoved() and @getGameSession().getCanCardBeScheduledForRemoval(obstruction, true)
          # applying an entity to an obstructed position
          @invalidateAction(action, targetPosition, i18next.t("validators.obstructed_position_message"))

module.exports = ValidatorApplyCardToBoard
