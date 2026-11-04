Logger = require 'app/common/logger'
CONFIG = require('app/common/config')
EVENTS = require 'app/common/event_types'
UtilsGameSession = require 'app/common/utils/utils_game_session'
UtilsPosition = require 'app/common/utils/utils_position'
Card = require 'app/sdk/cards/card'
CardType = require 'app/sdk/cards/cardType'
Cards = require 'app/sdk/cards/cardsLookupComplete'

MovementRange = require './movementRange'
AttackRange =   require './attackRange'

MoveAction =   require 'app/sdk/actions/moveAction'
DamageAction =   require 'app/sdk/actions/damageAction'
AttackAction =   require 'app/sdk/actions/attackAction'
RemoveAction =   require 'app/sdk/actions/removeAction'
DieAction =   require 'app/sdk/actions/dieAction'
KillAction =   require 'app/sdk/actions/killAction'

ModifierUntargetable =   require 'app/sdk/modifiers/modifierUntargetable'
ModifierObstructing =   require 'app/sdk/modifiers/modifierObstructing'
ModifierProvoked =   require 'app/sdk/modifiers/modifierProvoked'
ModifierCustomSpawn = require 'app/sdk/modifiers/modifierCustomSpawn'

ModifierAirdrop =   require 'app/sdk/modifiers/modifierAirdrop'
ModifierProvoke =   require 'app/sdk/modifiers/modifierProvoke'
ModifierRangedProvoked = require 'app/sdk/modifiers/modifierRangedProvoked'
ModifierRangedProvoke = require 'app/sdk/modifiers/modifierRangedProvoke'
ModifierBattlePet = require 'app/sdk/modifiers/modifierBattlePet'
ModifierTamedBattlePet = require 'app/sdk/modifiers/modifierTamedBattlePet'
ModifierFlying = require 'app/sdk/modifiers/modifierFlying'
ModifierRanged = require 'app/sdk/modifiers/modifierRanged'
ModifierPhasing = require 'app/sdk/modifiers/modifierPhasing'
ModifierBlastAttack = require 'app/sdk/modifiers/modifierBlastAttack'
ModifierCannotMove = require 'app/sdk/modifiers/modifierCannotMove'

PlayerModifierChangeSignatureCard = require 'app/sdk/playerModifiers/playerModifierChangeSignatureCard'

_ = require 'underscore'

# Version 2 General Bloodbound active ability counters (Lockdown, then repeating Cooldown).
GENERAL_ACTIVE_ABILITY_LOCKDOWN = 2
GENERAL_ACTIVE_ABILITY_COOLDOWN = 2

# Explicit stat and ability fields that travel with cloned and copied card data.
STAT_CARD_DATA_KEYS = ["speed", "reach", "movementType", "attackType", "level", "activeAbilityState"]

class Entity extends Card

  type: CardType.Entity
  @type: CardType.Entity
  name: "Entity"

  atk: 0 # attack damage
  attacks: 1 # max attacks this entity can make
  attacksMade: 0 # number of attacks this entity has made this turn
  activeAbilityState: null # per-instance Lockdown/Cooldown and fixed source hand slot
  damage: 0 # current damage
  exhausted: true # whether an entity is exhausted regardless of how many moves/attacks it has made
  isGeneral: false # whether entity is a general
  isObstructing: false # whether the entity takes up an entire board position and blocks view for units that need LOS
  isTargetable: true # whether the entity can be targeted
  lastDmg: 0 # value of last damage taken
  lastHeal: 0 # value of last heal
  maxHP: 1 # max HP
  moves: 1 # max moves this entity can make
  movesMade: 0 # number of moves this entity has made this turn
  reach: 0 # how far the entity can attack
  speed: 0 # how far the entity can go per move
  wasGeneral: false # whether this entity was a general at some time during game
  signatureCardData: null # normally this will be null, but will be populated for Generals

  constructor: (gameSession) ->
    # super constructor
    super(gameSession)

  getPrivateDefaults: (gameSession) ->
    p = super(gameSession)

    # cache
    p.cachedAttackPattern = null
    p.cachedAttackPatternMap = null
    p.cachedEntitiesKilledByAttackOn = null
    p.cachedMovementPattern = null
    p.cachedMovementPatternMap = null
    p.cachedReferenceSignatureCard = null
    p.cachedIsBattlePet = null
    p.cachedIsUncontrollableBattlePet = null

    # misc
    p.attackRange = new AttackRange(p.gameSession)
    p.movementRange = new MovementRange(p.gameSession)
    p.customAttackPattern = null
    p.boundingBox = {x: 0, y: 0, width: 80, height: 80}

    return p

  createCloneCardData: () ->
    cardData = super()

    cardData.damage = @damage
    # Preserve explicit unit stats when cards are cloned or reconstructed.
    for key in STAT_CARD_DATA_KEYS
      if @[key]?
        cardData[key] = @[key]

    return cardData

  getCardDataKeysForCopy: () ->
    keys = super()
    keys = keys.concat(STAT_CARD_DATA_KEYS)
    return keys

  getGeneralActiveAbilityDefinition: () ->
    return {lockdown: GENERAL_ACTIVE_ABILITY_LOCKDOWN, cooldown: GENERAL_ACTIVE_ABILITY_COOLDOWN}

  # Explicit, non-overwriting initialization. Never call from a getter.
  # Version 2 Generals carry the Bloodbound active ability (Lockdown 2, Cooldown 2).
  initializeActiveAbility: (handSlotIndex) ->
    session = @getGameSession()
    return unless session? and session.getIsPracticeSandboxV2()
    if @getIsGeneral() and !@activeAbility?
      @activeAbility = @getGeneralActiveAbilityDefinition()
    definition = @activeAbility
    return unless definition?
    # a General's state outlives re-application; other units start fresh each time they are applied
    return if @getIsGeneral() and @activeAbilityState?
    lockdown = Math.max(0, Math.floor(definition.lockdown or 0))
    cooldown = Math.max(1, Math.floor(definition.cooldown or 1))
    @activeAbilityState = { lockdown: lockdown, cooldown: 0, baseLockdown: lockdown, baseCooldown: cooldown }
    @activeAbilityState.handSlotIndex = handSlotIndex if handSlotIndex?

  getActiveAbilityState: () ->
    return @activeAbilityState

  decrementActiveAbilityCounters: () ->
    return unless @activeAbilityState?
    # silence freezes Lockdown and Cooldown; they resume from the same values afterwards
    return if @getIsSilenced()
    @activeAbilityState.lockdown = Math.max(0, (@activeAbilityState.lockdown or 0) - 1)
    @activeAbilityState.cooldown = Math.max(0, (@activeAbilityState.cooldown or 0) - 1)

  startActiveAbilityCooldown: () ->
    return unless @activeAbilityState?
    @activeAbilityState.cooldown = @activeAbilityState.baseCooldown

  clearActiveAbility: () ->
    # a General's Bloodbound state outlives board removal and re-application
    return if @getIsGeneral()
    @activeAbilityState = null

  onRemoveFromBoard: (board, x, y, sourceAction) ->
    super(board, x, y, sourceAction)

    if @getIsGeneral()
      # notify the game session this entity is a general and has died
      @getGameSession().p_requestGameOver()

  #region ### Getters/Setters ###

  getLogName: ()->
    return super() + "(#{@.getPosition().x},#{@.getPosition().y})"

  setIsGeneral: (isGeneral) ->
    if @isGeneral != isGeneral
      @wasGeneral = @isGeneral or isGeneral or @wasGeneral
      @isGeneral = isGeneral
      @flushCachedDescription()
      @flushCachedModifiers()

  getIsGeneral: () ->
    return @isGeneral

  getWasGeneral: () ->
    return @wasGeneral

  getIsBattlePet:() ->
    @_private.cachedIsBattlePet ?= @hasModifierClass(ModifierBattlePet)
    return @_private.cachedIsBattlePet

  getIsUncontrollableBattlePet:() ->
    # normally battle pets are uncontrollable, unless tamed
    # generals that are acting like battle pets are always uncontrollable
    @_private.cachedIsUncontrollableBattlePet ?= @getIsBattlePet() and (!@hasModifierClass(ModifierTamedBattlePet) or @getIsGeneral())
    return @_private.cachedIsUncontrollableBattlePet

  getDescription: (options) ->
    # TODO: Is removing this commented out code correct?
#    # general description should be description of signature card
#    if @getWasGeneral() and (!@_private.cachedDescription? or @_private.cachedDescriptionOptions != options)
#      signatureCard = @getReferenceSignatureCard()
#      if signatureCard?
#        @_private.cachedDescriptionOptions = options
#        boldStart = options?.boldStart or ""
#        boldEnd = options?.boldEnd or ""
#        @_private.cachedDescription = boldStart + "Bloodbound Spell:" + boldEnd + " " + signatureCard.getDescription()

    return super(options)

  #endregion ### Getters/Setters ###

  #region ### BOUNDING BOX ###

  setBoundingBox: (val) ->
    @_private.boundingBox = val

  getBoundingBox: () ->
    return @_private.boundingBox

  setBoundingBoxX: (val) ->
    @_private.boundingBox.x = val

  getBoundingBoxX: () ->
    return @_private.boundingBox.x

  setBoundingBoxY: (val) ->
    @_private.boundingBox.y = val

  getBoundingBoxY: () ->
    return @_private.boundingBox.y

  setBoundingBoxWidth: (val) ->
    @_private.boundingBox.width = val

  getBoundingBoxWidth: () ->
    return @_private.boundingBox.width

  setBoundingBoxHeight: (val) ->
    @_private.boundingBox.height = val

  getBoundingBoxHeight: () ->
    return @_private.boundingBox.height

  #endregion ### BOUNDING BOX ###

  #region ### VALID POSITIONS ###

  getValidTargetPositions: () ->
    if !@_private.cachedValidTargetPositions?
      if @getGameSession().getRulesetId() is 'practice-sandbox-hex' and @getType() is CardType.Unit
        validPositions = @getGameSession().getBoard().getValidSpawnPositions(@)
      else if @getCanBeAppliedAnywhere()
        # some cards can be applied anywhere on board
        validPositions = @_getValidApplyAnywherePositions()
      else if @hasActiveModifierClass(ModifierCustomSpawn)
        validPositions = @getActiveModifiersByClass(ModifierCustomSpawn)[0].getCustomSpawnPositions()
      else
        validPositions = @getGameSession().getBoard().getValidSpawnPositions(@)

      # always guarantee at least an empty array
      @_private.cachedValidTargetPositions = validPositions || []
    return @_private.cachedValidTargetPositions

  _getValidApplyAnywherePositions: () ->
    return @getGameSession().getBoard().getUnobstructedPositionsForEntity(@)

  getCanBeAppliedAnywhere: () ->
    # airdrop is a special trait that allows units to spawn anywhere on the map
    return super() or @hasActiveModifierClass(ModifierAirdrop)

  #endregion ### VALID POSITIONS ###

  # region ### SIGNATURE CARD ###

  ###*
   * Sets signature card data. Should only be valid for generals.
   * @param {Object|null}
   ###
  setSignatureCardData: (cardData) ->
    @signatureCardData = cardData
    @flushCachedReferenceSignatureCard()
    @flushCachedDescription()

  ###*
   * Gets current signature card data, accounting for modifiers.
   * NOTE: only valid for generals!
   * @returns {Object|null}
   ###
  getSignatureCardData: () ->
    # first check to see if a player modifier is overriding signature card data
    if @hasModifierClass(PlayerModifierChangeSignatureCard)
      # populate signature card data based on order of application of player modifiers
      modifiers = @getActiveModifiersByClass(PlayerModifierChangeSignatureCard)
      if modifiers.length > 0 then signatureCardData = modifiers[modifiers.length - 1].getSignatureCardData()

    if signatureCardData?
      # if General is prismatic, return a prismatic signature card
      if Cards.getIsPrismaticCardId(@getId())
        signatureCardData.id = Cards.getPrismaticCardId(signatureCardData.id)

      return signatureCardData
    else
      # if no updated signature card found (based on modifiers), use the base
      return @getBaseSignatureCardData()

  ###*
   * Gets signature card data, unmodified.
   * NOTE: only valid for generals!
   * @returns {Object|null}
   ###
  getBaseSignatureCardData: () ->
    signatureCardData = @signatureCardData

    # if General is prismatic, return a prismatic signature card
    if signatureCardData?
      if Cards.getIsPrismaticCardId(@getId())
        signatureCardData.id = Cards.getPrismaticCardId(signatureCardData.id)
    return signatureCardData

  ###*
   * Gets a for reference signature card.
   * NOTE: this card is never used in game and is only for reference!
   * @returns {Card|null}
   ###
  getReferenceSignatureCard: () ->
    owner = @getOwner()
    if owner? and owner != @getGameSession()
      return owner.getReferenceSignatureCard()
    else if !@_private.cachedReferenceSignatureCard?
      @_private.cachedReferenceSignatureCard = @getGameSession().getExistingCardFromIndexOrCreateCardFromData(@getSignatureCardData())
    return @_private.cachedReferenceSignatureCard

  ###*
   * Flushes the cached reference card for signature so that the next call will regenerate the card.
   ###
  flushCachedReferenceSignatureCard: () ->
    @_private.cachedReferenceSignatureCard = null

  # endregion ### SIGNATURE CARD ###

  # region ### STATS ###

  getHP:() ->
    return Math.max(0, @getMaxHP() - @getDamage())

  getMaxHP:(withAuras) ->
    return @getBuffedAttribute(@maxHP, "maxHP", withAuras)

  getBaseMaxHP:() ->
    return @getBaseAttribute(@maxHP, "maxHP")

  setDamage:(damage) ->
    @damage = Math.max(0, damage)

  getDamage:() ->
    return @damage

  resetDamage:() ->
    @lastDmg = @getDamage()
    @setDamage(0)

  applyDamage: (dmg) ->
    @lastDmg = @getDamage()
    @setDamage(@damage + dmg)

  applyHeal: (heal) ->
    @lastDmg = @getDamage()
    @setDamage(@damage - heal)

  getCanBeHealed: () ->
    return @getHP() < @getMaxHP()

  getATK:(withAuras) ->
    return @getBuffedAttribute(@atk, "atk", withAuras)

  getBaseATK:() ->
    return @getBaseAttribute(@atk, "atk")

  setReach: (reach) ->
    @reach = reach
    @flushCachedAttackPattern()

  getReach: (withAuras) ->
    return @getBuffedAttribute(@reach, "reach", withAuras)

  setMovementType: (type) ->
    if type in ["walk", "fly", "phase"]
      @movementType = type

  getMovementType: () ->
    return "phase" if @hasModifierClass(ModifierPhasing)
    return "phase" if @movementType is "phase"
    if @hasModifierClass(ModifierFlying)
      return "fly"
    return @movementType or "walk"

  # The movement distance stat: speed without the legacy "move anywhere" grant that Flying
  # adds, so Flying units show and (in Practice/Sandbox version 2) use their own stat.
  getMovementDistance: (withAuras) ->
    distance = @getSpeed(withAuras)
    for modifier in @getActiveModifiers()
      if modifier instanceof ModifierFlying
        grant = modifier.getAttributeBuffs()?.speed
        distance -= grant if grant?
    return Math.max(0, distance)

  setAttackType: (type) ->
    if type in ["melee", "ranged", "lobbed", "area", "none"]
      @attackType = type

  # True only when this entity carries its own valid attack type; derived types do not count.
  getHasExplicitAttackType: () ->
    return @hasOwnProperty("attackType") and @attackType in ["melee", "ranged", "lobbed", "area", "none"]

  getAttackType: () ->
    if @getHasExplicitAttackType()
      return @attackType
    if @hasModifierClass(ModifierBlastAttack)
      return "area"
    if @isRanged()
      return "ranged"
    return @attackType or "melee"

  getAttackRangeValue: (withAuras) ->
    return @getReach(withAuras)

  setLevel: (level) ->
    if typeof level is "number" and isFinite(level) and level >= 1
      @level = Math.floor(level)

  getLevel: () ->
    return @level or 1

  isMelee: () ->
    return @getReach() == CONFIG.REACH_MELEE

  isRanged: () ->
    return (@getHasExplicitAttackType() and @attackType is "ranged") or @hasModifierClass(ModifierRanged) if @getIsPracticeSandboxV2()
    return @getReach() == CONFIG.REACH_RANGED

  getAttackRange:() ->
    return @_private.attackRange

  setCustomAttackPattern: (pattern) ->
    @_private.customAttackPattern = pattern
    if !@isRanged()
      @flushCachedAttackPattern()

  getAttackPattern: () ->
    if !@_private.cachedAttackPattern?
      # don't use custom attack patterns if ranged (can already attack everywhere)
      if @_private.customAttackPattern? and !@isRanged()
        @_private.cachedAttackPattern = @_private.customAttackPattern
      else
        @_private.cachedAttackPattern = @_private.attackRange.getPatternByDistance(@getGameSession().getBoard(), @getReach())
    return @_private.cachedAttackPattern

  getAttackPatternMap: () ->
    if !@_private.cachedAttackPatternMap?
      # don't use custom attack patterns if ranged (can already attack everywhere)
      if @_private.customAttackPattern? and !@isRanged()
        @_private.cachedAttackPatternMap = @_private.attackRange.getPatternMapFromPattern(@getGameSession().getBoard(), @_private.customAttackPattern)
      else
        @_private.cachedAttackPatternMap = @_private.attackRange.getPatternMapByDistance(@getGameSession().getBoard(), @getReach())
    return @_private.cachedAttackPatternMap

  flushCachedAttackPattern: () ->
    @_private.cachedAttackPattern = null
    @_private.cachedAttackPatternMap = null
    @_private.attackRange.flushCachedState()

  getAttackNeedsLOS: () ->
    return false

  setSpeed: (speed) ->
    @speed = speed
    @flushCachedMovementPattern()

  getSpeed: (withAuras) ->
    return @getBuffedAttribute(@speed, "speed", withAuras)

  # Ability-originated movement ignores immobilize only. Other speed modifiers
  # continue to apply to the embedded move.
  getSpeedForAbilityOrigin: () ->
    modifiers = (modifier for modifier in @getActiveModifiers() when !(modifier instanceof ModifierCannotMove))
    return Math.max(0, @_getBuffedAttributeFromModifiers(@speed, "speed", modifiers, true))

  getMovementRange:() ->
    return @_private.movementRange

  getMovementPattern: () ->
    if !@_private.cachedMovementPattern?
      @_private.cachedMovementPattern = @_private.movementRange.getPatternByDistance(@getGameSession().getBoard(), @getSpeed())
    return @_private.cachedMovementPattern

  getMovementPatternMap: () ->
    if !@_private.cachedMovementPatternMap?
      @_private.cachedMovementPatternMap = @_private.movementRange.getPatternMapByDistance(@getGameSession().getBoard(), @getSpeed())
    return @_private.cachedMovementPatternMap

  flushCachedMovementPattern: () ->
    @_private.cachedMovementPattern = null
    @_private.cachedMovementPatternMap = null
    @_private.movementRange.flushCachedState()

  setMovesMade:(movesMade) ->
    @movesMade = Math.max(0, movesMade)
    # also check attacks made and increase to always be at least 1 less than moves
    # this enforces celerity rules of not allowing more than one move per attack
    minimumAttacksMade = @movesMade - 1
    if @getAttacksMade() < minimumAttacksMade then @setAttacksMade(minimumAttacksMade)

  getMovesMade:() ->
    return @movesMade

  getMoves:(withAuras) ->
    return @getBuffedAttribute(@moves, "moves", withAuras)

  getHasMovesLeft:() ->
    return @getIsUncontrollableBattlePet() or @getMovesMade() < @getMoves()

  getCanMove:(isAbilityOrigin=false) ->
    bypassSlots = isAbilityOrigin and @getIsPracticeSandboxV2()
    speed = if bypassSlots then @getSpeedForAbilityOrigin() else @getSpeed()
    return (bypassSlots or (!@getIsExhausted() and @getHasMovesLeft())) and speed > 0

  setAttacksMade:(attacksMade) ->
    @attacksMade = Math.max(0, attacksMade)
    # also check moves made and increase to match attacks
    # this enforces sequence of move before attack and never after
    if @getMovesMade() < @attacksMade then @setMovesMade(@attacksMade)

  getAttacksMade:() ->
    return @attacksMade

  getAttacks:(withAuras) ->
    return @getBuffedAttribute(@attacks, "attacks", withAuras)

  getHasAttacksLeft:() ->
    return @getIsUncontrollableBattlePet() or @getAttacksMade() < @getAttacks()

  getCanAttack:(isAbilityOrigin=false) ->
    return false if @getHasExplicitAttackType() and @attackType is "none"
    bypassSlots = isAbilityOrigin and @getIsPracticeSandboxV2()
    return (bypassSlots or (!@getIsExhausted() and @getHasAttacksLeft())) and @getATK() > 0 and @getReach() > 0

  getIsPracticeSandboxV2: () ->
    session = @getGameSession()
    return !!(session? and session.getIsPracticeSandboxV2())

  ###
  * Returns whether this unit moved, attacked, or used an ability this turn.
  ###
  getHasActedThisTurn: () ->
    return @getMovesMade() != 0 or @getAttacksMade() != 0

  # Records an executed explicit move.
  recordMove: (isAbilityOrigin=false) ->
    @setMovesMade(@getMovesMade() + 1) unless isAbilityOrigin

  # Records an executed explicit (non-implicit) attack.
  recordAttack: (isAbilityOrigin=false) ->
    @setAttacksMade(@getAttacksMade() + 1) unless isAbilityOrigin

  getCanUseActiveAbility: () ->
    return @getIsPracticeSandboxV2() and !@getIsExhausted() and @getHasAttacksLeft()

  getBuildingTransformState: () ->
    return {exhausted: false, movesMade: 0, attacksMade: 0}

  getCanAct:() ->
    return @isOwnersTurn() and @getDoesOwnerHaveEnoughManaToAct() and (@getCanMove() or @getCanAttack())

  getNeverActs: () ->
    return @getSpeed() <= 0 and @getATK() <= 0

  ###
  * Returns exhausted state, accounting for all factors.
  * NOTE: for checking actual exhausted state value, use "getExhausted".
  * @returns {Boolean}
  ###
  getIsExhausted:() ->
    if @getIsUncontrollableBattlePet()
      return false
    else
      return @getExhausted() or !@getHasAttacksLeft()

  setExhausted: (val) ->
    @exhausted = val

  ###
  * Returns actual exhausted state value, not accounting for any other factors.
  * NOTE: for checking exhausted state that accounts for all factors, use "getIsExhausted".
  * @returns {Boolean}
  ###
  getExhausted: () ->
    return @exhausted

  refreshExhaustion:() ->
    @setExhausted(false)
    @setMovesMade(0)
    @setAttacksMade(0)

  applyExhaustion: () ->
    @setExhausted(true)

  getDoesOwnerHaveEnoughManaToAct: () ->
    if @getGameSession()?
      # if we want unit moves to cost mana, un-comment the lines below
      ###
      owner = this.getGameSession().getPlayerById(@ownerId)
      return !@getIsExhausted() && (owner.getRemainingMana() > 0 || (owner.getRemainingMana() == 0 && @getCanAct()))
      ###
      return !@getIsExhausted()
    else
      return false

  getCanAssist: (unit) ->
    return false

  getEntitiesKilledByAttackOn: (attackTarget) ->
    gameSession = @getGameSession()

    # prefer cached
    entitiesKilled = @_private.cachedEntitiesKilledByAttackOn?[attackTarget.getIndex()]
    if entitiesKilled? then return entitiesKilled else entitiesKilled = []

    # calculate entities killed
    if attackTarget? and @getAttackRange().getIsValidTarget(gameSession.getBoard(), @, attackTarget)
      # create explicit attack
      attackAction = @actionAttack(attackTarget)

      # set index on attack to allow it to be the parent for all sub attacks
      attackAction.setIndex("attack")

      # create list of actions
      actions = []
      validActions = []

      # emit event for all modifiers to validate explicit attack for attack prediction
      gameSession.pushEvent({type: EVENTS.validate_action, action: attackAction, gameSession: gameSession}, {blockNewImplicitActions: true})

      if attackAction.getIsValid()
        # emit event for all modifiers to modify explicit attack for attack prediction
        gameSession.pushEvent({type: EVENTS.modify_action_for_entities_involved_in_attack, action: attackAction, gameSession: gameSession})

        # emit event for all modifiers to add entities and attacks that are involved in this attack
        gameSession.pushEvent({type: EVENTS.entities_involved_in_attack, action: attackAction, actions: actions, gameSession: gameSession})

        # for all implicit actions
        while actions.length > 0
          # get next action
          action = actions.shift()

          # parent/root actions are retrieved by index but none of these actions have indices
          # so the getter methods must be modified to always return the attack action
          action.getParentAction = action.getResolveParentAction = action.getRootAction = () -> return attackAction
          action.getIsImplicit = () -> return true

          # emit event for all modifiers to validate resulting actions for attack prediction
          gameSession.pushEvent({type: EVENTS.validate_action, action: action, gameSession: gameSession}, {blockNewImplicitActions: true})

          if action.getIsValid()
            # add valid action
            validActions.push(action)

            # set action as sub action of explicit attack action
            attackAction.addSubAction(action)

            # emit event for all modifiers to modify resulting actions for attack prediction
            gameSession.pushEvent({type: EVENTS.modify_action_for_entities_involved_in_attack, action: action, gameSession: gameSession})

            # emit event for all modifiers to add entities and attacks that are involved in this attack
            gameSession.pushEvent({type: EVENTS.entities_involved_in_attack, action: action, actions: actions, gameSession: gameSession})

        # after testing actions add explicit attack action to list
        validActions.push(attackAction)

        # test damage of each attack action against hp of target
        for action in validActions
          target = action.getTarget()
          if target? and (action instanceof DamageAction and action.getTotalDamageAmount() >= target.getHP()) or (action instanceof RemoveAction or action instanceof KillAction)
            entitiesKilled.push(target)

    # make list unique
    entitiesKilled = _.uniq(entitiesKilled)

    # cache results
    @_private.cachedEntitiesKilledByAttackOn ?= {}
    @_private.cachedEntitiesKilledByAttackOn[attackTarget.getIndex()] = entitiesKilled

    return entitiesKilled

  # endregion ### STATS ###

  #region ### PROPERTIES FROM MODIFIERS ###

  getIsObstructing: () ->
    return @isObstructing or @hasModifierClass(ModifierObstructing)

  getObstructsEntity: (entity) ->
    if @getType() == CardType.Unit
      if entity.getType() == CardType.Unit then return true
      if entity.getIsObstructing() then return true
    else if entity.getType() == CardType.Unit
      if @getIsObstructing() then return true
    else if @getType() == CardType.Tile and entity.getType() == CardType.Tile
      if @getObstructsOtherTiles() then return true
    return false

  getIsTargetable: () ->
    return @isTargetable and !@hasActiveModifierClass(ModifierUntargetable)

  getIsProvoked:() ->
    return @hasActiveModifierClass(ModifierProvoked)

  getIsProvoker:() ->
    return @hasActiveModifierClass(ModifierProvoke)

  getIsRangedProvoked:() ->
    return @hasActiveModifierClass(ModifierRangedProvoked)

  getIsRangedProvoker:() ->
    return @hasActiveModifierClass(ModifierRangedProvoke)

  getEntitiesProvoked: () ->
    provokeModifier = @getActiveModifierByClass(ModifierProvoke)
    if provokeModifier?
      return provokeModifier.getEntitiesInAura()
    else
      rangedProvokeModifier = @getActiveModifierByClass(ModifierRangedProvoke)
      if rangedProvokeModifier?
        return rangedProvokeModifier.getEntitiesInAura()

    # default to no entities provoked
    return []

  #endregion ### PROPERTIES FROM MODIFIERS ###

  #region ### ACTIONS ###

  actionDie:(source) ->
    a = @getGameSession().createActionForType(DieAction.type)
    a.setSource(source)
    a.setTarget(@)
    return a

  actionMove:(pos) ->
    a = @getGameSession().createActionForType(MoveAction.type)
    a.setSource(@)
    a.setTarget(@)
    a.setTargetPosition(pos)
    return a

  actionAttack: (entity) ->
    a = @getGameSession().createActionForType(AttackAction.type)
    a.setSource(@)
    a.setTarget(entity)
    return a

  actionAttackEntityAtPosition: (position) ->
    board = @getGameSession().getBoard()
    targetEntity = if @getGameSession().getIsPracticeSandboxV2() then @getAttackRange().getTargetAtPosition(board, @, position) else board.getUnitAtPosition(position)
    if !targetEntity
      Logger.module("SDK").error("[G:#{@getGameSession().getGameId()}] Entity #{@getLogName()} actionAttackEntityAtPosition - attempt to attack position with no entity")
    return @actionAttack(targetEntity)

  #endregion ### ACTIONS ###

  # region CACHE

  updateCachedState: () ->
    super()

    @_private.cachedEntitiesKilledByAttackOn = null

    # flush movement and attack range cached state
    # ideally this only needs to be done once per step
    # because movement and attack ranges ONLY affect explicit actions
    @_private.movementRange.flushCachedState()
    @_private.attackRange.flushCachedState()

  flushCachedModifiers: () ->
    super()

    @_private.cachedIsBattlePet = null
    @_private.cachedIsUncontrollableBattlePet = null

  # endregion CACHE

  # region ACTION STATE RECORD

  actionPropertiesForActionStateRecord: () ->
    properties = super()

    # add entity specific properties to record
    properties.damage = (() -> return @getDamage() ).bind(@)
    properties.hp = (() -> return @getHP() ).bind(@)
    properties.maxHP = (() -> return @getMaxHP() ).bind(@)
    properties.baseMaxHP = (() -> return @getBaseMaxHP() ).bind(@)
    properties.atk = (() -> return @getATK() ).bind(@)
    properties.baseATK = (() -> return @getBaseATK() ).bind(@)

    return properties

  resolvePropertiesForActionStateRecord: () ->
    properties = super()

    # add entity specific properties to record
    properties.damage = (() -> return @getDamage() ).bind(@)
    properties.hp = (() -> return @getHP() ).bind(@)
    properties.maxHP = (() -> return @getMaxHP() ).bind(@)
    properties.baseMaxHP = (() -> return @getBaseMaxHP() ).bind(@)
    properties.atk = (() -> return @getATK() ).bind(@)
    properties.baseATK = (() -> return @getBaseATK() ).bind(@)

    return properties

  # endregion ACTION STATE RECORD

module.exports = Entity
