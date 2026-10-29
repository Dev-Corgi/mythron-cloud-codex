Rulesets = require './rulesetsLookup'

PRACTICE_SANDBOX_HEX = Rulesets.getRuleset("practice-sandbox-hex", 1).id

NEUTRAL_CARD_IDS = [10979, 19052, 19038, 10205, 10001, 19051, 10954, 10206]
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

CardEligibility =
  isNewRules: (gameSession) ->
    return gameSession?.getRulesetId?() is PRACTICE_SANDBOX_HEX

  getPracticeBotRoster: () ->
    return NEUTRAL_CARD_IDS.slice()

  isGeneralId: (cardId) ->
    return Object::hasOwnProperty.call(GENERAL_SIGNATURE_IDS, cardId)

  isSignatureId: (cardId) ->
    return cardId in (value for own key, value of GENERAL_SIGNATURE_IDS)

  isDeckCardId: (cardId) ->
    return cardId in NEUTRAL_CARD_IDS or @isGeneralId(cardId) or @isSignatureId(cardId)

  isDeckChoiceId: (cardId) ->
    return cardId in NEUTRAL_CARD_IDS or @isGeneralId(cardId)

  isGeneratedDependencyId: (cardId) ->
    return cardId in GENERATED_DEPENDENCY_IDS

  isAllowedRuntimeId: (cardId) ->
    return @isDeckCardId(cardId) or @isGeneratedDependencyId(cardId)

  isAllowedRuntimeCard: (gameSession, card, sourceAction) ->
    return false unless card?
    cardId = card.getId()
    return @isAllowedRuntimeIdForPlayer(gameSession, cardId, card.getOwnerId()) if @isDeckCardId(cardId)
    return false unless @isGeneratedDependencyId(cardId)

    rootCard = card.getRootCard?() ? card
    rootCardId = rootCard?.getId?()
    unless rootCardId? and rootCardId isnt cardId
      rootAction = sourceAction?.getRootAction?()
      rootCard = rootAction?.getCard?()
      rootCardId = rootCard?.getId?()
    return false unless rootCard?.getOwnerId?() is card.getOwnerId()

    if cardId is 20142
      return card.getIsFollowup?() and rootCardId in [10979, 19052]
    if cardId is 43
      return rootCardId is 20301
    if cardId is 40004
      return rootCardId is 20181
    return false

  isAllowedRuntimeIdForPlayer: (gameSession, cardId, playerId) ->
    return false unless @isAllowedRuntimeId(cardId)
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

  validateDeck: (deck) ->
    return {valid: false, reason: "A deck is required."} unless Array.isArray(deck) and deck.length > 0
    generalId = deck[0]?.id
    return {valid: false, reason: "The general is not audited for Practice and Sandbox."} unless @isGeneralId(generalId)
    signatureId = GENERAL_SIGNATURE_IDS[generalId]
    for cardData, index in deck
      cardId = cardData?.id
      if cardData? and typeof cardData is "object" and Object.keys(cardData).some((key) -> key isnt "id")
        return {valid: false, reason: "Card data overrides are not allowed in Practice and Sandbox decks."}
      if index is 0
        continue
      unless cardId in NEUTRAL_CARD_IDS
        return {valid: false, reason: "Card #{cardId} is not audited for Practice and Sandbox."}
    return {valid: true, signatureId: signatureId}

  validateSetupData: (gameSession, playerData) ->
    return {valid: true} unless @isNewRules(gameSession)
    result = @validateDeck(playerData?.deck)
    return result unless result.valid
    generalId = playerData?.generalId ? playerData?.deck?[0]?.id
    if (playerData?.startingHand?.length ? 0) > 8
      return {valid: false, reason: "Starting hand exceeds the eight fixed Practice and Sandbox slots."}
    for cardData in (playerData?.startingHand ? []).concat(playerData?.startingDrawPile ? [])
      continue unless cardData?
      unless @isDeckChoiceId(cardData?.id)
        return {valid: false, reason: "Starting hand/draw-pile card #{cardData?.id} is not audited for Practice and Sandbox."}
    for cardData in (playerData?.startingBoardCardsData ? [])
      unless @isDeckCardId(cardData?.id)
        return {valid: false, reason: "Starting board card #{cardData?.id} is not audited for Practice and Sandbox."}
      if @isSignatureId(cardData.id) and GENERAL_SIGNATURE_IDS[generalId] isnt cardData.id
        return {valid: false, reason: "Starting board signature does not match its general."}
      if cardData? and Object.keys(cardData).some((key) -> key not in ["id", "position", "ownerId", "index"])
        return {valid: false, reason: "Starting board card overrides are not allowed in Practice and Sandbox."}
    return result

module.exports = CardEligibility
