CONFIG = require 'app/common/config'
UtilsGameSession = require 'app/common/utils/utils_game_session'
ModifierDyingWish = require './modifierDyingWish'
PlayCardSilentlyAction = require 'app/sdk/actions/playCardSilentlyAction'
PlayCardAction = require 'app/sdk/actions/playCardAction'
UtilsPosition = require 'app/common/utils/utils_position'
_ = require 'underscore'

class ModifierDyingWishSpawnEntityAnywhere extends ModifierDyingWish

  type:"ModifierDyingWishSpawnEntityAnywhere"
  @type:"ModifierDyingWishSpawnEntityAnywhere"

  fxResource: ["FX.Modifiers.ModifierDyingWish", "FX.Modifiers.ModifierGenericSpawn"]

  cardDataOrIndexToSpawn: null
  spawnCount: 1
  spawnSilently: true

  @createContextObject: (cardDataOrIndexToSpawn, spawnCount=1, spawnSilently=true, options) ->
    contextObject = super(options)
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn
    contextObject.spawnCount = spawnCount
    contextObject.spawnSilently = spawnSilently
    return contextObject

  onDyingWish: (action) ->
    super(action)

    if @getGameSession().getIsRunningAsAuthoritative()
      wholeBoardPattern = if @getGameSession().getRulesetId() is 'practice-sandbox-hex' then @getGameSession().getBoard().getPositions() else CONFIG.ALL_BOARD_POSITIONS
      card = @getGameSession().getExistingCardFromIndexOrCachedCardFromData(@cardDataOrIndexToSpawn)
      thisEntityPosition = @getCard().getPosition()
      board = @getGameSession().getBoard()
      validPositions = _.reject(wholeBoardPattern, (position) => board.positionsEqual(position, thisEntityPosition))
      origin = if @getGameSession().getRulesetId() is 'practice-sandbox-hex' then {q:0, r:0} else {x:0, y:0}
      spawnLocations = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(@getGameSession(), origin, validPositions, card, @getCard(), @spawnCount)

      for position in spawnLocations
        if !@spawnSilently
          playCardAction = new PlayCardAction(@getGameSession(), @getCard().getOwnerId(), position, @cardDataOrIndexToSpawn)
        else
          playCardAction = new PlayCardSilentlyAction(@getGameSession(), @getCard().getOwnerId(), position, @cardDataOrIndexToSpawn)
        playCardAction.setSource(@getCard())
        @getGameSession().executeAction(playCardAction)

module.exports = ModifierDyingWishSpawnEntityAnywhere
