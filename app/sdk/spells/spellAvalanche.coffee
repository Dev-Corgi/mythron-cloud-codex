CONFIG = require 'app/common/config'
SpellStunAndDamage = require './spellStunAndDamage'
SpellFilterType = require './spellFilterType'

class SpellAvalanche extends SpellStunAndDamage

  spellFilterType: SpellFilterType.NeutralIndirect

  _postFilterApplyPositions: (validPositions) ->
    # spell kills units on 'your side' of the board
    if validPositions.length > 0

      # begin with "my side" defined as whole board
      mySideStartX = 0
      mySideEndX = CONFIG.BOARDCOL

      filteredPositions = []

      if @isOwnedByPlayer1()
        mySideEndX = Math.floor((mySideEndX - mySideStartX) * 0.5 - 1)

      else if @isOwnedByPlayer2()
        mySideStartX = Math.floor((mySideEndX - mySideStartX) * 0.5 + 1)


      for position in validPositions
        column = if @getGameSession().getRulesetId() is 'practice-sandbox-hex' then @getGameSession().getBoard().getHexRenderedColumn(position) else position.x
        if column >= mySideStartX and column <= mySideEndX
          filteredPositions.push(position)

    return filteredPositions

module.exports = SpellAvalanche
