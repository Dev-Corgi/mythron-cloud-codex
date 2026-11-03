ModifierOnDying = require './modifierOnDying'
CONFIG = require 'app/common/config'
UtilsGameSession = require 'app/common/utils/utils_game_session'
PlayCardSilentlyAction = require 'app/sdk/actions/playCardSilentlyAction'
UtilsPosition = require 'app/common/utils/utils_position'
_ = require 'underscore'

class ModifierOnDyingResummonAnywhere extends ModifierOnDying

  type:"ModifierOnDyingResummonAnywhere"
  @type:"ModifierOnDyingResummonAnywhere"

  onDying: () ->

    if @getGameSession().getIsRunningAsAuthoritative()
      isHex = @getGameSession().getRulesetId() is 'practice-sandbox-hex'
      board = @getGameSession().getBoard()
      wholeBoardPattern = if isHex then board.getPositions() else CONFIG.ALL_BOARD_POSITIONS
      cardData = @getCard().createNewCardData()
      thisEntityPosition = @getCard().getPosition()
      validPositions = _.reject(wholeBoardPattern, (position) -> if isHex then board.positionsEqual(position, thisEntityPosition) else UtilsPosition.getPositionsAreEqual(position, thisEntityPosition))
      origin = if isHex then {q:0, r:0} else {x:0, y:0}
      spawnLocations = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(@getGameSession(), origin, validPositions, @getCard(), @getCard(), 1)

      for position in spawnLocations
        playCardAction = new PlayCardSilentlyAction(@getGameSession(), @getCard().getOwnerId(), position, cardData)
        playCardAction.setSource(@getCard())
        @getGameSession().executeAction(playCardAction)

module.exports = ModifierOnDyingResummonAnywhere
