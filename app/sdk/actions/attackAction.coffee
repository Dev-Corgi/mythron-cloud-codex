CONFIG =     require 'app/common/config'
DamageAction =   require './damageAction'
CardType =       require 'app/sdk/cards/cardType'
Cards =          require 'app/sdk/cards/cardsLookupComplete'
HexTopology =    require 'app/sdk/rulesets/hexTopology'
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
          continue unless @_isEligibleAreaVictim(attacker, victim)
          position = victim.getPosition()
          continue unless HexTopology.getDistance(origin, position) <= attacker.getReach()
          continue unless @_hasAreaDelivery(attacker, origin, position)
          areaAttack = attacker.actionAttack(victim)
          areaAttack.setParentAction(@)
          attacker.getGameSession().executeAction(areaAttack)
      if !@getIsImplicit() then attacker.setAttacksMade(attacker.getAttacksMade() + 1)

  _isVersion2StatDrivenAreaAttack: (attacker) ->
    session = attacker?.getGameSession?()
    return !!(session? and session.getRulesetId() is 'practice-sandbox-hex' and session.getRulesetVersion() is 2 and attacker.getAttackType?() is 'area' and attacker.hasOwnProperty('attackType') and attacker.attackType is 'area')

  _isEligibleAreaVictim: (attacker, victim) ->
    return false unless victim? and victim.getIsActive?() and victim.getIsActive() and victim.getIsTargetable?() and victim.getIsTargetable()
    if victim.getType?() is CardType.Unit
      session = attacker.getGameSession()
      attackerOwnerId = attacker.getOwnerId()
      opponentOwnerId = if attackerOwnerId is session.getPlayer1Id() then session.getPlayer2Id() else if attackerOwnerId is session.getPlayer2Id() then session.getPlayer1Id() else null
      return opponentOwnerId? and victim.getOwnerId() is opponentOwnerId
    if victim.getType?() is CardType.Tile
      return victim.getId?() is Cards.Tile.Wall and !attacker.getIsSameTeamAs(victim)
    return false

  _hasAreaDelivery: (attacker, origin, targetPosition) ->
    for obstruction in attacker.getGameSession().getBoard().getEntities()
      continue unless obstruction.getIsActive?() and obstruction.getIsActive()
      continue unless obstruction.getType?() is CardType.Tile and obstruction.getId?() is Cards.Tile.Wall
      continue unless obstruction.getIsObstructing?() and obstruction.getIsObstructing()
      wallPosition = obstruction.getPosition()
      continue if HexTopology.getDistance(wallPosition, targetPosition) is 0
      continue if HexTopology.getDistance(wallPosition, origin) is 0
      return false if HexTopology.segmentEntersHexInterior(origin, targetPosition, wallPosition)
    return true

module.exports = AttackAction
