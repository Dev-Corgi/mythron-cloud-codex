Action = require './action'
Cards = require 'app/sdk/cards/cardsLookupComplete'
CardType = require 'app/sdk/cards/cardType'

class CaptureMethronPointAction extends Action

  @type: "CaptureMethronPointAction"

  constructor: (gameSession) ->
    @type ?= CaptureMethronPointAction.type
    super(gameSession)

  _execute: () ->
    super()

    gameSession = @getGameSession()
    return unless gameSession.getRulesetId() is "practice-sandbox-hex" and gameSession.getRulesetVersion() is 2
    return unless gameSession.consumeMethronPointCaptureAuthorization?(@)

    point = @getTarget()
    return unless point? and point.getId() is Cards.Tile.MethronPoint

    occupant = gameSession.getBoard().getUnitAtPosition(point.getPosition(), true, false)
    return unless occupant? and occupant.getIsActive() and !occupant.getIsRemoved()
    return unless occupant.getType() is CardType.Unit and occupant.getOwnerId()?

    ownerId = occupant.getOwnerId()
    return unless ownerId is gameSession.getPlayer1Id() or ownerId is gameSession.getPlayer2Id()
    point.setOwnerId(ownerId) if point.getOwnerId() isnt ownerId

module.exports = CaptureMethronPointAction
