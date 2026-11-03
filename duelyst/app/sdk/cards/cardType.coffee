class CardType

  @Card:1
  @Entity:2
  @Unit:3
  @Spell:4
  @Tile:5
  @Artifact:6
  # Effect spells resolved only through UseActiveAbilityAction.
  @AbilityEffect:7

  @getIsEntityCardType: (cardType) ->
    return cardType == CardType.Entity or cardType == CardType.Unit or cardType == CardType.Tile

  @getIsUnitCardType: (cardType) ->
    return cardType == CardType.Unit

  @getIsTileCardType: (cardType) ->
    return cardType == CardType.Tile

  @getIsSpellCardType: (cardType) ->
    return cardType == CardType.Spell

  @getIsAbilityEffectCardType: (cardType) ->
    return cardType == CardType.AbilityEffect

  @getIsArtifactCardType: (cardType) ->
    return cardType == CardType.Artifact

  @getAreCardTypesEqual: (cardTypeA, cardTypeB) ->
    if cardTypeA == cardTypeB
      return true
    else if cardTypeA == CardType.Entity
      return cardTypeB == CardType.Unit or cardTypeB == CardType.Tile
    else if cardTypeB == CardType.Entity
      return cardTypeA == CardType.Unit or cardTypeA == CardType.Tile

  @getNameForCardType: (cardType) ->
    if @getIsArtifactCardType(cardType)
      return "Artifact"
    else if @getIsSpellCardType(cardType)
      return "Spell"
    else if @getIsAbilityEffectCardType(cardType)
      return "Ability Effect"
    else if @getIsTileCardType(cardType)
      return "Tile"
    else if @getIsUnitCardType(cardType)
      return "Unit"
    else if @getIsEntityCardType(cardType)
      return "Entity"
    else
      return "Card"

module.exports = CardType
