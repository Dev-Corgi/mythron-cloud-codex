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
ApplyCardToBoardAction = require 'app/sdk/actions/applyCardToBoardAction'
RemoveAction = require 'app/sdk/actions/removeAction'
DamageAction = require 'app/sdk/actions/damageAction'
KillAction = require 'app/sdk/actions/killAction'
AttackAction = require 'app/sdk/actions/attackAction'
MoveAction = require 'app/sdk/actions/moveAction'
PhobiesPushAction = require 'app/sdk/actions/phobiesPushAction'
ModifierCannotMove = require 'app/sdk/modifiers/modifierCannotMove'
HexTopology = require 'app/sdk/rulesets/hexTopology'
HexAttackGeometry = require 'app/sdk/rulesets/hexAttackGeometry'
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

class PhobiesSelfDestruct extends SpellDamage
  type: CardType.AbilityEffect
  @type: CardType.AbilityEffect
  targetType: CardType.Unit
  canTargetGeneral: true
  radius: 1
  spellFilterType: SpellFilterType.EnemyDirect

  _findApplyEffectPositions: (position, sourceAction) ->
    source = getAbilitySource(sourceAction)
    return [] unless source?
    return super(source.getPosition(), sourceAction)

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

  onApplyOneEffectToBoard: (board, x, y, sourceAction) ->
    return unless @getGameSession().getIsRunningAsAuthoritative()
    source = getAbilitySource(sourceAction)
    return unless source?
    killAction = new KillAction(@getGameSession())
    killAction.setOwnerId(source.getOwnerId())
    killAction.setSource(source)
    killAction.setTarget(source)
    @getGameSession().executeAction(killAction)

class PhobiesGotcha extends SpellApplyModifiers
  type: CardType.AbilityEffect
  @type: CardType.AbilityEffect
  targetType: CardType.Unit
  spellFilterType: SpellFilterType.EnemyDirect
  canTargetGeneral: false
  durationForAffectedOwner: true

  onApplyEffectToBoardTile: (board, x, y, sourceAction) ->
    return unless @getGameSession().getIsRunningAsAuthoritative()
    source = getAbilitySource(sourceAction)
    target = board.getCardAtPosition(@getEffectPositionFromCoordinates(x, y), CardType.Unit)
    return unless source? and target? and target.getOwnerId() isnt source.getOwnerId() and !target.getIsGeneral()
    context = ModifierCannotMove.createContextObject({durationEndTurn: 2})
    context.durationEndTurnPlayerId = target.getOwnerId()
    @getGameSession().applyModifierContextObject(context, target)

    killAction = new KillAction(@getGameSession())
    killAction.setOwnerId(source.getOwnerId())
    killAction.setSource(source)
    killAction.setTarget(source)
    @getGameSession().executeAction(killAction)

class PhobiesRaisingHell extends PhobiesSelfDestruct
  radius: 2

  onApplyEffectToBoardTile: (board, x, y, sourceAction) ->
    return unless @getGameSession().getIsRunningAsAuthoritative()
    source = getAbilitySource(sourceAction)
    position = @getEffectPositionFromCoordinates(x, y)
    target = board.getCardAtPosition(position, CardType.Unit)
    return unless source? and target? and target.getOwnerId() isnt source.getOwnerId()
    distance = HexTopology.getDistance(source.getPosition(), position)
    return unless distance is 1 or distance is 2
    damageAction = new DamageAction(@getGameSession())
    damageAction.setOwnerId(source.getOwnerId())
    damageAction.setSource(source)
    damageAction.setTarget(target)
    damageAction.setDamageAmount(if distance is 1 then 600 else 300)
    @getGameSession().executeAction(damageAction)

runAbilityAction = (sourceAction, action, sourcePosition) ->
  rootAction = sourceAction?.getRootAction?() ? sourceAction
  return false unless rootAction?.setAbilityOriginOn?
  rootAction.setAbilityOriginOn(action)
  action.setSourcePosition(sourcePosition) if sourcePosition?
  action.getGameSession().executeAction(action)
  return action.getIsValid()

class PhobiesCawClaw extends Spell
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
    distance = HexTopology.getDistance(source.getPosition(), target.getPosition())
    return unless distance is 1 or distance is 2
    if distance is 2
      destination = null
      for candidate in HexTopology.getNeighbors(target.getPosition())
        continue unless HexTopology.getDistance(source.getPosition(), candidate) is 1
        continue if board.getObstructionAtPositionForEntity(candidate, source)
        continue unless source.getMovementRange().getIsPositionValid(board, source, candidate, true)
        destination = candidate
        break
      return unless destination?
      runAbilityAction(sourceAction, source.actionMove(destination), source.getPosition())
      return unless source.getIsActive()
      attackFrom = destination
    else
      attackFrom = source.getPosition()
    runAbilityAction(sourceAction, source.actionAttack(target), attackFrom)

class PhobiesBullRush extends Spell
  type: CardType.AbilityEffect
  @type: CardType.AbilityEffect
  targetType: CardType.Unit
  canTargetGeneral: true
  spellFilterType: SpellFilterType.None

  onApplyToBoardTile: () ->
    # The chosen endpoint is intentionally empty; resolution is handled once below.

  onApplyOneEffectToBoard: (board, x, y, sourceAction) ->
    return unless @getGameSession().getIsRunningAsAuthoritative()
    source = getAbilitySource(sourceAction)
    endpoint = @getEffectPositionFromCoordinates(x, y)
    path = HexAttackGeometry.getBullRushPath(board, source, endpoint)
    return unless source? and path.length is 4
    for position, index in path.slice(1)
      fromPosition = path[index]
      unit = board.getUnitAtPosition(position, true)
      if unit? and unit.getIsActive() and !source.getIsSameTeamAs(unit)
        return unless runAbilityAction(sourceAction, source.actionAttack(unit), fromPosition)
      move = source.actionMove(position)
      move.setIsAbilityDashStep(true)
      return unless runAbilityAction(sourceAction, move, fromPosition) and source.getIsActive()

class PhobiesPlaySmashface extends Spell
  type: CardType.AbilityEffect
  @type: CardType.AbilityEffect
  targetType: CardType.Unit
  canTargetGeneral: true
  spellFilterType: SpellFilterType.EnemyDirect

  onApplyEffectToBoardTile: (board, x, y, sourceAction) ->
    return unless @getGameSession().getIsRunningAsAuthoritative()
    source = getAbilitySource(sourceAction)
    targetPosition = @getEffectPositionFromCoordinates(x, y)
    target = board.getCardAtPosition(targetPosition, CardType.Unit)
    return unless source? and target? and target.getOwnerId() isnt source.getOwnerId() and HexTopology.getDistance(source.getPosition(), targetPosition) is 1
    runAbilityAction(sourceAction, source.actionAttack(target), source.getPosition())
    return unless source.getIsActive() and target.getIsActive()
    destination = HexAttackGeometry.getPushDestination(board, source.getPosition(), target.getPosition())
    return unless destination?
    push = new PhobiesPushAction(@getGameSession())
    push.setOwnerId(source.getOwnerId())
    push.setSource(target)
    push.setTarget(target)
    push.setTargetPosition(destination)
    rootAction = sourceAction?.getRootAction?() ? sourceAction
    rootAction.setAbilityOriginOn(push) if rootAction?.setAbilityOriginOn?
    @getGameSession().executeAction(push)

class PhobiesTerrorform extends Spell
  type: CardType.AbilityEffect
  @type: CardType.AbilityEffect
  targetType: CardType.Tile
  spellFilterType: SpellFilterType.None

  onApplyToBoardTile: () ->
    # This effect resolves once so a selected Wall beneath a Unit is removable.

  onApplyOneEffectToBoard: (board, x, y, sourceAction) ->
    return unless @getGameSession().getIsRunningAsAuthoritative()
    source = getAbilitySource(sourceAction)
    position = @getEffectPositionFromCoordinates(x, y)
    return unless source? and position? and HexTopology.getDistance(source.getPosition(), position) is 1
    wall = board.getCardsAtPosition(position, CardType.Tile, true).find (tile) -> tile.getId() is Cards.Tile.Wall
    if wall?
      remove = new RemoveAction(@getGameSession())
      remove.setOwnerId(source.getOwnerId())
      remove.setTarget(wall)
      remove.setTargetPosition(position)
      remove.setFXResource(['FX.Cards.Spell.ArtifactDefiler'])
      runAbilityAction(sourceAction, remove)
    else
      return if board.getEntityAtPosition(position, true)
      wallCard = @getGameSession().createCardForIdentifier(Cards.Tile.Wall)
      wallData = wallCard.createCardData()
      wallData.ownerId = null
      apply = new ApplyCardToBoardAction(@getGameSession(), source.getOwnerId(), position, wallData, true)
      apply.setFXResource(['FX.Cards.Spell.DropLift'])
      runAbilityAction(sourceAction, apply)

class PhobiesBehold extends Spell
  type: CardType.AbilityEffect
  @type: CardType.AbilityEffect
  targetType: CardType.Unit
  canTargetGeneral: true
  spellFilterType: SpellFilterType.EnemyDirect
  damageAmount: 500

  onApplyEffectToBoardTile: (board, x, y, sourceAction) ->
    # Beam victims are resolved once below so target positions stay immutable
    # while earlier DamageActions remove units.

  onApplyOneEffectToBoard: (board, x, y, sourceAction) ->
    return unless @getGameSession().getIsRunningAsAuthoritative()
    source = getAbilitySource(sourceAction)
    target = board.getUnitAtPosition(@getEffectPositionFromCoordinates(x, y), true)
    return unless source? and target? and target.getOwnerId() isnt source.getOwnerId()
    victims = HexAttackGeometry.getBeholdVictims(board, source, target).slice()
    for victim in victims when victim.getIsActive()
      damage = new DamageAction(@getGameSession())
      damage.setOwnerId(source.getOwnerId())
      damage.setSource(source)
      damage.setTarget(victim)
      damage.setDamageAmount(@damageAmount)
      damage.setIsAbilityOrigin(true)
      @getGameSession().executeAction(damage)

makeAbilityCard = (gameSession, id, name, description, spellClass, sourceSpellId, configure) ->
  card = new spellClass(gameSession)
  card.setId(id)
  # Ability cards reuse their source spell's art package. Keep the source ID
  # so card resource lookups do not request the nonexistent 510xx package.
  card.originalCardId = sourceSpellId
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
    else if identifier is Cards.PhobiesAbility.SpecialDelivery
      card = makeAbilityCard(gameSession, identifier, 'Pupabomb', 'Destroy this minion. Deal 550 damage to all adjacent enemy units.', PhobiesSelfDestruct, Cards.Spell.EggGrenade, (result) ->
        result.damageAmount = 550
        result.setFXResource(['FX.Cards.Faction1.IroncliffeGuardian', 'FX.Modifiers.ModifierGenericDamageFire'])
        result.setBaseSoundResource(apply: RSX.sfx_f2_jadeogre_attack_impact.audio)
      )
    else if identifier is Cards.PhobiesAbility.Gotcha
      card = makeAbilityCard(gameSession, identifier, 'Flash Freeze', 'Destroy this minion. An enemy unit cannot move for 2 turns.', PhobiesGotcha, Cards.Spell.FlashFreeze, (result) ->
        result.setTargetModifiersContextObjects([ModifierCannotMove.createContextObject({durationEndTurn: 2})])
        result.setFXResource(['FX.Cards.Neutral.Fireblazer', 'FX.Cards.Spell.BlindingSnowstorm'])
        result.setBaseSoundResource(apply: RSX.sfx_f6_icebeetle_death.audio)
      )
    else if identifier is Cards.PhobiesAbility.Poof
      card = makeAbilityCard(gameSession, identifier, 'Pupabomb', 'Destroy this minion. Deal 1400 damage to all adjacent enemy units.', PhobiesSelfDestruct, Cards.Spell.EggGrenade, (result) ->
        result.damageAmount = 1400
        result.setFXResource(['FX.Cards.Faction1.IroncliffeGuardian', 'FX.Modifiers.ModifierGenericDamageFire'])
        result.setBaseSoundResource(apply: RSX.sfx_f2_jadeogre_attack_impact.audio)
      )
    else if identifier is Cards.PhobiesAbility.RaisingHell
      card = makeAbilityCard(gameSession, identifier, 'Holy Immolation', 'Deal 600 damage to all adjacent enemy units and 300 damage to enemy units 2 tiles away in a straight line.', PhobiesRaisingHell, Cards.Spell.HolyImmolation, (result) ->
        result.damageAmount = 600
        result.setFXResource(['FX.Cards.Spell.FollowupDamage'])
        result.setBaseSoundResource(apply: RSX.sfx_f2_jadeogre_attack_impact.audio)
      )
    else if identifier is Cards.PhobiesAbility.CawClaw
      card = makeAbilityCard(gameSession, identifier, 'Knucklestorm', 'Move this minion 1 tile and attack with it as a single action; the attack deals 425 damage.', PhobiesCawClaw, Cards.Spell.FlashFreeze, (result) ->
        result.setFXResource(['Factions.Neutral.UnitSpawn', 'FX.Modifiers.ModifierGenericDamage'])
        result.setBaseSoundResource(apply: RSX.sfx_neutral_bluetipscorpion_attack_impact.audio)
      )
    else if identifier is Cards.PhobiesAbility.BullRush
      card = makeAbilityCard(gameSession, identifier, 'Spiral Counter', 'Move this minion through enemy units or empty tiles to an unoccupied tile 3 tiles away, dealing 550 damage to each enemy unit passed through. Enemy units are preferred when choosing the path.', PhobiesBullRush, Cards.Spell.SpiralTechnique, (result) ->
        result.setFXResource(['Factions.Neutral.UnitSpawn', 'FX.Modifiers.ModifierGenericDamage'])
        result.setBaseSoundResource(apply: RSX.sfx_spell_spiraltechnique.audio)
      )
    else if identifier is Cards.PhobiesAbility.PlaySmashface
      card = makeAbilityCard(gameSession, identifier, 'Koan of Horns', 'Deal 350 damage to an enemy unit and push it back 1 tile in a straight line.', PhobiesPlaySmashface, Cards.Spell.CryonicPotential, (result) ->
        result.damageAmount = 350
        result.setFXResource(['FX.Cards.Spell.CryonicPotential', 'FX.Modifiers.ModifierGenericDamageIce'])
        result.setBaseSoundResource(apply: RSX.sfx_f2tank_attack_swing.audio)
      )
    else if identifier is Cards.PhobiesAbility.Terrorform
      card = makeAbilityCard(gameSession, identifier, 'Boulder Hurl', 'Create a Wall on an adjacent empty tile or remove an adjacent Wall.', PhobiesTerrorform, Cards.Spell.BoulderHurl, (result) ->
        result.setBaseSoundResource(apply: RSX.sfx_spell_naturalselection.audio)
      )
    else if identifier is Cards.PhobiesAbility.Behold
      card = makeAbilityCard(gameSession, identifier, 'Thunderbomb', 'Deal 500 damage to an enemy unit and each enemy unit behind it in a straight line. Walls block this beam.', PhobiesBehold, Cards.Spell.Thunderbomb, (result) ->
        result.damageAmount = 500
        result.setFXResource(['FX.Cards.Spell.Thunderbomb'])
        result.setBaseSoundResource(apply: RSX.sfx_spell_phoenixfire.audio)
      )
    return card

module.exports = CardFactory_PhobiesAbilities
