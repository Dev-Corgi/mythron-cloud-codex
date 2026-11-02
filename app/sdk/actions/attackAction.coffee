CONFIG =     require 'app/common/config'
DamageAction =   require './damageAction'
HexAttackGeometry = require 'app/sdk/rulesets/hexAttackGeometry'
_ = require 'underscore'

class AttackAction extends DamageAction

  @type:"AttackAction"

  constructor: (gameSession) ->
    @type ?= AttackAction.type
    super(gameSession)

  getPrivateDefaults: (gameSession) ->
    p = super(gameSession)

    # cache
    p.isStrikebackAllowed = true # normally target of attack actions will strike back, but in some cases strike back should be supressed

    return p

  getDamageAmount: () ->
    # attack damage amount is always source's atk value
    source = @getSource()
    if source? then return source.getATK() else return 0

  setDamageAmount: () ->
    # does nothing for attacks

  setIsStrikebackAllowed: (isStrikebackAllowed) ->
    @_private.isStrikebackAllowed = isStrikebackAllowed

  getIsStrikebackAllowed: () ->
    return @_private.isStrikebackAllowed

  _execute: () ->
    attacker = @getSource()
    isArea = attacker? and @_isVersion2StatDrivenAreaAttack(attacker) and !@getIsImplicit()
    if isArea
      # The selected target only validates activation. The explosion resolves
      # each victim independently below, including when the selected target is
      # behind a blocking Wall.
      selectedTarget = @getTarget()
      @setTarget(null)
      super()
      @setTarget(selectedTarget)
    else
      super()

    if attacker?
      if isArea
        board = attacker.getGameSession().getBoard()
        origin = attacker.getPosition()
        for victim in board.getEntities()
          # damage applies immediately but deaths resolve after the loop, so a Wall this attack destroys still shields victims behind it
          continue unless HexAttackGeometry.isAreaVictim(board, attacker, origin, attacker.getReach(), victim)
          areaAttack = attacker.actionAttack(victim)
          areaAttack.setParentAction(@)
          attacker.getGameSession().executeAction(areaAttack)
      if !@getIsImplicit()
        if attacker.getUsesActionPoints?() and attacker.getUsesActionPoints()
          attacker.spendActionPoint()
        attacker.setAttacksMade(attacker.getAttacksMade() + 1)

  _isVersion2StatDrivenAreaAttack: (attacker) ->
    session = attacker?.getGameSession?()
    return !!(session? and session.getIsPracticeSandboxV2() and attacker.getAttackType?() is 'area' and attacker.hasOwnProperty('attackType') and attacker.attackType is 'area')

module.exports = AttackAction
