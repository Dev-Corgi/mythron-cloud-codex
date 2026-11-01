Action = require './action'
Cards = require 'app/sdk/cards/cardsLookupComplete'
DamageAction = require './damageAction'

class ResolveMethronPointControlDamageAction extends Action

  @type: "ResolveMethronPointControlDamageAction"

  constructor: (gameSession) ->
    @type ?= ResolveMethronPointControlDamageAction.type
    super(gameSession)

  _execute: () ->
    super()

    gameSession = @getGameSession()
    return unless gameSession.getRulesetId() is "practice-sandbox-hex" and gameSession.getRulesetVersion() is 2
    return unless gameSession.consumeMethronPointControlDamageAuthorization?(@)

    player1ControlCount = 0
    player2ControlCount = 0
    for point in gameSession.getBoard().getTiles(true, false)
      continue unless point.getId() is Cards.Tile.MethronPoint
      if point.getOwnerId() is gameSession.getPlayer1Id()
        player1ControlCount += 1
      else if point.getOwnerId() is gameSession.getPlayer2Id()
        player2ControlCount += 1

    controlDifference = Math.abs(player1ControlCount - player2ControlCount)
    return unless controlDifference > 0

    disadvantagedPlayerId = if player1ControlCount < player2ControlCount then gameSession.getPlayer1Id() else gameSession.getPlayer2Id()
    damageAction = gameSession.createActionForType(DamageAction.type)
    damageAction.setTarget(gameSession.getGeneralForPlayerId(disadvantagedPlayerId))
    damageAction.setDamageAmount(2 * controlDifference)
    damageAction.setIsAutomatic(true)
    gameSession.executeAction(damageAction)

module.exports = ResolveMethronPointControlDamageAction
