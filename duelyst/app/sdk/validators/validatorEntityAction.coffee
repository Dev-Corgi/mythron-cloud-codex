Validator = require("./validator")
MoveAction = require("app/sdk/actions/moveAction")
AttackAction = require("app/sdk/actions/attackAction")
Entity = require("app/sdk/entities/entity")
HexAttackGeometry = require("app/sdk/rulesets/hexAttackGeometry")
HexTopology = require("app/sdk/rulesets/hexTopology")
i18next = require("i18next")

class ValidatorEntityAction extends Validator

  type:"ValidatorEntityAction"
  @type:"ValidatorEntityAction"

  onValidateAction:(event) ->
    super(event)
    action = event.action
    if action? and action.getIsValid() and !action.getIsImplicit()
      if action.getType() == MoveAction.type
        source = action.getSource()
        targetPosition = action.getTargetPosition()
        if !(source instanceof Entity)
          @invalidateAction(action, targetPosition, i18next.t("validators.not_a_valid_move_message"))
        else if @getGameSession().getRulesetId() is 'practice-sandbox-hex' and (!(action.getIsAbilityDashStep?() and action.getIsAbilityDashStep() and action.getIsAbilityOrigin?() or @_isAxialActionSourceValid(action, source)) or !@getGameSession().getBoard().isOnBoard(targetPosition))
          @invalidateAction(action, targetPosition, i18next.t("validators.invalid_move_position_message"))
        else if !source.getCanMove(action.getIsAbilityOrigin?() or false)
          @invalidateAction(action, action.getSourcePosition(), i18next.t("validators.unit_cannot_move_message"))
        else if action.getIsAbilityDashStep?() and action.getIsAbilityDashStep() and action.getIsAbilityOrigin?() and !HexAttackGeometry.isLegalBullRushStep(@getGameSession().getBoard(), source, action.getSourcePosition(), targetPosition)
          @invalidateAction(action, targetPosition, i18next.t("validators.invalid_move_position_message"))
        else if !(action.getIsAbilityDashStep?() and action.getIsAbilityDashStep() and action.getIsAbilityOrigin?()) and !source.getMovementRange().getIsPositionValid(@getGameSession().getBoard(), source, targetPosition, action.getIsAbilityOrigin?() or false)
          @invalidateAction(action, targetPosition, i18next.t("validators.invalid_move_position_message"))
      else if action.getType() == AttackAction.type
        source = action.getSource()
        targetPosition = action.getTargetPosition()
        if !(source instanceof Entity)
          @invalidateAction(action, targetPosition, i18next.t("validators.invalid_attack_message"))
        else if source.getIsOutOfActionPoints()
          @invalidateAction(action, action.getSourcePosition(), i18next.t("validators.unit_cannot_attack_message"))
        else if @getGameSession().getRulesetId() is 'practice-sandbox-hex' and (!(@_isPhobiesMovementAttack(action, source) and action.getIsAbilityOrigin?() and action.getIsAbilityOrigin()) and !@_isAxialActionSourceValid(action, source) or !@getGameSession().getBoard().isOnBoard(targetPosition))
          @invalidateAction(action, targetPosition, i18next.t("validators.invalid_attack_position_message"))
        else if @getGameSession().getIsPracticeSandboxV2() and action.getTarget() isnt source.getAttackRange().getTargetAtPosition(@getGameSession().getBoard(), source, targetPosition)
          @invalidateAction(action, targetPosition, i18next.t("validators.invalid_attack_message"))
        else if !source.getCanAttack(action.getIsAbilityOrigin?() or false) and !action.getIsAutomatic()
          @invalidateAction(action, action.getSourcePosition(), i18next.t("validators.unit_cannot_attack_message"))
        else if @_isPhobiesMovementAttack(action, source) and action.getIsAbilityOrigin?() and action.getIsAbilityOrigin() and (HexTopology.getDistance(action.getSourcePosition(), targetPosition) isnt 1)
          @invalidateAction(action, targetPosition, i18next.t("validators.invalid_attack_position_message"))
        else if !@_isPhobiesMovementAttack(action, source) and !source.getAttackRange().getIsPositionValid(@getGameSession().getBoard(), source, targetPosition)
          @invalidateAction(action, targetPosition, i18next.t("validators.invalid_attack_position_message"))

  _isAxialActionSourceValid: (action, source) ->
    sourcePosition = action.getSourcePosition()
    currentPosition = source.getPosition()
    return sourcePosition? and Number.isInteger(sourcePosition.q) and Number.isInteger(sourcePosition.r) and sourcePosition.q is currentPosition.q and sourcePosition.r is currentPosition.r

  _isPhobiesMovementAttack: (action, source) ->
    return source?.activeAbility?.effectCardId in [51012, 51013, 51014]

module.exports = ValidatorEntityAction
