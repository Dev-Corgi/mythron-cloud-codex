CONFIG = require 'app/common/config'
UtilsPosition = require 'app/common/utils/utils_position'
Range = require './range'
ModifierFlying = require 'app/sdk/modifiers/modifierFlying'
ModifierPhasing = require 'app/sdk/modifiers/modifierPhasing'
CardType = require 'app/sdk/cards/cardType'
Cards = require 'app/sdk/cards/cardsLookupComplete'

class MovementRange extends Range

  # movement has a different pattern step than the default
  # so movement range needs a separate cache for patterns
  @patternsByDistance: {}
  @patternMapsByDistance: {}

  _pathsToPositionsByIndex: null

  flushCachedState: () ->
    super()
    @_pathsToPositionsByIndex = null
    @_validAbilityOriginPositions = null
    @_abilityOriginPathsToPositionsByIndex = null

  getValidPositions: (board, entity, isAbilityOrigin=false) ->
    validPositionsKey = if isAbilityOrigin then "_validAbilityOriginPositions" else "_validPositions"
    validPositions = @[validPositionsKey]
    if entity.getGameSession().getRulesetId() is 'practice-sandbox-hex'
      unless validPositions?
        origin = entity.getPosition()
        return @[validPositionsKey] = [] unless board.isOnBoard(origin)
        speed = Math.max(0, if isAbilityOrigin then entity.getSpeedForAbilityOrigin() else entity.getSpeed())
        originKey = "#{origin.q},#{origin.r}"
        queue = [{position: origin, path: [origin]}]
        visited = {}
        visited[originKey] = true
        validPositions = @[validPositionsKey] = []
        cursor = 0
        while cursor < queue.length
          node = queue[cursor]
          cursor++
          continue if node.path.length - 1 >= speed
          for nextPosition in board.getHexNeighbors(node.position)
            key = "#{nextPosition.q},#{nextPosition.r}"
            continue if visited[key]
            visited[key] = true
            isHole = board.getGameSession().getIsPracticeSandboxV2() and !board.hasTileAtPosition(nextPosition)
            isFlying = entity.hasActiveModifierClass(ModifierFlying)
            isPhasing = board.getGameSession().getIsPracticeSandboxV2() and entity.hasActiveModifierClass(ModifierPhasing)
            canCrossTerrain = isFlying or isPhasing
            continue if isHole and !canCrossTerrain
            obstruction = board.getObstructionAtPositionForEntity(nextPosition, entity)
            isEnemyUnit = obstruction and obstruction.getType? and obstruction.getType() is CardType.Unit and !entity.getIsSameTeamAs(obstruction)
            canTraverse = !obstruction or entity.getIsSameTeamAs(obstruction) or (canCrossTerrain and !isEnemyUnit) or (isPhasing and isEnemyUnit)
            continue unless canTraverse
            path = node.path.concat([nextPosition])
            queue.push({position: nextPosition, path: path})
            isWallEndpoint = obstruction?.getType? and obstruction.getType() is CardType.Tile and obstruction.getId() is Cards.Tile.Wall and canCrossTerrain and board.getGameSession().getIsPracticeSandboxV2()
            validPositions.push(path) unless obstruction and !isWallEndpoint
      return validPositions
    if !validPositions?
      entityPosition = entity.getPosition()
      entityMovementPatternMap = entity.getMovementPatternMap()
      speed = if isAbilityOrigin then entity.getSpeedForAbilityOrigin() else entity.getSpeed()
      step = CONFIG.MOVE_PATTERN_STEP

      validPositions = @[validPositionsKey] = []

      rowCount = board.getRowCount()
      columnCount = board.getColumnCount()
      bufferSize = rowCount * columnCount * Uint8Array.BYTES_PER_ELEMENT
      buffer = new ArrayBuffer(bufferSize)
      bufferInterface = new Uint8Array(buffer)

      originNode = {x: 0, y: 0, speed: 0}
      nodesToProcess = [originNode]

      # breadth first traversal so we always find the shortest path
      # but never allow paths longer than entity's speed
      while nodesToProcess.length > 0
        node = nodesToProcess.shift()
        for offset in step
          # calculate distance and current speed required to get to this node
          distance = Math.sqrt(offset.x * offset.x + offset.y * offset.y)
          nextSpeed = node.speed + distance
          # skip this node if it is too far away
          if nextSpeed > speed
            continue

          nextNode = {x: node.x + offset.x, y: node.y + offset.y, speed: nextSpeed}
          movePosition = {x: entityPosition.x + nextNode.x, y: entityPosition.y + nextNode.y}
          index = UtilsPosition.getMapIndexFromPosition(columnCount, movePosition.x, movePosition.y)
          # skip this node if we already have a shorter path to this position
          # or if the node is off the board or not within pattern
          if bufferInterface[index] == 1 or !board.isOnBoard(movePosition) or !@getIsPositionInPatternMap(board, entityMovementPatternMap, nextNode)
            continue

          # mark position as tested
          bufferInterface[index] = 1

          obstructionAtPosition = board.getObstructionAtPositionForEntity(movePosition, entity)

          # valid node to path through if unoccupied, occupant is same team, or moving entity is flying
          if !obstructionAtPosition or entity.getIsSameTeamAs(obstructionAtPosition) or entity.hasActiveModifierClass(ModifierFlying)
            nextNode.parent = node
            nodesToProcess.push(nextNode)

          # valid node to move to only if nothing is there
          if !obstructionAtPosition
            path = [movePosition]
            parent = nextNode.parent
            while parent?
              path.unshift({x: entityPosition.x + parent.x, y: entityPosition.y + parent.y})
              parent = parent.parent
            validPositions.push(path)

    return validPositions

  getPathTo: (board, entity, position, isAbilityOrigin=false) ->
    pathsKey = if isAbilityOrigin then "_abilityOriginPathsToPositionsByIndex" else "_pathsToPositionsByIndex"
    paths = @[pathsKey]
    if entity.getGameSession().getRulesetId() is 'practice-sandbox-hex'
      return [] unless board.isOnBoard(position)
      key = "#{position.q},#{position.r}"
      paths ?= @[pathsKey] = {}
      cached = paths[key]
      return cached if cached?
      for path in @getValidPositions(board, entity, isAbilityOrigin)
        endpoint = path[path.length - 1]
        if board.positionsEqual(endpoint, position)
          return paths[key] = path
      return paths[key] = []
    if board.isOnBoard(position)
      # if we've already tested this position, return previous result
      index = UtilsPosition.getMapIndexFromPosition(board.getColumnCount(), position.x, position.y)
      paths ?= @[pathsKey] = {}
      path = paths[index]
      if path?
        return path
      else
        moves = @getValidPositions(board,entity,isAbilityOrigin)
        for path in moves
          realEnd = path[path.length - 1]
          if realEnd.x == position.x and realEnd.y == position.y
            # valid path found
            return paths[index] = path

        # no valid path found
        paths[index] = []
    return []

  getIsPositionValid: (board, entity, position, isAbilityOrigin=false) ->
    return @getPathTo(board, entity, position, true).length > 0 if isAbilityOrigin
    return super(board, entity, position)

  getValidPosition: (board, entity, position) ->
    if @getPathTo(board, entity, position).length > 0
      return position
    return null

  class _MoveNode
    constructor: (@_position, parent) ->
      @pathTo = if parent? then parent.pathTo[..] else []
      @pathTo.push(@_position)

  getPatternByDistance: (board, distance) ->
    pattern = MovementRange.patternsByDistance[distance]
    if !pattern?
      Range._generateAndCachePatternAndMap(board, distance, CONFIG.MOVE_PATTERN_STEP, MovementRange.patternsByDistance, MovementRange.patternMapsByDistance)
      pattern = MovementRange.patternsByDistance[distance]
    return pattern

  getPatternMapByDistance: (board, distance) ->
    patternMap = MovementRange.patternMapsByDistance[distance]
    if !patternMap?
      Range._generateAndCachePatternAndMap(board, distance, CONFIG.MOVE_PATTERN_STEP, MovementRange.patternsByDistance, MovementRange.patternMapsByDistance)
      patternMap = MovementRange.patternMapsByDistance[distance]
    return patternMap

module.exports = MovementRange
