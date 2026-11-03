Challenge = require './challenge'
GameSetup = require './../gameSetup'
GameType = require 'app/sdk/gameType'
CardEligibility = require './../rulesets/cardEligibility'
PlayModeFactory = require './../playModes/playModeFactory'
PlayModes = require './../playModes/playModesLookup'

PRACTICE_SANDBOX_V2 = {rulesetId: "practice-sandbox-hex", rulesetVersion: 2}

class Sandbox extends Challenge

  @type: "Sandbox"
  type: "Sandbox"

  name: PlayModeFactory.playModeForIdentifier(PlayModes.Sandbox).name
  description: PlayModeFactory.playModeForIdentifier(PlayModes.Sandbox).description

  battleMapTemplateIndex: null # sandbox can use random battle maps

  player1Deck: null
  player2Deck: null
  skipMulligan: false
  customBoard: false

  setPlayer1DeckData: (player1Deck) ->
    @player1Deck = player1Deck

  getMyPlayerDeckData: () ->
    return @player1Deck?.cards ? @player1Deck

  setPlayer2DeckData: (player2Deck) ->
    @player2Deck = player2Deck

  getOpponentPlayerDeckData: () ->
    return @player2Deck?.cards ? @player2Deck

  setupSession:(gameSession)->
    if @type is Sandbox.type
      results = (CardEligibility.validateSavedDeck(savedDeck, "sandbox", PRACTICE_SANDBOX_V2) for savedDeck in [@player1Deck, @player2Deck])
      for eligibility in results
        throw new Error(eligibility.reason) unless eligibility.valid
      @player1Deck = Object.assign({}, @player1Deck, {cards: results[0].deck})
      @player2Deck = Object.assign({}, @player2Deck, {cards: results[1].deck})
    return super(gameSession, {
      userId: gameSession.getUserId()
      name: "Player 1"
    }, {
      userId: gameSession.getUserId() + "test"
      name: "Player 2"
    })

  setupSessionModes: (gameSession) ->
    super(gameSession)
    gameSession.setGameType(GameType.Sandbox)
    gameSession.setRuleset("practice-sandbox-hex", 2)

  setupOpponentAgent: () ->
    # no agent needed for sandbox

module.exports = Sandbox
