CONFIG = require 'app/common/config'
ModifierDyingWish = require './modifierDyingWish'
DamageAction = require 'app/sdk/actions/damageAction'
CardType = require 'app/sdk/cards/cardType'
Cards = require 'app/sdk/cards/cardsLookupComplete'

class ModifierDyingWishDamageNearbyEnemies extends ModifierDyingWish

  type:"ModifierDyingWishDamageNearbyEnemies"
  @type:"ModifierDyingWishDamageNearbyEnemies"

  @description: "This minion deals %X damage to all enemies around it"

  damageAmount: 0

  fxResource: ["FX.Modifiers.ModifierDyingWishDamageNearbyAllies", "FX.Modifiers.ModifierGenericDamage"]

  @createContextObject: (damageAmount, options) ->
    contextObject = super(options)
    contextObject.damageAmount = damageAmount
    return contextObject

  @getDescription: (modifierContextObject) ->
    if modifierContextObject
      return @description.replace /%X/, modifierContextObject.damageAmount
    else
      return @description

  onDyingWish: () ->
    board = @getGameSession().getBoard()
    if @getGameSession().getIsPracticeSandboxV2()
      validEntities = board.getEntitiesAroundEntity(@getCard(), CardType.Entity, 1).filter (entity) =>
        return entity.getType() is CardType.Unit and !@getCard().getIsSameTeamAs(entity) if entity.getType() is CardType.Unit
        return entity.getType() is CardType.Tile and entity.getId() is Cards.Tile.Wall
    else
      validEntities = board.getEnemyEntitiesAroundEntity(@getCard(), CardType.Unit, 1)

    for entity in validEntities
      damageAction = new DamageAction(@getGameSession())
      damageAction.setOwnerId(@getCard().getOwnerId())
      damageAction.setSource(@getCard())
      damageAction.setTarget(entity)
      damageAction.setDamageAmount(@damageAmount)
      @getGameSession().executeAction(damageAction)

module.exports = ModifierDyingWishDamageNearbyEnemies
