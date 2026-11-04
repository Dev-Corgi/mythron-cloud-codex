SpellSpawnEntity =   require './spellSpawnEntity'
PlayCardAction = require 'app/sdk/actions/playCardAction'
PlayCardSilentlyAction = require 'app/sdk/actions/playCardSilentlyAction'
Cards = require 'app/sdk/cards/cardsLookupComplete'
CardType = require 'app/sdk/cards/cardType'

class SpellSpawnNeutralEntity extends SpellSpawnEntity
  tileAsUnit: true # true = treat tiles as units for valid spawn positions

  getEntityToSpawn: (cardDataOrIndexToSpawn) ->
    if !@tileAsUnit
      return super(cardDataOrIndexToSpawn)
    else
      entity = super(cardDataOrIndexToSpawn)
      return entity if entity?.getType?() is CardType.Unit
      # return a unit instead of a tile so positioning methods will treat existing units as obstructing
      entity = @getGameSession().getExistingCardFromIndexOrCreateCardFromData({id: Cards.Neutral.KomodoCharger})
      if entity?
        entity.setOwnerId(@getOwnerId())
        return entity

  getSpawnAction: (x, y, cardDataOrIndexToSpawn) ->
    targetPosition = {x: x, y: y}
    if !cardDataOrIndexToSpawn? then cardDataOrIndexToSpawn = @getCardDataOrIndexToSpawn(x, y)
    entity = @getEntityToSpawn(cardDataOrIndexToSpawn)
    if entity and @getGameSession().getBoard().isValidSummonPositionForEntity(targetPosition, entity)
      if @spawnSilently
        spawnEntityAction = new PlayCardSilentlyAction(@getGameSession(), @getOwnerId(), @getEffectPositionFromCoordinates(x, y), cardDataOrIndexToSpawn, true)
      else
        spawnEntityAction = new PlayCardAction(@getGameSession(), @getOwnerId(), @getEffectPositionFromCoordinates(x, y), cardDataOrIndexToSpawn, true)
    return spawnEntityAction

module.exports = SpellSpawnNeutralEntity
