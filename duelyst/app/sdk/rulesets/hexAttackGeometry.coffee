CardType = require 'app/sdk/cards/cardType'
Cards = require 'app/sdk/cards/cardsLookupComplete'
HexTopology = require './hexTopology'

# Pure, stateless resolver for version 2 ranged, lobbed, and area geometry
# (spine AD-8). It is the single owner of Wall obstruction, the target-supporting
# Wall exception, and area victim selection. Nothing is cached, so a Wall removed
# from the board stops blocking on the next query (a Wall at zero health stays
# on the board until the current step resolves).
HEX_ATTACK_GEOMETRY = {}

HEX_ATTACK_GEOMETRY._getBlockingWalls = (board) ->
  walls = []
  for entity in board.getEntities()
    continue unless entity.getIsActive?() and entity.getIsActive()
    continue unless entity.getType?() is CardType.Tile and entity.getId?() is Cards.Tile.Wall
    continue unless entity.getIsObstructing?() and entity.getIsObstructing()
    walls.push(entity)
  return walls

# True when an active, obstructing Wall other than those on the origin or target
# cell has its hex interior entered by the segment origin -> target.
HEX_ATTACK_GEOMETRY.isSegmentBlockedByWall = (board, origin, target) ->
  for wall in HEX_ATTACK_GEOMETRY._getBlockingWalls(board)
    wallPosition = wall.getPosition()
    continue if board.positionsEqual(wallPosition, origin) or board.positionsEqual(wallPosition, target)
    return true if HexTopology.segmentEntersHexInterior(origin, target, wallPosition)
  return false

# Whether an attack of the entity's type can be delivered from origin to target.
# Ranged: any in-range center line not blocked by a Wall. Lobbed, melee, and area target
# selection: unrestricted here (reach is checked by the caller; area delivery is
# resolved per victim by isAreaVictim).
HEX_ATTACK_GEOMETRY.canDeliver = (board, entity, origin, target) ->
  if entity.getAttackType?() is 'ranged'
    return !HEX_ATTACK_GEOMETRY.isRangedSegmentBlockedByWall(board, origin, target)
  return true

HEX_ATTACK_GEOMETRY.isRangedSegmentBlockedByWall = (board, origin, target) ->
  walls = HEX_ATTACK_GEOMETRY._getBlockingWalls(board)
  for wall in walls
    position = wall.getPosition()
    continue if board.positionsEqual(position, origin) or board.positionsEqual(position, target)
    return true if HexTopology.segmentPassesThroughCenter(origin, target, position)
  start = HexTopology._cartesianCenter(origin)
  finish = HexTopology._cartesianCenter(target)
  seen = {}
  for wall in walls
    position = wall.getPosition()
    continue if board.positionsEqual(position, origin) or board.positionsEqual(position, target)
    for delta in HexTopology.neighborDeltas
      neighbor = {q: position.q + delta.q, r: position.r + delta.r}
      neighborKey = "#{neighbor.q},#{neighbor.r}"
      continue if seen["#{position.q},#{position.r}|#{neighborKey}"]
      otherWall = walls.find (candidate) -> board.positionsEqual(candidate.getPosition(), neighbor)
      continue unless otherWall?
      seen["#{neighborKey}|#{position.q},#{position.r}"] = true
      linkStart = HexTopology._cartesianCenter(position)
      linkEnd = HexTopology._cartesianCenter(neighbor)
      return true if HexTopology.segmentsIntersect(start, finish, linkStart, linkEnd)
  return false

# Direct attacks resolve one canonical entity per position. An enemy Unit has
# priority; otherwise a neutral Wall can be attacked beneath an allied Unit.
HEX_ATTACK_GEOMETRY.getTargetAtPosition = (board, entity, position) ->
  return null unless board and position?
  return null unless entity.getGameSession().getIsPracticeSandboxV2()
  unit = board.getUnitAtPosition(position, true)
  tile = board.getTileAtPosition(position)
  if unit? and unit.getIsActive() and !entity.getIsSameTeamAs(unit)
    return unit
  if tile? and tile.getIsActive() and tile.getIsTargetable() and !entity.getIsSameTeamAs(tile)
    return tile
  return null

HEX_ATTACK_GEOMETRY._isEligibleAreaVictim = (attacker, victim) ->
  return false unless victim? and victim.getIsActive?() and victim.getIsActive() and victim.getIsTargetable?() and victim.getIsTargetable()
  if victim.getType?() is CardType.Unit
    session = attacker.getGameSession()
    attackerOwnerId = attacker.getOwnerId()
    opponentOwnerId = if attackerOwnerId is session.getPlayer1Id() then session.getPlayer2Id() else if attackerOwnerId is session.getPlayer2Id() then session.getPlayer1Id() else null
    return opponentOwnerId? and victim.getOwnerId() is opponentOwnerId
  if victim.getType?() is CardType.Tile
    return victim.getId?() is Cards.Tile.Wall and !attacker.getIsSameTeamAs(victim)
  return false

# Whether victim is an enemy Unit or neutral Wall the explosion centered on
# origin reaches directly within radius. Evaluated against the current board on
# every call.
HEX_ATTACK_GEOMETRY.isAreaVictim = (board, attacker, origin, radius, victim) ->
  return false unless HEX_ATTACK_GEOMETRY._isEligibleAreaVictim(attacker, victim)
  position = victim.getPosition()
  return false unless HexTopology.getDistance(origin, position) <= radius
  return !HEX_ATTACK_GEOMETRY.isSegmentBlockedByWall(board, origin, position)

# Keeps the candidate positions that an area effect centered at center reaches
# directly (no intervening Wall).
HEX_ATTACK_GEOMETRY.filterAreaPositions = (board, center, positions) ->
  return positions.filter (candidate) -> !HEX_ATTACK_GEOMETRY.isSegmentBlockedByWall(board, center, candidate)

module.exports = HEX_ATTACK_GEOMETRY
