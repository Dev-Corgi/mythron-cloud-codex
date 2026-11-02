# Card Roster

Mapping and Phobies source values for the 35 imported cards. Name, sprite and skill icon come from the Duelyst card; every other value from Phobies (`C:\Working\PhobiesGallery\cards-data.json`). Mana cost = Phobies `keys` (assumption). Lockdown = Phobies `unlocking`; Cooldown default 1 when blank. Empty attack = no basic attack (ability-only unit). Phobies Targeted AOE = area attack centered on the attacker with the range as radius (Numbskull, Minotaur, Hi-Five); Beauty's basic attack is a ranged single-target attack. Electric/poison/fire/disease fields are ignored.

| Phobies | Duelyst name/sprite | Skill icon | Mana | HP | ATK | Move | Attack | Passive | Active (Lockdown/Cooldown) |
|---|---|---|---|---|---|---|---|---|---|
| BOOM | Ion | Pupabomb | 1 | 200 | — | walk 2 | none | — | Special Delivery (1/1) |
| Numbskull | Crimson Oculus | — | 1 | 1100 | 320 | walk 1 | area 1 | — | — |
| Razor Mouth | Skyrock Golem | — | 1 | 600 | 300 | walk 2 | melee 1 | — | — |
| Cassowary | Rock Pulverizer | Knucklestorm | 2 | 650 | 425 | walk 2 | melee 1 | — | Caw Claw (0/1) |
| Cupcake | Healing Mystic | Flash Reincarnation | 2 | 650 | — | walk 2 | none | — | I feel great! (0/1) |
| Droney | Dragonlark | — | 2 | 400 | 210 | fly 3 | melee 1 | — | — |
| K-9000 | Golem Metallurgist | — | 2 | 1100 | 375 | walk 2 | melee 1 | — | — |
| Gesundheit | Crossbones | — | 2 | 600 | 500 | fly 1 | ranged 2 | — | — |
| Rusty | Borean Bear | Flash Freeze | 2 | 500 | — | walk 2 | none | — | Gotcha (1/1) |
| Minotaur | Bloodshard Golem | — | 3 | 1400 | 400 | walk 2 | area 1 | — | — |
| Grave Digger | Inquisitor Kron | Boulder Hurl | 3 | 1100 | 400 | walk 2 | melee 1 | — | Terrorform (0/2) |
| Jar Cannon | Fire Spitter | — | 3 | 420 | 220 | walk 2 | lobbed 3 | — | — |
| KABOOM | Chaos Elemental | Pupabomb | 3 | 400 | — | walk 2 | none | — | Poof! (1/1) |
| Murder Wing | Flameblood Warlock | Phoenix Fire | 3 | 695 | 250 | fly 2 | ranged 2 | — | Monty (0/1) |
| Blinky | Wings of Paradise | — | 4 | 1600 | 450 | fly 2 | melee 1 | — | — |
| Doctor Dermic | Emerald Rejuvenator | Flash Reincarnation | 4 | 1200 | 340 | walk 2 | melee 1 | — | Pure Adrenaline (0/3) |
| Gonzo Bonzo | Captain Hank Hart | War Surge | 4 | 1300 | 400 | walk 1 | ranged 2 | — | Clang! Clang! (1/2) |
| Grimes | Dioltas | — | 4 | 1600 | 400 | phase 2 | melee 1 | Body Count | — |
| Hydra | Brightmoss Golem | — | 4 | 3000 | 700 | walk 1 | melee 1 | — | — |
| Slammer Head | Wild Tahr | Koan of Horns | 4 | 1800 | 350 | walk 2 | melee 1 | — | Play Smashface (0/1) |
| Morty | Black Locust | — | 5 | 700 | 700 | fly 3 | melee 1 | — | — |
| Psyclops | Sworn Avenger | — | 5 | 1650 | 400 | walk 2 | ranged 2 | — | — |
| Staremaster | Lux Ignis | — | 5 | 1200 | 500 | walk 2 | ranged 2 | — | — |
| Woolly Bully | Lightbender | Blindscorch | 5 | 1800 | 390 | walk 2 | melee 1 | — | Peek-a-booOO! (1/2) |
| Cerberus | Hydrax | — | 6 | 3000 | 1000 | walk 1 | melee 1 | — | — |
| Scritch | Letigress | Flash Reincarnation | 6 | 1100 | 450 | walk 2 | ranged 2 | — | Helping Hand (0/2) |
| Zappy | Thorn Needler | — | 6 | 1800 | 500 | walk 1 | ranged 2 | Counter Attack | — |
| Alley Gator | Kolossus | — | 7 | 2600 | 425 | walk 2 | melee 1 | Regatorate | — |
| Fishtank | Stormmetal Golem | — | 7 | 2500 | 700 | walk 2 | melee 1 | — | — |
| Fleshcrawler | Red Synja | Holy Immolation | 7 | 2000 | 450 | walk 2 | melee 1 | — | Raising Hell! (1/2) |
| Leshy | Zurael, the Lifegiver | Aperion's Claim | 7 | 1700 | 425 | walk 2 | melee 1 | — | Group Hug (1/3) |
| Mr Tramples | Rook | Spiral Counter | 7 | 1750 | 550 | walk 3 | melee 1 | — | Bull Rush (1/1) |
| Ogre | Rogue Warden | — | 7 | 1700 | 400 | walk 2 | ranged 2 | Rage | — |
| Hi-Five | Hamon Bladeseeker | — | 8 | 2700 | 500 | walk 1 | area 1 | Heart Attack | — |
| Beauty | Xenkai Cannoneer | Thunderbomb | 8 | 1800 | 425 | walk 2 | ranged 2 | — | Behold (1/1) |

Target terms: effects that deal damage, move or push, or lower stats may target any unit including Generals; healing and Attack-boosting effects target friendly minions only.

## Passive and active behavior (Phobies descriptions, authoritative)

Exception: the non-Undead restriction in the Phobies heal descriptions is ignored (no Undead race exists).

- **BOOM — Special Delivery (active):** Destroys itself in order to deliver damage to all adjacent enemy units. range=1 active_attack=550
- **Cassowary — Caw Claw (active):** Allows the unit to move 1 tile and perform a melee attack with a single action. range=2 active_attack=425
- **Cupcake — I feel great! (active):** Heals and/or cures poison from a friendly non-Undead unit and increases the damage of the unit for the current turn range=1 active_heal=650 active_buff=300
- **Rusty — Gotcha (active):** Destroys itself in order to prevent an enemy unit from moving. range=1 effect_duration=2
- **Grave Digger — Terrorform (active):** Can be used to create or remove obstacles on adjacent tiles. Created obstacles have HP are immovable and are targetable by both teams. range=
- **KABOOM — Poof! (active):** Destroys itself in order to deliver damage to all adjacent enemy units. range=1 active_attack=1400
- **Murder Wing — Monty (active):** Deals damage to an enemy unit. range=2 active_attack=450
- **Doctor Dermic — Pure Adrenaline (active):** Heals and/or cures poison from a friendly non-Undead unit. range=1 active_attack=1500 active_heal=1500
- **Gonzo Bonzo — Clang! Clang! (active):** Increases the damage of a friendly unit for the current turn. range=2 active_attack=0 active_buff=300 effect_duration=1
- **Grimes — Body Count (passive):** Each time it directly kills an enemy, it's damage increases. This buff lasts for the rest of that game. passive_buff=200
- **Slammer Head — Play Smashface (active):** Damages and pushes an enemy unit backwards 1 tile. Default direction is a straight line. range=1 active_attack=350
- **Woolly Bully — Peek-a-booOO! (active):** Reduces the damage of an enemy unit. range=2 effect_duration=2
- **Scritch — Helping Hand (active):** Increases the damage of a friendly unit for the current turn. range=2 active_buff=300 effect_duration=1
- **Zappy — Counter Attack (passive):** Enemies that deal damage to it receive a portion of the damage dealt. passive_reflect=0.35 passive_electric=0.35
- **Alley Gator — Regatorate (passive):** At the beginning of each of your turns, the unit heals damage. Does not cure poison. passive_heal=400
- **Fleshcrawler — Raising Hell! (active):** Damages all enemy units directly adjacent to it. All enemy units 2 tiles away and within line of sight are dealt 50% damage. range=2 active_attack=600
- **Leshy — Group Hug (active):** Heals and/or cures poison from all adjacent friendly non-Undead units. range=1 active_attack=1100 active_heal=1100
- **Mr Tramples — Bull Rush (active):** Moves the unit through enemy unit's tiles or empty tiles to an unoccupied tile 3 tiles away. All enemy tiles moved through are damaged in the process. Pathfinding prioritizes enemy tiles over empty tiles. range=3 active_attack=550
- **Ogre — Rage (passive):** Deals extra damage for the rest of the game as soon as your heart falsl to 3000 HP or below. passive_buff=300
- **Hi-Five — Heart Attack (passive):** Deals additional damage when attacking the enemy Heart. passive_buff=400
- **Beauty — Behold (active):** Can target an enemy if it's tile forms a straight line with your tile. The unit is damaged as well as enemy units behind. range=2 active_attack=500

## Card effect text (Duelyst terminology)

Passives show in the Duelyst card's effect text, replacing the original Duelyst text. Heart is the General.

- **Grimes → Dioltas:** Whenever this minion destroys an enemy by attacking, it permanently gains +200 Attack.
- **Zappy → Thorn Needler:** Whenever this minion takes damage, deal 35% of that damage (rounded down) to the damage source.
- **Alley Gator → Kolossus:** At the start of your turn, restore 400 Health to this minion.
- **Ogre → Rogue Warden:** When your General has 3000 or less Health, this minion permanently gains +300 Attack.
- **Hi-Five → Hamon Bladeseeker:** Deals +400 damage when attacking the enemy General.

## Active ability text (Duelyst terminology)

Each ability card is named by its Duelyst skill (the skill icon name in the roster table), not by the Phobies active name, which is kept in parentheses for reference.

Shown on the ability card; ranges are the use range in tiles. Poison wording is dropped because poison is ignored. All 16 actives in the roster are covered.

- **Ion — Pupabomb** (Phobies: Special Delivery) (range 1): Destroy this minion. Deal 550 damage to all adjacent enemy units.
- **Chaos Elemental — Pupabomb** (Phobies: Poof!) (range 1): Destroy this minion. Deal 1400 damage to all adjacent enemy units.
- **Rock Pulverizer — Knucklestorm** (Phobies: Caw Claw) (range 2): Move this minion 1 tile and attack with it as a single action; the attack deals 425 damage.
- **Healing Mystic — Flash Reincarnation** (Phobies: I feel great!) (range 1): Restore 650 Health to a friendly minion and give it +300 Attack this turn.
- **Emerald Rejuvenator — Flash Reincarnation** (Phobies: Pure Adrenaline) (range 1): Restore 1500 Health to a friendly minion.
- **Zurael, the Lifegiver — Aperion's Claim** (Phobies: Group Hug) (range 1): Restore 1100 Health to all adjacent friendly minions.
- **Captain Hank Hart — War Surge** (Phobies: Clang! Clang!) (range 2): Give a friendly minion +300 Attack this turn.
- **Letigress — Flash Reincarnation** (Phobies: Helping Hand) (range 2): Give a friendly minion +300 Attack this turn.
- **Lightbender — Blindscorch** (Phobies: Peek-a-booOO!) (range 2): Give an enemy unit -300 Attack for 2 turns.
- **Borean Bear — Flash Freeze** (Phobies: Gotcha) (range 1): Destroy this minion. An enemy unit cannot move for 2 turns.
- **Flameblood Warlock — Phoenix Fire** (Phobies: Monty) (range 2): Deal 450 damage to an enemy unit.
- **Wild Tahr — Koan of Horns** (Phobies: Play Smashface) (range 1): Deal 350 damage to an enemy unit and push it back 1 tile in a straight line.
- **Inquisitor Kron — Boulder Hurl** (Phobies: Terrorform) (adjacent tiles): Create a 2000-Health Wall on an adjacent empty tile, or destroy an adjacent Wall.
- **Red Synja — Holy Immolation** (Phobies: Raising Hell!) (range 2): Deal 600 damage to all adjacent enemy units and 300 damage to enemy units 2 tiles away in a straight line.
- **Rook — Spiral Counter** (Phobies: Bull Rush) (range 3): Move this minion through enemy units or empty tiles to an unoccupied tile 3 tiles away, dealing 550 damage to each enemy unit passed through. Enemy units are preferred over empty tiles when choosing the path.
- **Xenkai Cannoneer — Thunderbomb** (Phobies: Behold) (range 2): Deal 500 damage to an enemy unit in a straight line from this minion, and to enemy units behind it.

## Lifegain

Cards with Lifegain: Crimson Oculus, Rock Pulverizer, Inquisitor Kron, Flameblood Warlock, Wings of Paradise, Dioltas, Red Synja, Hamon Bladeseeker (the Phobies Undead cards; no Undead race or tag is created).
Effect text: **Lifegain** — Whenever this minion deals damage, restore Health to it equal to 50% of the damage dealt (rounded down).

## Active ability FX

Using an active shows its ability card as a spell does: card back, then the reveal animation, then the effects below. Sound follows the sfx the original game plays with the same effects. "Default hit" means the standard hit effect a unit shows when attacked by that unit. Names refer to the existing Duelyst FX; reuse them and add no new assets. Divine Bond is replaced by War Surge and Circle of Life by Aperion's Claim, with those spells' own effects.

| Skill icon | Used by | Caster side | Target side |
|---|---|---|---|
| Pupabomb | BOOM, KABOOM | Ironcliffe Guardian · Unit Attacked | 0 · Impact (Fire variant) |
| Flash Reincarnation | Cupcake, Doctor Dermic, Scritch | Amplification · Spell Cast | Dampening Wave · Spell Applied |
| Flash Freeze | Rusty | Fireblazer · Unit Attacked | Blinding Snowstorm · Spell Applied |
| Boulder Hurl | Grave Digger | Create Wall: Droplift · Spell Applied. Destroy Wall: Artifact Defiler · Spell Applied | — |
| Knucklestorm | Cassowary | Neutral · Unit Spawn | Default hit |
| Phoenix Fire | Murder Wing | Neutral · Unit Spawn | Phoenix Fire · Spell Applied |
| War Surge | Gonzo Bonzo | As War Surge | As War Surge |
| Koan of Horns | Slammer Head | Cryonic Potential | 0 · Impact (Ice variant) |
| Blindscorch | Woolly Bully | Droplift · Spell Cast | Polarity · Spell Applied |
| Holy Immolation | Fleshcrawler | Deal Damage · Spell Applied | Default hit |
| Aperion's Claim | Leshy | As Aperion's Claim | As Aperion's Claim |
| Spiral Counter | Mr Tramples | Neutral · Unit Spawn | Default hit |
| Thunderbomb | Beauty | The blast-modifier attack effect in the target direction | As that attack |

### FX name lookup

Source: `C:\Working\Duelyst Card Gallery\duelyst\gallery\fx_composites.json` (the local Card Gallery site). Display names there use `·` between card and event.

| FX name | Composite id |
|---|---|
| Ironcliffe Guardian · Unit Attacked | `Cards.Faction1.IroncliffeGuardian.UnitAttackedFX` |
| Amplification · Spell Cast | `Cards.Spell.Amplification.SpellCastFX` |
| Dampening Wave · Spell Applied | `Cards.Spell.DampeningWave.SpellAppliedFX` |
| Fireblazer · Unit Attacked | `Cards.Neutral.Fireblazer.UnitAttackedFX` (a second entry exists under `Cards.Neutral.HailstoneHowler`) |
| Blinding Snowstorm · Spell Applied | `Cards.Spell.BlindingSnowstorm.SpellAppliedFX` |
| Droplift · Spell Applied / Spell Cast | `Cards.Spell.DropLift.SpellAppliedFX` / `Cards.Spell.DropLift.SpellCastFX` |
| Artifact Defiler · Spell Applied | `Cards.Spell.ArtifactDefiler.SpellAppliedFX` |
| Neutral · Unit Spawn | `Factions.Neutral.UnitSpawnFX` |
| Phoenix Fire · Spell Applied | `Cards.Spell.PhoenixFire.SpellAppliedFX` |
| Cryonic Potential · Spell Cast | `Cards.Spell.CryonicPotential.SpellCastFX` |
| Polarity · Spell Applied | `Cards.Spell.Polarity.SpellAppliedFX` |
| Deal Damage · Spell Applied | `Cards.Spell.FollowupDamage.SpellAppliedFX` |
| War Surge | `Cards.Spell.WarSurge.SpellCastFX` |
| Aperion's Claim | `Cards.Spell.AperionsClaim.SpellCastFX` |
| Thunderbomb (Beauty caster) | `ModifierBlastAttack` effects in code: `FX.Modifiers.ModifierBlast` and `FX.Cards.Faction3.Blast`; the Thunderbomb spell's own FX is `Cards.Spell.Thunderbomb.SpellCastFX` |
| 0 · Impact | Pupabomb target: `Modifiers.ModifierGenericDamageFire.ModifierTriggeredFX.0.impactFX`. Koan of Horns target: `Modifiers.ModifierGenericDamageIce.ModifierTriggeredFX.0.impactFX`. |

### Active ability sfx

Source: the original spell cards' `setBaseSoundResource` `apply` sound in `app/sdk/cards/factory`. The sound plays when the ability resolves, with the FX above.

| Skill icon | Original spell | `apply` sound |
|---|---|---|
| Pupabomb | Egg Grenade card (`wartech/faction5`, FX name Pupabomb) | `sfx_f2_jadeogre_attack_impact` |
| Flash Reincarnation | `core/faction5` | `sfx_spell_flashreincarnation` |
| Flash Freeze | `core/faction6` | `sfx_f6_icebeetle_death` |
| Boulder Hurl | `firstwatch/neutral` | `sfx_spell_naturalselection` |
| Knucklestorm | `coreshatter/faction2` | `sfx_neutral_bluetipscorpion_attack_impact` |
| Phoenix Fire | `core/faction2` | `sfx_spell_phoenixfire` |
| War Surge | `core/faction1` | `sfx_spell_warsurge` |
| Koan of Horns | `shimzar/faction2` | `sfx_f2tank_attack_swing` |
| Blindscorch | `core/faction3` | `sfx_spell_blindscorch` |
| Holy Immolation | `core/faction1` | `sfx_f2_jadeogre_attack_impact` |
| Aperion's Claim | `firstwatch/faction1` | `sfx_spell_voidpulse` |
| Spiral Counter | `firstwatch/faction2` | `sfx_spell_spiraltechnique` |
| Thunderbomb | `wartech/faction2` | `sfx_spell_phoenixfire` |

The original unit attacks named in the FX table (Ironcliffe Guardian, Fireblazer) may have their own sounds, which were not checked.
