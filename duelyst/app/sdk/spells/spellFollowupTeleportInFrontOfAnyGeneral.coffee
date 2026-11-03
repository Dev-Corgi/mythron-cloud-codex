SpellFollowupTeleport = require './spellFollowupTeleport'

class SpellFollowupTeleportInFrontOfAnyGeneral extends SpellFollowupTeleport

  getFollowupSourcePattern: () ->
    board = @getGameSession().getBoard()
    inFrontOfPositions = []
    for unit in board.getUnits()
      # apply in front of any General
      playerOffset = 0
      if unit.getIsGeneral()
        if unit.isOwnedByPlayer1() then playerOffset = 1 else playerOffset = -1
        entity = @getGameSession().getGeneralForPlayerId(@getOwnerId())
        if @getGameSession().getRulesetId() is 'practice-sandbox-hex'
          inFrontOfPosition = unit.getPosition()
          inFrontOfPosition.q += playerOffset
        else
          inFrontOfPosition = {x:unit.getPosition().x+playerOffset, y:unit.getPosition().y}
        if board.isOnBoard(inFrontOfPosition) and !board.getObstructionAtPositionForEntity(inFrontOfPosition, entity)
          inFrontOfPositions.push(inFrontOfPosition)

    paternInFrontOfGenerals = []
    for position in inFrontOfPositions
      sourcePosition = @getFollowupSourcePosition()
      if @getGameSession().getRulesetId() is 'practice-sandbox-hex'
        paternInFrontOfGenerals.push({q: position.q - sourcePosition.q, r: position.r - sourcePosition.r})
      else
        paternInFrontOfGenerals.push({x: position.x - sourcePosition.x, y: position.y - sourcePosition.y})

    return paternInFrontOfGenerals

module.exports = SpellFollowupTeleportInFrontOfAnyGeneral
