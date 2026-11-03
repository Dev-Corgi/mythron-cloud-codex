Rulesets = require './rulesetsLookup'
CONFIG = require 'app/common/config'
Cards = require 'app/sdk/cards/cardsLookupComplete'
UseActiveAbilityAction = require 'app/sdk/actions/useActiveAbilityAction'

PRACTICE_SANDBOX_HEX = Rulesets.getRuleset("practice-sandbox-hex", 1).id
# Practice bot deck: one general plus exactly these eight cards (CONFIG.MAX_NEW_RULES_DECK_SIZE).
BOT_ROSTER_IDS = [10979, 19052, 19038, 10205, 10001, 19051, 10954, 10206]
# Deck-eligible neutrals: the bot roster plus Planar Scout, the active ability dev placeholder.
NEUTRAL_CARD_IDS = BOT_ROSTER_IDS.concat([10019])
GENERAL_SIGNATURE_IDS =
  1: 20174
  23: 20175
  51: 20301
  223: 20179
  254: 20304
  323: 20181
  401: 20182
  527: 20185
  558: 20306
GENERATED_DEPENDENCY_IDS = [20142, 43, 40004]
PHOBIES_DECKABLE_IDS = [
  50001, 50002, 50003, 50004, 50005, 50006, 50007, 50008, 50009, 50010,
  50011, 50012, 50013, 50014, 50015, 50016, 50017, 50018, 50019, 50020,
  50021, 50022, 50023, 50024, 50025, 50026, 50027, 50028, 50029, 50030,
  50031, 50032, 50033, 50034, 50035
]

CardEligibility =
  isNewRules: (gameSession) ->
    return gameSession?.getRulesetId?() is PRACTICE_SANDBOX_HEX

  isV2Rules: (gameSession) ->
    if gameSession?.rulesetId? and gameSession?.rulesetVersion?
      return Rulesets.isPracticeSandboxV2(gameSession.rulesetId, gameSession.rulesetVersion)
    return Rulesets.isPracticeSandboxV2(gameSession?.getRulesetId?(), gameSession?.getRulesetVersion?())

  getPracticeBotRoster: () ->
    return BOT_ROSTER_IDS.slice()

  getPracticeGeneralIds: () ->
    return (parseInt(generalId, 10) for generalId of GENERAL_SIGNATURE_IDS)

  isGeneralId: (cardId) ->
    return Object::hasOwnProperty.call(GENERAL_SIGNATURE_IDS, cardId)

  isSignatureId: (cardId) ->
    return cardId in (value for own key, value of GENERAL_SIGNATURE_IDS)

  isDeckCardId: (cardId, gameSession) ->
    if @isV2Rules(gameSession)
      # Keep the current Practice bot deck eligible until its later migration.
      return cardId in PHOBIES_DECKABLE_IDS or cardId in BOT_ROSTER_IDS or @isGeneralId(cardId) or @isSignatureId(cardId)
    return cardId in NEUTRAL_CARD_IDS or @isGeneralId(cardId) or @isSignatureId(cardId)

  isDeckChoiceId: (cardId, gameSession) ->
    if @isV2Rules(gameSession)
      return cardId in PHOBIES_DECKABLE_IDS or cardId in BOT_ROSTER_IDS or @isGeneralId(cardId)
    return cardId in NEUTRAL_CARD_IDS or @isGeneralId(cardId)

  isGeneratedDependencyId: (cardId) ->
    return cardId in GENERATED_DEPENDENCY_IDS

  isAllowedRuntimeId: (cardId, gameSession) ->
    return @isDeckCardId(cardId, gameSession) or @isGeneratedDependencyId(cardId)

  isAllowedRuntimeCard: (gameSession, card, sourceAction) ->
    return false unless card?
    cardId = card.getId()
    if cardId is Cards.Tile.Wall
      return gameSession.getIsPracticeSandboxV2() and !sourceAction? and card.getOwnerId() is null
    if cardId is Cards.Tile.MethronPoint
      return gameSession.getIsPracticeSandboxV2() and !sourceAction? and card.getOwnerId() is null
    if sourceAction instanceof UseActiveAbilityAction
      sourceUnit = gameSession.getCardByIndex(sourceAction.sourceUnitIndex)
      return @isV2Rules(gameSession) and sourceUnit? and sourceUnit.getOwnerId() is card.getOwnerId() and UseActiveAbilityAction.getEffectCardId(gameSession, sourceUnit) is cardId
    return @isAllowedRuntimeIdForPlayer(gameSession, cardId, card.getOwnerId()) if @isDeckCardId(cardId, gameSession)
    return false unless @isGeneratedDependencyId(cardId)

    rootCard = card.getRootCard?() ? card
    rootCardId = rootCard?.getId?()
    unless rootCardId? and rootCardId isnt cardId
      # A followup PlayCardAction carries its audited parent through `source`.
      # At the first eligibility check the followup properties have not yet
      # been injected into the submitted card, so getRootCard() still points
      # at the followup itself. Resolve the source first; the followup
      # validator checks its id and target against the parent's server data.
      rootCard = sourceAction?.getSource?()
      rootCard = rootCard.getRootCard?() ? rootCard if rootCard?
      rootCardId = rootCard?.getId?()
      unless rootCardId? and rootCardId isnt cardId
        rootAction = sourceAction?.getRootAction?()
        rootCard = rootAction?.getCard?()
        rootCardId = rootCard?.getId?()
    return false unless rootCard?.getOwnerId?() is card.getOwnerId()

    if cardId is 20142
      # This policy check runs before ValidatorFollowup injects the parent
      # card's followup properties into the generated card. Restrict the
      # dependency to audited source cards here; ValidatorFollowup then checks
      # the exact followup id, source position, and target.
      return rootCardId in [10979, 19052]
    if cardId is 43
      return rootCardId is 20301
    if cardId is 40004
      return rootCardId is 20181
    return false

  isAllowedRuntimeIdForPlayer: (gameSession, cardId, playerId) ->
    return false unless @isAllowedRuntimeId(cardId, gameSession)
    if @isGeneralId(cardId)
      return !gameSession.getGeneralForPlayerId(playerId)?
    if @isSignatureId(cardId)
      general = gameSession.getGeneralForPlayerId(playerId)
      return general? and GENERAL_SIGNATURE_IDS[general.getId()] is cardId
    return true

  isSignatureForPlayer: (gameSession, cardId, playerId) ->
    return false unless @isSignatureId(cardId)
    general = gameSession.getGeneralForPlayerId(playerId)
    return general? and GENERAL_SIGNATURE_IDS[general.getId()] is cardId

  validateSavedDeck: (savedDeck, purpose, gameSession) ->
    unless savedDeck?.id? and savedDeck.purpose is purpose and purpose in ["practice", "sandbox"]
      return {valid: false, reason: "Select a saved #{purpose} deck."}
    unless Array.isArray(savedDeck.cards)
      return {valid: false, reason: "Saved deck has no cards."}
    deck = savedDeck.cards.map((card) -> if typeof card is "number" then {id: card} else card)
    result = @validateDeck(deck, gameSession)
    result.deck = deck if result.valid
    return result

  validateDeck: (deck, gameSession) ->
    return {valid: false, reason: "Practice and Sandbox decks must contain exactly one general and eight cards."} unless Array.isArray(deck) and deck.length is CONFIG.MAX_NEW_RULES_DECK_SIZE
    generalId = deck[0]?.id
    return {valid: false, reason: "The general is not audited for Practice and Sandbox."} unless @isGeneralId(generalId)
    signatureId = GENERAL_SIGNATURE_IDS[generalId]
    cardCounts = {}
    for cardData, index in deck
      cardId = cardData?.id
      if cardData? and typeof cardData is "object" and Object.keys(cardData).some((key) -> key isnt "id")
        return {valid: false, reason: "Card data overrides are not allowed in Practice and Sandbox decks."}
      if index is 0
        continue
      unless @isDeckChoiceId(cardId, gameSession)
        return {valid: false, reason: "Card #{cardId} is not audited for Practice and Sandbox."}
      cardCounts[cardId] = (cardCounts[cardId] ? 0) + 1
      if cardCounts[cardId] > CONFIG.MAX_DECK_DUPLICATES
        return {valid: false, reason: "Card #{cardId} exceeds the maximum copy limit of #{CONFIG.MAX_DECK_DUPLICATES}."}
    return {valid: true, signatureId: signatureId}

  validateSetupData: (gameSession, playerData) ->
    return {valid: true} unless @isNewRules(gameSession)
    result = @validateDeck(playerData?.deck, gameSession)
    return result unless result.valid
    generalId = playerData?.generalId ? playerData?.deck?[0]?.id
    if (playerData?.startingHand?.length ? 0) > 8
      return {valid: false, reason: "Starting hand exceeds the eight fixed Practice and Sandbox slots."}
    for cardData in (playerData?.startingHand ? []).concat(playerData?.startingDrawPile ? [])
      continue unless cardData?
      unless @isDeckChoiceId(cardData?.id, gameSession)
        return {valid: false, reason: "Starting hand/draw-pile card #{cardData?.id} is not audited for Practice and Sandbox."}
    for cardData in (playerData?.startingBoardCardsData ? [])
      unless @isDeckCardId(cardData?.id, gameSession)
        return {valid: false, reason: "Starting board card #{cardData?.id} is not audited for Practice and Sandbox."}
      if @isSignatureId(cardData.id) and GENERAL_SIGNATURE_IDS[generalId] isnt cardData.id
        return {valid: false, reason: "Starting board signature does not match its general."}
      if cardData? and Object.keys(cardData).some((key) -> key not in ["id", "position", "ownerId", "index"])
        return {valid: false, reason: "Starting board card overrides are not allowed in Practice and Sandbox."}
    return result

module.exports = CardEligibility
