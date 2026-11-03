Unit = require 'app/sdk/entities/unit'
Factions = require 'app/sdk/cards/factionsLookup'
CardSet = require 'app/sdk/cards/cardSetLookup'
ModifierHealSelfWhenDealingDamage = require 'app/sdk/modifiers/modifierHealSelfWhenDealingDamage'
ModifierPhobiesBodyCount = require 'app/sdk/modifiers/modifierPhobiesBodyCount'
ModifierPhobiesCounterAttack = require 'app/sdk/modifiers/modifierPhobiesCounterAttack'
ModifierPhobiesRegatorate = require 'app/sdk/modifiers/modifierPhobiesRegatorate'
ModifierPhobiesRage = require 'app/sdk/modifiers/modifierPhobiesRage'
ModifierPhobiesHeartAttack = require 'app/sdk/modifiers/modifierPhobiesHeartAttack'

# Phobies source values are intentionally kept separate from the original
# Duelyst card definitions. The original card is consulted only for presentation.
ROSTER = [
  [50001, 11051, 'Ion', 1, 200, 0, 2, 'walk', 0, 'none']
  [50002, 19030, 'Crimson Oculus', 1, 1100, 320, 1, 'walk', 1, 'area']
  [50003, 19048, 'Skyrock Golem', 1, 600, 300, 2, 'walk', 1, 'melee']
  [50004, 19026, 'Rock Pulverizer', 2, 650, 425, 2, 'walk', 1, 'melee']
  [50005, 10981, 'Healing Mystic', 2, 650, 0, 2, 'walk', 0, 'none']
  [50006, 10001, 'Dragonlark', 2, 400, 210, 3, 'fly', 1, 'melee']
  [50007, 19038, 'Golem Metallurgist', 2, 1100, 375, 2, 'walk', 1, 'melee']
  [50008, 10953, 'Crossbones', 2, 600, 500, 1, 'fly', 2, 'ranged']
  [50009, 512, 'Borean Bear', 2, 500, 0, 2, 'walk', 0, 'none']
  [50010, 10205, 'Bloodshard Golem', 3, 1400, 400, 2, 'walk', 1, 'area']
  [50011, 11064, 'Inquisitor Kron', 3, 1100, 400, 2, 'walk', 1, 'melee']
  [50012, 10017, 'Fire Spitter', 3, 420, 220, 2, 'walk', 3, 'lobbed']
  [50013, 10962, 'Chaos Elemental', 3, 400, 0, 2, 'walk', 0, 'none']
  [50014, 19051, 'Flameblood Warlock', 3, 695, 250, 2, 'fly', 2, 'ranged']
  [50015, 11020, 'Wings of Paradise', 4, 1600, 450, 2, 'fly', 1, 'melee']
  [50016, 10995, 'Emerald Rejuvenator', 4, 1200, 340, 2, 'walk', 1, 'melee']
  [50017, 10989, 'Captain Hank Hart', 4, 1300, 400, 1, 'walk', 2, 'ranged']
  [50018, 10976, 'Dioltas', 4, 1600, 400, 2, 'phase', 1, 'melee']
  [50019, 10204, 'Brightmoss Golem', 4, 3000, 700, 1, 'walk', 1, 'melee']
  [50020, 11105, 'Wild Tahr', 4, 1800, 350, 2, 'walk', 1, 'melee']
  [50021, 11006, 'Black Locust', 5, 700, 700, 3, 'fly', 1, 'melee']
  [50022, 10954, 'Sworn Avenger', 5, 1650, 400, 2, 'walk', 2, 'ranged']
  [50023, 10973, 'Lux Ignis', 5, 1200, 500, 2, 'walk', 2, 'ranged']
  [50024, 10306, 'Lightbender', 5, 1800, 390, 2, 'walk', 1, 'melee']
  [50025, 11052, 'Hydrax', 6, 3000, 1000, 1, 'walk', 1, 'melee']
  [50026, 11112, 'Letigress', 6, 1100, 450, 2, 'walk', 2, 'ranged']
  [50027, 19031, 'Thorn Needler', 6, 1800, 500, 1, 'walk', 2, 'ranged']
  [50028, 404, 'Kolossus', 7, 2600, 425, 2, 'walk', 1, 'melee']
  [50029, 10207, 'Stormmetal Golem', 7, 2500, 700, 2, 'walk', 1, 'melee']
  [50030, 10956, 'Red Synja', 7, 2000, 450, 2, 'walk', 1, 'melee']
  [50031, 10996, 'Zurael, the Lifegiver', 7, 1700, 425, 2, 'walk', 1, 'melee']
  [50032, 10990, 'Rook', 7, 1750, 550, 3, 'walk', 1, 'melee']
  [50033, 19032, 'Rogue Warden', 7, 1700, 400, 2, 'walk', 2, 'ranged']
  [50034, 119, 'Hamon Bladeseeker', 8, 2700, 500, 1, 'walk', 1, 'area']
  [50035, 159, 'Xenkai Cannoneer', 8, 1800, 425, 2, 'walk', 2, 'ranged']
]

LIFEGAIN_CARD_IDS = [50002, 50004, 50011, 50014, 50015, 50018, 50030, 50034]
ACTIVE_ABILITY_BY_CARD_ID =
  50005: {effectCardId: 51001, lockdown: 0, cooldown: 1, useRange: 1}
  50014: {effectCardId: 51002, lockdown: 0, cooldown: 1, useRange: 2}
  50016: {effectCardId: 51003, lockdown: 0, cooldown: 3, useRange: 1}
  50017: {effectCardId: 51004, lockdown: 1, cooldown: 2, useRange: 2}
  50024: {effectCardId: 51005, lockdown: 1, cooldown: 2, useRange: 2}
  50026: {effectCardId: 51006, lockdown: 0, cooldown: 2, useRange: 2}
  50031: {effectCardId: 51007, lockdown: 1, cooldown: 3, useRange: 1}
  50001: {effectCardId: 51008, lockdown: 1, cooldown: 1, useRange: 1}
  50009: {effectCardId: 51009, lockdown: 1, cooldown: 1, useRange: 1}
  50013: {effectCardId: 51010, lockdown: 1, cooldown: 1, useRange: 1}
  50030: {effectCardId: 51011, lockdown: 1, cooldown: 2, useRange: 2}
  50004: {effectCardId: 51012, lockdown: 0, cooldown: 1, useRange: 2}
  50032: {effectCardId: 51013, lockdown: 0, cooldown: 1, useRange: 3}
  50020: {effectCardId: 51014, lockdown: 0, cooldown: 1, useRange: 1}

class CardFactory_Phobies
  @cardForIdentifier: (identifier, gameSession) ->
    row = (entry for entry in ROSTER when entry[0] is identifier)[0]
    return null unless row?

    [id, originalCardId, name, mana, hp, damage, speed, movementType, reach, attackType] = row
    card = new Unit(gameSession)
    card.setId(id)
    card.name = name
    card.factionId = Factions.Neutral
    card.setCardSetId(CardSet.Phobies)
    card.originalCardId = originalCardId
    card.manaCost = mana
    card.maxHP = hp
    card.atk = damage
    card.setDamage(0)
    card.setSpeed(speed)
    card.setMovementType(movementType)
    card.setReach(reach)
    card.setAttackType(attackType)
    card.activeAbility = ACTIVE_ABILITY_BY_CARD_ID[id] if ACTIVE_ABILITY_BY_CARD_ID[id]?

    modifiers = []
    if id in LIFEGAIN_CARD_IDS
      modifiers.push(ModifierHealSelfWhenDealingDamage.createContextObject({ healRatio: 0.5 }))
    if id is 50018
      modifiers.push(ModifierPhobiesBodyCount.createContextObject())
    else if id is 50027
      modifiers.push(ModifierPhobiesCounterAttack.createContextObject())
    else if id is 50028
      modifiers.push(ModifierPhobiesRegatorate.createContextObject())
    else if id is 50033
      modifiers.push(ModifierPhobiesRage.createContextObject())
    else if id is 50034
      modifiers.push(ModifierPhobiesHeartAttack.createContextObject())
    card.setInherentModifiersContextObjects(modifiers) if modifiers.length > 0

    # Resolve lazily so cardFactory can finish registering this factory first.
    if originalCardId > 0
      original = require('app/sdk/cards/cardFactory').cardForIdentifier(originalCardId, gameSession)
      throw new Error("Missing mapped Duelyst source card #{originalCardId} for Phobies card #{id}") unless original?
      card.setBaseAnimResource(original.getBaseAnimResource())
      card.setPortraitResource(original.getPortraitResource())
      card.setPortraitHexResource(original.getPortraitHexResource())
    return card

module.exports = CardFactory_Phobies
