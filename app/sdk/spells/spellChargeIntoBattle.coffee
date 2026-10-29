SpellApplyModifiers = require './spellApplyModifiers'
CardType = require 'app/sdk/cards/cardType'

class SpellChargeIntoBattle extends SpellApplyModifiers

  _postFilterPlayPositions: (validPositions) ->
    # use super filter play positions
    validPositions = super(validPositions)
    filteredValidPositions = []

    # find unit that is behind the general
    generalPosition = @getGameSession().getGeneralForPlayerId(@getOwnerId()).getPosition()
    if @getGameSession().getGeneralForPlayerId(@getOwnerId()).isOwnedByPlayer1()
      player1 = true
    else
      player1 = false

    for position in validPositions
      unit = @getGameSession().getBoard().getUnitAtPosition(position)
      unitPosition = unit?.getPosition()
      if @getGameSession().getRulesetId() is 'practice-sandbox-hex'
        if unitPosition? and unitPosition.r is generalPosition.r and unitPosition.q is generalPosition.q + (if player1 then -1 else 1)
          filteredValidPositions.push(unitPosition)
      else if player1 and unitPosition?.x == generalPosition.x-1 and unitPosition.y == generalPosition.y
        filteredValidPositions.push(unit.getPosition())
      if @getGameSession().getRulesetId() isnt 'practice-sandbox-hex' and !player1 and unitPosition?.x == generalPosition.x+1 and unitPosition.y == generalPosition.y
        filteredValidPositions.push(unit.getPosition())

    return filteredValidPositions

module.exports = SpellChargeIntoBattle
