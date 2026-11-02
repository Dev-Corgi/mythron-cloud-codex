Action = require './action'

class SetExhaustionAction extends Action

  @type:"SetExhaustionAction"

  exhausted: null
  movesMade: null
  attacksMade: null
  actionPoints: null
  actionPointsSpentThisTurn: null

  constructor: () ->
    @type ?= SetExhaustionAction.type
    super

  setExhausted: (val) ->
    @exhausted = val

  getExhausted: () ->
    return @exhausted

  setMovesMade: (val) ->
    @movesMade = val

  getMovesMade: () ->
    return @movesMade

  setAttacksMade: (val) ->
    @attacksMade = val

  getAttacksMade: () ->
    return @attacksMade

  setActionPoints: (val) ->
    @actionPoints = val

  setActionPointsSpentThisTurn: (val) ->
    @actionPointsSpentThisTurn = val

  _execute: () ->
    super()
    target = @getTarget()
    if target?
      # match new target's readiness state to that of original unit
      if @exhausted? then target.setExhausted(@exhausted)
      if @movesMade? then target.setMovesMade(@movesMade)
      if @attacksMade? then target.setAttacksMade(@attacksMade)
      if @actionPoints? and target.getUsesActionPoints?() and target.getUsesActionPoints() then target.setActionPoints(@actionPoints)
      if @actionPointsSpentThisTurn? and target.getUsesActionPoints?() and target.getUsesActionPoints() then target.setHasSpentActionPointThisTurn(@actionPointsSpentThisTurn)

module.exports = SetExhaustionAction
