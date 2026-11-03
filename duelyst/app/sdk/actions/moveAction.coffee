CONFIG =     require 'app/common/config'
Logger =     require 'app/common/logger'
Action =       require './action'
CardType =       require 'app/sdk/cards/cardType'

class MoveAction extends Action

  @type:"MoveAction"
  isAbilityDashStep: false

  constructor: () ->
    @type ?= MoveAction.type
    super

  getPrivateDefaults: (gameSession) ->
    p = super(gameSession)

    p.cachedPath = null

    return p

  # target and source should always be the same
  getTarget: @::getSource

  getPath:() ->
    if !@_private.cachedPath?
      entity = @getTarget()
      if @getIsAbilityDashStep() and @getIsAbilityOrigin()
        @_private.cachedPath = [entity.getPosition(), @getTargetPosition()]
      else
        @_private.cachedPath = entity.getMovementRange().getPathTo(@getGameSession().getBoard(), entity, @getTargetPosition(), @getIsAbilityOrigin())
    return @_private.cachedPath

  setIsAbilityDashStep: (value) ->
    @isAbilityDashStep = !!value

  getIsAbilityDashStep: () ->
    return !!@isAbilityDashStep

  _execute: () ->
    super()

    entity = @getTarget()
    #Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "MoveAction::execute - moving entity #{entity?.getLogName()} to (#{@getTargetPosition().x},#{@getTargetPosition().y})"

    # force path regeneration before moving entity
    @_private.cachedPath = null
    @getPath()

    # move entity
    entity.setPosition(@getTargetPosition())
    entity.getMovementRange().flushCachedState()
    entity.getAttackRange().flushCachedState()
    entity.recordMove(@getIsAbilityOrigin())

module.exports = MoveAction
