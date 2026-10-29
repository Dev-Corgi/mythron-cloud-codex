Spell = require './spell'
TeleportAction = require 'app/sdk/actions/teleportAction'
_ = require 'underscore'

class SpellTeleportGeneralBehindEnemy extends Spell

  onApplyEffectToBoardTile: (board,x,y,sourceAction) ->
    super(board,x,y,sourceAction)
    applyEffectPosition = @getEffectPositionFromCoordinates(x, y)

    source = @getGameSession().getGeneralForPlayerId(@getOwnerId())
    teleAction = new TeleportAction(@getGameSession())
    teleAction.setOwnerId(@getOwnerId())
    teleAction.setSource(source)
    teleAction.setTargetPosition(@getEffectPositionFromCoordinates(x, y))
    teleAction.setFXResource(_.union(teleAction.getFXResource(), @getFXResource()))
    @getGameSession().executeAction(teleAction)

  _filterPlayPositions: (spellPositions) ->
    teleportPositions = []
    board = @getGameSession().getBoard()
    general = @getGameSession().getGeneralForPlayerId(@getOwnerId())
    playerOffset = 0
    if @isOwnedByPlayer1() then playerOffset = 1 else playerOffset = -1
    for unit in board.getUnits()
      #look for units owned by the opponent of the player who cast the spell, and with an open space "behind" the enemy unit
      if @getGameSession().getRulesetId() is 'practice-sandbox-hex'
        behindPosition = unit.getPosition()
        behindPosition.q += playerOffset
      else
        behindPosition = {x:unit.getPosition().x+playerOffset, y:unit.getPosition().y}
      if unit.getOwnerId() != @getOwnerId() and board.isOnBoard(behindPosition) and !board.getObstructionAtPositionForEntity(behindPosition, general)
        teleportPositions.push(behindPosition)

    return teleportPositions

module.exports = SpellTeleportGeneralBehindEnemy
