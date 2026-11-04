CONFIG = require 'app/common/config'
SpellDamage = require './spellDamage'

class SpellWarbird extends SpellDamage

  _findApplyEffectPositions: (position, sourceAction) ->
    applyEffectPositions = []
    board = @getGameSession().getBoard()
    general = @getGameSession().getGeneralForOpponentOfPlayerId( @getOwnerId())
    generalPosition = general.getPosition()

    if @getGameSession().getIsPracticeSandboxV2()
      for entity in board.getUnits() when entity.getIsSameTeamAs(general) and entity.getPosition().q is generalPosition.q
        applyEffectPositions.push(entity.getPosition())
      return applyEffectPositions

    for i in [0..CONFIG.BOARDROW-1]
      testPosition = {x: generalPosition.x, y: i}
      entity = board.getUnitAtPosition(testPosition)
      if entity? and entity.getIsSameTeamAs(general)
        applyEffectPositions.push(entity.getPosition())

    return applyEffectPositions

module.exports = SpellWarbird
