Action = require './action'
HexAttackGeometry = require 'app/sdk/rulesets/hexAttackGeometry'

class PhobiesPushAction extends Action
  @type: 'PhobiesPushAction'

  constructor: (gameSession) ->
    @type ?= PhobiesPushAction.type
    super(gameSession)

  _execute: () ->
    super()
    source = @getSource()
    target = @getTarget()
    board = @getGameSession().getBoard()
    return unless source? and target? and source.getIsActive() and target.getIsActive()
    destination = HexAttackGeometry.getPushDestination(board, @getSourcePosition(), target.getPosition())
    return unless destination? and board.positionsEqual(destination, @getTargetPosition())
    @targetStartPosition = Object.assign({}, target.getPosition())
    target.setPosition(destination)
    target.updateCachedState?()

module.exports = PhobiesPushAction
