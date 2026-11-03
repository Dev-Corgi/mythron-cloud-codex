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

# Behold selects an enemy Unit on one of the three axial axes. Its selected
# target is range-limited by the caller; the beam continues beyond it to the
# board edge and stops before the first Wall. Wall visibility to the selected
# target uses the same center-and-linked-Wall checks as ranged attacks.
HEX_ATTACK_GEOMETRY.getBeholdVictims = (board, source, target) ->
  return [] unless board? and source? and target?
  origin = source.getPosition()
  targetPosition = target.getPosition()
  return [] unless HexTopology.isOnHexAxis(origin, targetPosition)
  return [] if HEX_ATTACK_GEOMETRY.isRangedSegmentBlockedByWall(board, origin, targetPosition)
  distance = HexTopology.getDistance(origin, targetPosition)
  dq = (targetPosition.q - origin.q) / distance
  dr = (targetPosition.r - origin.r) / distance
  victims = []
  walls = HEX_ATTACK_GEOMETRY._getBlockingWalls(board)
  position = {q: targetPosition.q, r: targetPosition.r}
  while board.isOnBoard(position) and board.hasTileAtPosition(position)
    break if !board.positionsEqual(position, targetPosition) and HEX_ATTACK_GEOMETRY.isRangedSegmentBlockedByWall(board, origin, position)
    isWall = walls.some (wall) -> board.positionsEqual(wall.getPosition(), position)
    unit = board.getUnitAtPosition(position, true)
    if unit? and unit.getIsActive() and unit.getOwnerId() isnt source.getOwnerId()
      victims.push(unit)
    break if isWall
    position = {q: position.q + dq, r: position.r + dr}
  return victims

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

# Bull Rush endpoints are exactly three steps away. Search every shortest route
# in the topology's fixed neighbor order, then prefer routes that cross more
# enemy Units. Equal scores retain the first route found for deterministic ties.
HEX_ATTACK_GEOMETRY.getBullRushPath = (board, source, endpoint) ->
  return [] unless board? and source? and endpoint?
  start = source.getPosition()
  return [] unless board.getGameSession().getIsPracticeSandboxV2()
  return [] unless HexTopology.getDistance(start, endpoint) is 3 and board.isOnBoard(endpoint) and board.hasTileAtPosition(endpoint)
  return [] if board.getObstructionAtPositionForEntity(endpoint, source)

  paths = []
  visit = (position, path) ->
    if board.positionsEqual(position, endpoint)
      paths.push(path)
      return
    return if path.length >= 4
    for nextPosition in HexTopology.getNeighbors(position)
      continue unless board.isOnBoard(nextPosition) and board.hasTileAtPosition(nextPosition)
      continue unless HexTopology.getDistance(nextPosition, endpoint) is 3 - path.length
      obstruction = board.getObstructionAtPositionForEntity(nextPosition, source)
      continue if obstruction? and (obstruction.getType?() isnt CardType.Unit or source.getIsSameTeamAs(obstruction))
      visit(nextPosition, path.concat([nextPosition]))
  visit(start, [start])
  return [] unless paths.length

  bestPath = null
  bestScore = -1
  for path in paths
    score = 0
    for position in path.slice(1, -1)
      unit = board.getUnitAtPosition(position, true)
      score++ if unit? and unit.getIsActive() and !source.getIsSameTeamAs(unit)
    if score > bestScore
      bestScore = score
      bestPath = path
  return bestPath ? []

# A Bull Rush step can pass through an enemy Unit, but never through a Wall,
# allied Unit, hole, or off-board position.
HEX_ATTACK_GEOMETRY.isLegalBullRushStep = (board, source, from, to) ->
  return false unless board? and source? and board.isOnBoard(to) and board.hasTileAtPosition(to)
  return false unless HexTopology.getDistance(from, to) is 1
  obstruction = board.getObstructionAtPositionForEntity(to, source)
  return !obstruction? or (obstruction.getType?() is CardType.Unit and !source.getIsSameTeamAs(obstruction))

# Smashface pushes in the attacker-to-target direction only when the vector is
# one of the six axial neighbor deltas and the destination is empty and legal.
HEX_ATTACK_GEOMETRY.getPushDestination = (board, attackerPosition, targetPosition) ->
  return null unless board? and HexTopology.getDistance(attackerPosition, targetPosition) is 1
  destination = {q: targetPosition.q + targetPosition.q - attackerPosition.q, r: targetPosition.r + targetPosition.r - attackerPosition.r}
  return null unless board.isOnBoard(destination) and board.hasTileAtPosition(destination)
  return null if board.getObstructionAtPosition(destination)
  return destination

module.exports = HEX_ATTACK_GEOMETRY
