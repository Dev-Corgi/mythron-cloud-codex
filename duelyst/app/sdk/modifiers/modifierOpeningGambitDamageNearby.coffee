CONFIG = require 'app/common/config'
ModifierOpeningGambit = require './modifierOpeningGambit'
DamageAction = require 'app/sdk/actions/damageAction'
CardType = require 'app/sdk/cards/cardType'
Cards = require 'app/sdk/cards/cardsLookupComplete'
Modifier = require './modifier'

class ModifierOpeningGambitDamageNearby extends ModifierOpeningGambit

  type: "ModifierOpeningGambitDamageNearby"
  @type: "ModifierOpeningGambitDamageNearby"

  @modifierName: "Opening Gambit"
  @description: "Deal %X damage to everything around it"

  damageAmount: 0

  fxResource: ["FX.Modifiers.ModifierOpeningGambit", "FX.Modifiers.ModifierGenericDamageNearby"]

  @createContextObject: (damageAmount, options) ->
    contextObject = super()
    contextObject.damageAmount = damageAmount
    return contextObject

  @getDescription: (modifierContextObject) ->
    if modifierContextObject
      return @description.replace /%X/, modifierContextObject.damageAmount
    else
      return @description

  onOpeningGambit: () ->
    board = @getGameSession().getBoard()
    if @getGameSession().getIsPracticeSandboxV2()
      entities = board.getEntitiesAroundEntity(@getCard(), CardType.Entity, 1)
      entities = entities.filter (entity) =>
        return !@getCard().getIsSameTeamAs(entity) if entity.getType() is CardType.Unit
        return entity.getType() is CardType.Tile and entity.getId() is Cards.Tile.Wall and !@getCard().getIsSameTeamAs(entity)
    else
      entities = board.getEntitiesAroundEntity(@getCard(), CardType.Unit, 1)
    for entity in entities
      damageAction = new DamageAction(@getGameSession())
      damageAction.setOwnerId(@getCard().getOwnerId())
      damageAction.setSource(@getCard())
      damageAction.setTarget(entity)
      damageAction.setDamageAmount(@damageAmount)
      @getGameSession().executeAction(damageAction)

module.exports = ModifierOpeningGambitDamageNearby
