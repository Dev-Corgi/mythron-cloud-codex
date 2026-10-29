ModifierOpeningGambit = require './modifierOpeningGambit'
ModifierEgg = require './modifierEgg'
Cards = require 'app/sdk/cards/cardsLookupComplete'
PlayCardSilentlyAction = require 'app/sdk/actions/playCardSilentlyAction'

class ModifierOpeningGambitProgenitor extends ModifierOpeningGambit

  type:"ModifierOpeningGambitProgenitor"
  @type:"ModifierOpeningGambitProgenitor"

  fxResource: ["FX.Modifiers.ModifierOpeningGambit"]

  onOpeningGambit: () ->

    ownerId = @getOwnerId()
    myPosition = @getCard().getPosition()

    if @getGameSession().getIsRunningAsAuthoritative()

      friendlyMinions = []
      for unit in @getGameSession().getBoard().getUnits()
        isMyPosition = @getGameSession().getBoard().positionsEqual(unit?.getPosition(), myPosition)
        if unit?.getOwnerId() is ownerId and unit.getBaseCardId() isnt Cards.Faction5.Egg and !unit.getIsGeneral() and !isMyPosition
          friendlyMinions.push(unit)

      playerOffset = 0
      if @getCard().isOwnedByPlayer1() then playerOffset = -1 else playerOffset = 1

      for minion in friendlyMinions
        if @getGameSession().getRulesetId() is 'practice-sandbox-hex'
          spawnPosition = minion.getPosition()
          spawnPosition.q += playerOffset
        else
          spawnPosition = {x:minion.getPosition().x+playerOffset, y:minion.getPosition().y}
        if !@getGameSession().getBoard().getObstructionAtPositionForEntity(spawnPosition, minion)

          egg = {id: Cards.Faction5.Egg}
          egg.additionalInherentModifiersContextObjects ?= []
          egg.additionalInherentModifiersContextObjects.push(ModifierEgg.createContextObject(minion.createNewCardData(), minion.getName()))

          spawnAction = new PlayCardSilentlyAction(@getGameSession(), ownerId, spawnPosition, egg)
          spawnAction.setSource(@getCard())
          @getGameSession().executeAction(spawnAction)

module.exports = ModifierOpeningGambitProgenitor
