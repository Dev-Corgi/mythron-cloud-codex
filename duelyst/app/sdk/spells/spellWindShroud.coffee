CONFIG = require '../../common/config'
SpellSpawnEntity = require './spellSpawnEntity.coffee'
CardType = require './../cards/cardType.coffee'
Cards = require '../cards/cardsLookupComplete.coffee'
UtilsGameSession = require '../../common/utils/utils_game_session.coffee'
_ = require 'underscore'

class SpellWindShroud extends SpellSpawnEntity

  targetType: CardType.Unit
  spawnSilently: true
  cardDataOrIndexToSpawn: {id: Cards.Faction3.IronDervish} # spawns dervishes

  _findApplyEffectPositions: (position, sourceAction) ->
    card = @getEntityToSpawn()
    pattern = if @getGameSession().getIsPracticeSandboxV2() then require("app/sdk/rulesets/hexTopology").getNeighbors({q: 0, r: 0}) else CONFIG.PATTERN_3x3
    generalPosition = @getGameSession().getGeneralForPlayerId(@ownerId).getPosition()
    applyEffectPositions = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(@getGameSession(), generalPosition, pattern, card, @, 1)

    return applyEffectPositions

  # Wind Shroud picks its apply location by itself, so don't set limits on where it can be cast
  _postFilterPlayPositions: (validPositions) ->
    return validPositions

module.exports = SpellWindShroud
