ModifierMyAttackWatch = require './modifierMyAttackWatch'
Cards = require 'app/sdk/cards/cardsLookupComplete'
PlayCardSilentlyAction = require 'app/sdk/actions/playCardSilentlyAction'
HexTopology = require 'app/sdk/rulesets/hexTopology'

class ModifierMyAttackWatchScarabBlast extends ModifierMyAttackWatch

  type:"ModifierMyAttackWatchScarabBlast"
  @type:"ModifierMyAttackWatchScarabBlast"

  onMyAttackWatch: (action) ->

    target = action.getTarget()
    if target?
      sameRowRight = false
      sameRowLeft = false
      sameColumnUp = false
      sameColumnDown = false

      targetPosition = target.getPosition()
      myPosition = @getCard().getPosition()
      board = @getCard().getGameSession().getBoard()

      if @getGameSession().getRulesetId() is 'practice-sandbox-hex'
        dq = targetPosition.q - myPosition.q
        dr = targetPosition.r - myPosition.r
        distance = board.getHexDistance(myPosition, targetPosition)
        for direction in HexTopology.neighborDeltas
          if distance? and distance > 0 and dq is direction.q * distance and dr is direction.r * distance
            candidate = {q: myPosition.q + direction.q, r: myPosition.r + direction.r}
            while board.isOnBoard(candidate)
              unless board.positionsEqual(candidate, targetPosition)
                playCardAction = new PlayCardSilentlyAction(@getGameSession(), @getCard().getOwnerId(), candidate, {id: Cards.Faction3.Scarab})
                playCardAction.setSource(@getCard())
                @getGameSession().executeAction(playCardAction)
              candidate = {q: candidate.q + direction.q, r: candidate.r + direction.r}
            return
        return

      if targetPosition.x == myPosition.x
        if targetPosition.y < myPosition.y
          sameColumnDown = true
        else
          sameColumnUp = true
      else if targetPosition.y == myPosition.y
        if targetPosition.x < myPosition.x
          sameRowLeft = true
        else
          sameRowRight = true

      spawnPositions = []

      if sameRowRight
        spawnPosition = {x: myPosition.x + 1, y: myPosition.y}
        while board.isOnBoard(spawnPosition)
          spawnPositions.push(spawnPosition)
          spawnPosition = {x: spawnPosition.x + 1, y: spawnPosition.y}
      else if sameRowLeft
        spawnPosition = {x: myPosition.x - 1, y: myPosition.y}
        while board.isOnBoard(spawnPosition)
          spawnPositions.push(spawnPosition)
          spawnPosition = {x: spawnPosition.x - 1, y: spawnPosition.y}
      else if sameColumnUp
        spawnPosition = {x: myPosition.x, y: myPosition.y + 1}
        while board.isOnBoard(spawnPosition)
          spawnPositions.push(spawnPosition)
          spawnPosition = {x: spawnPosition.x, y: spawnPosition.y + 1}
      else if sameColumnDown
        spawnPosition = {x: myPosition.x, y: myPosition.y - 1}
        while board.isOnBoard(spawnPosition)
          spawnPositions.push(spawnPosition)
          spawnPosition = {x: spawnPosition.x, y: spawnPosition.y - 1}

      if spawnPositions.length > 0
        for position in spawnPositions
          if position? and !(position.x == targetPosition.x and position.y == targetPosition.y)
            playCardAction = new PlayCardSilentlyAction(@getGameSession(), @getCard().getOwnerId(), position, {id: Cards.Faction3.Scarab})
            playCardAction.setSource(@getCard())
            @getGameSession().executeAction(playCardAction)

module.exports = ModifierMyAttackWatchScarabBlast
