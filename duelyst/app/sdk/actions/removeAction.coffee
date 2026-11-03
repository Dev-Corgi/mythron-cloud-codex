Action = require './action'
CardType = require 'app/sdk/cards/cardType'

class RemoveAction extends Action

  @type:"RemoveAction"

  constructor: () ->
    @type ?= RemoveAction.type
    super

  _execute: () ->
    super()

    target = @getTarget()
    targetPosition = @getTargetPosition()
    if @getGameSession().getRulesetId() is 'practice-sandbox-hex'
      @getGameSession().removeCardFromBoard(target, targetPosition.q, targetPosition.r, @)
    else
      @getGameSession().removeCardFromBoard(target, targetPosition.x, targetPosition.y, @)

module.exports = RemoveAction
