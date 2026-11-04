Spell = require './spell'
CardType = require 'app/sdk/cards/cardType'
SpellFilterType =  require './spellFilterType'
Cards = require 'app/sdk/cards/cardsLookupComplete'
UtilsJavascript = require 'app/common/utils/utils_javascript'

class SpellApplyModifiers extends Spell

  targetType: CardType.Unit
  spellFilterType: SpellFilterType.NeutralDirect
  numModifiersToApply: 0 # when 0 applies all targetModifiersContextObjects, when > 0 this is the number of random modifiers to apply

  setNumModifiersToApply: (val) ->
    @numModifiersToApply = val

  getNumModifiersToApply: () ->
    return @numModifiersToApply

  onApplyEffectToBoardTile: (board,x,y,sourceAction) ->
    super(board,x,y,sourceAction)

    applyEffectPosition = @getEffectPositionFromCoordinates(x, y)
    entity = board.getCardAtPosition(applyEffectPosition, @targetType)
    if entity?
      for modifierContextObject in @getAppliedTargetModifiersContextObjects(sourceAction)
        @getGameSession().applyModifierContextObject(modifierContextObject, entity)

  getAppliedTargetModifiersContextObjects: (sourceAction) ->
    appliedModifiersContextObjects = @getTargetModifiersContextObjects()
    numModifiersToPick = @numModifiersToApply
    if numModifiersToPick > 0 and numModifiersToPick < appliedModifiersContextObjects.length
      # pick modifiers at random
      modifierContextObjectsToPickFrom = appliedModifiersContextObjects.slice(0)
      appliedModifiersContextObjects = []
      while numModifiersToPick > 0
        # pick a modifier and remove it from the list to avoid picking duplicates
        modifierContextObject = modifierContextObjectsToPickFrom.splice(@getGameSession().getRandomIntegerForExecution(modifierContextObjectsToPickFrom.length), 1)[0]
        appliedModifiersContextObjects.push(modifierContextObject)
        numModifiersToPick--

    if require("./generalAbilityEffectScale")(@, sourceAction) isnt 1
      effectScale = @getGameSession().getRulesetConfig().bloodboundSpellEffectScale
      appliedModifiersContextObjects = UtilsJavascript.deepCopy(appliedModifiersContextObjects)
      scaleModifiers = (contexts) ->
        for context in contexts
          for attribute in ["atk", "maxHP"]
            context.attributeBuffs[attribute] *= effectScale if context.attributeBuffs?[attribute]?
          scaleModifiers(context.modifiersContextObjects) if context.modifiersContextObjects?
      scaleModifiers(appliedModifiersContextObjects)

    return appliedModifiersContextObjects

module.exports = SpellApplyModifiers
