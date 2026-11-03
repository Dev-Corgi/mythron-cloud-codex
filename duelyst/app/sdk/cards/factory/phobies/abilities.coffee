SpellDamage = require 'app/sdk/spells/spellDamage'
SpellHeal = require 'app/sdk/spells/spellHeal'
SpellApplyModifiers = require 'app/sdk/spells/spellApplyModifiers'
Spell = require 'app/sdk/spells/spell'
CardType = require 'app/sdk/cards/cardType'
SpellFilterType = require 'app/sdk/spells/spellFilterType'
Cards = require 'app/sdk/cards/cardsLookupComplete'
Factions = require 'app/sdk/cards/factionsLookup'
CardSet = require 'app/sdk/cards/cardSetLookup'
RSX = require 'app/data/resources'
Modifier = require 'app/sdk/modifiers/modifier'
HealAction = require 'app/sdk/actions/healAction'
DamageAction = require 'app/sdk/actions/damageAction'
UtilsJavascript = require 'app/common/utils/utils_javascript'

getAbilitySource = (sourceAction) ->
  rootAction = sourceAction?.getRootAction?() ? sourceAction
  return rootAction?.getSourceUnit?()

class PhobiesAbilityDamage extends SpellDamage
  type: CardType.AbilityEffect
  @type: CardType.AbilityEffect
  targetType: CardType.Unit
  canTargetGeneral: true
  spellFilterType: SpellFilterType.EnemyDirect

  onApplyEffectToBoardTile: (board, x, y, sourceAction) ->
    return unless @getGameSession().getIsRunningAsAuthoritative()
    source = getAbilitySource(sourceAction)
    target = board.getCardAtPosition(@getEffectPositionFromCoordinates(x, y), CardType.Unit)
    return unless source? and target? and target.getOwnerId() isnt source.getOwnerId()
    damageAction = new DamageAction(@getGameSession())
    damageAction.setOwnerId(source.getOwnerId())
    damageAction.setSource(source)
    damageAction.setTarget(target)
    damageAction.setDamageAmount(@damageAmount)
    @getGameSession().executeAction(damageAction)

class PhobiesAbilityHeal extends SpellHeal
  type: CardType.AbilityEffect
  @type: CardType.AbilityEffect
  targetType: CardType.Unit
  canTargetGeneral: false
  spellFilterType: SpellFilterType.AllyDirect

  onApplyEffectToBoardTile: (board, x, y, sourceAction) ->
    return unless @getGameSession().getIsRunningAsAuthoritative()
    source = getAbilitySource(sourceAction)
    target = board.getCardAtPosition(@getEffectPositionFromCoordinates(x, y), CardType.Unit)
    return unless source? and target? and target.getOwnerId() is source.getOwnerId() and !target.getIsGeneral()
    healAction = new HealAction(@getGameSession())
    healAction.manaCost = 0
    healAction.setOwnerId(source.getOwnerId())
    healAction.setSource(source)
    healAction.setTarget(target)
    healAction.setHealAmount(@healModifier)
    @getGameSession().executeAction(healAction)
    for modifierContextObject in @getTargetModifiersContextObjects() ? []
      context = UtilsJavascript.deepCopy(modifierContextObject)
      context.durationEndTurnPlayerId = source.getOwnerId()
      @getGameSession().applyModifierContextObject(context, target)

class PhobiesAbilityModifier extends SpellApplyModifiers
  type: CardType.AbilityEffect
  @type: CardType.AbilityEffect
  targetType: CardType.Unit
  spellFilterType: SpellFilterType.NeutralDirect

  onApplyEffectToBoardTile: (board, x, y, sourceAction) ->
    return unless @getGameSession().getIsRunningAsAuthoritative()
    source = getAbilitySource(sourceAction)
    target = board.getCardAtPosition(@getEffectPositionFromCoordinates(x, y), CardType.Unit)
    return unless source? and target?
    return if target.getIsGeneral() and !@canTargetEnemy
    return if target.getOwnerId() isnt source.getOwnerId() and !@canTargetEnemy
    return if target.getOwnerId() is source.getOwnerId() and @canTargetEnemy
    for modifierContextObject in @getTargetModifiersContextObjects() ? []
      context = UtilsJavascript.deepCopy(modifierContextObject)
      context.durationEndTurnPlayerId = if @durationForAffectedOwner then target.getOwnerId() else source.getOwnerId()
      @getGameSession().applyModifierContextObject(context, target)

class PhobiesGroupHug extends Spell
  type: CardType.AbilityEffect
  @type: CardType.AbilityEffect
  targetType: CardType.Unit
  canTargetGeneral: false
  spellFilterType: SpellFilterType.AllyDirect
  healModifier: 1100

  onApplyToBoard: (board, x, y, sourceAction) ->
    super(board, x, y, sourceAction)
    return unless @getGameSession().getIsRunningAsAuthoritative()
    source = getAbilitySource(sourceAction)
    return unless source?
    targets = board.getCardsWithinRadiusOfPosition(source.getPosition(), CardType.Unit, 1, true)
    for target in targets when target.getOwnerId() is source.getOwnerId() and !target.getIsGeneral() and !board.positionsEqual(target.getPosition(), source.getPosition())
      healAction = new HealAction(@getGameSession())
      healAction.manaCost = 0
      healAction.setOwnerId(source.getOwnerId())
      healAction.setSource(source)
      healAction.setTarget(target)
      healAction.setHealAmount(@healModifier)
      @getGameSession().executeAction(healAction)

makeAbilityCard = (gameSession, id, name, description, spellClass, sourceSpellId, configure) ->
  card = new spellClass(gameSession)
  card.setId(id)
  card.name = name
  card.setDescription(description)
  card.manaCost = 0
  card.type = CardType.AbilityEffect
  card.factionId = Factions.Neutral
  card.setCardSetId(CardSet.Phobies)
  sourceCard = require('app/sdk/cards/cardFactory').cardForIdentifier(sourceSpellId, gameSession)
  if sourceCard?
    card.setBaseAnimResource(sourceCard.getBaseAnimResource())
    card.setPortraitResource(sourceCard.getPortraitResource())
    card.setPortraitHexResource(sourceCard.getPortraitHexResource())
  configure?(card)
  return card

class CardFactory_PhobiesAbilities
  @cardForIdentifier: (identifier, gameSession) ->
    card = null
    if identifier is Cards.PhobiesAbility.FeelGreat
      card = makeAbilityCard(gameSession, identifier, 'Flash Reincarnation', 'Restore 650 Health to a friendly minion and give it +300 Attack this turn.', PhobiesAbilityHeal, Cards.Spell.FlashReincarnation, (result) ->
        result.healModifier = 650
        result.setTargetModifiersContextObjects([Modifier.createContextObjectWithAttributeBuffs(300, 0, {durationEndTurn: 1})])
        result.setFXResource(['FX.Cards.Spell.Amplification', 'FX.Cards.Spell.DampeningWave'])
        result.setBaseSoundResource(apply: RSX.sfx_spell_flashreincarnation.audio)
      )
    else if identifier is Cards.PhobiesAbility.Monty
      card = makeAbilityCard(gameSession, identifier, 'Phoenix Fire', 'Deal 450 damage to an enemy unit or General.', PhobiesAbilityDamage, Cards.Spell.PhoenixFire, (result) ->
        result.damageAmount = 450
        result.setFXResource(['FX.Cards.Spell.PhoenixFire'])
        result.setBaseSoundResource(apply: RSX.sfx_spell_phoenixfire.audio)
      )
    else if identifier is Cards.PhobiesAbility.PureAdrenaline
      card = makeAbilityCard(gameSession, identifier, 'Flash Reincarnation', 'Restore 1500 Health to a friendly minion.', PhobiesAbilityHeal, Cards.Spell.FlashReincarnation, (result) ->
        result.healModifier = 1500
        result.setFXResource(['FX.Cards.Spell.Amplification', 'FX.Cards.Spell.DampeningWave'])
        result.setBaseSoundResource(apply: RSX.sfx_spell_flashreincarnation.audio)
      )
    else if identifier is Cards.PhobiesAbility.ClangClang
      card = makeAbilityCard(gameSession, identifier, 'War Surge', 'Give a friendly minion +300 Attack this turn.', PhobiesAbilityModifier, Cards.Spell.WarSurge, (result) ->
        result.spellFilterType = SpellFilterType.AllyDirect
        result.setTargetModifiersContextObjects([Modifier.createContextObjectWithAttributeBuffs(300, 0, {durationEndTurn: 1})])
        result.setFXResource(['FX.Cards.Spell.WarSurge'])
        result.setBaseSoundResource(apply: RSX.sfx_spell_warsurge.audio)
      )
    else if identifier is Cards.PhobiesAbility.PeekABoo
      card = makeAbilityCard(gameSession, identifier, 'Blindscorch', 'Give an enemy unit or General -300 Attack for 2 turns.', PhobiesAbilityModifier, Cards.Spell.Blindscorch, (result) ->
        result.canTargetEnemy = true
        result.canTargetGeneral = true
        result.spellFilterType = SpellFilterType.EnemyDirect
        result.durationForAffectedOwner = true
        result.setTargetModifiersContextObjects([Modifier.createContextObjectWithAttributeBuffs(-300, 0, {durationEndTurn: 2})])
        result.setFXResource(['FX.Cards.Spell.DropLift', 'FX.Cards.Spell.Polarity'])
        result.setBaseSoundResource(apply: RSX.sfx_spell_blindscorch.audio)
      )
    else if identifier is Cards.PhobiesAbility.HelpingHand
      card = makeAbilityCard(gameSession, identifier, 'Flash Reincarnation', 'Give a friendly minion +300 Attack this turn.', PhobiesAbilityModifier, Cards.Spell.FlashReincarnation, (result) ->
        result.spellFilterType = SpellFilterType.AllyDirect
        result.setTargetModifiersContextObjects([Modifier.createContextObjectWithAttributeBuffs(300, 0, {durationEndTurn: 1})])
        result.setFXResource(['FX.Cards.Spell.Amplification', 'FX.Cards.Spell.DampeningWave'])
        result.setBaseSoundResource(apply: RSX.sfx_spell_flashreincarnation.audio)
      )
    else if identifier is Cards.PhobiesAbility.GroupHug
      card = makeAbilityCard(gameSession, identifier, 'Aperion\'s Claim', 'Restore 1100 Health to all adjacent friendly minions.', PhobiesGroupHug, Cards.Spell.AperionsClaim, (result) ->
        result.healModifier = 1100
        result.setFXResource(['FX.Cards.Spell.AperionsClaim'])
        result.setBaseSoundResource(apply: RSX.sfx_spell_voidpulse.audio)
      )
    return card

module.exports = CardFactory_PhobiesAbilities
