---
id: SPEC-phobies-card-import
companions:
  - card-roster.md
  - practice-bot-deck.md
  - ../../planning-artifacts/architecture/architecture-phobies-card-import-2026-11-02/ARCHITECTURE-SPINE.md
  - ../spec-duelyst-rules-overhaul/SPEC.md
  - ../spec-duelyst-rules-overhaul/rules-detail.md
  - ../spec-practice-sandbox-map/SPEC.md
  - ../spec-unit-stats-active-abilities/SPEC.md
  - ../spec-unit-stats-active-abilities/active-ability-rules.md
sources: []
---

# Phobies Card Import

## Why

Bring 35 Phobies cards into Duelyst's Practice and Sandbox, keeping Phobies' stats, passives and actives but Duelyst's names, sprites and skill icons, without altering any card or rule in other modes while the new rules are tested only here.

## Capabilities

- **CAP-1**
  - **intent:** Each of the 35 cards in `card-roster.md` exists as a Practice/Sandbox-only card carrying Phobies stats with Duelyst name, sprite and skill icon.
  - **success:** For every roster row, the card shows the Duelyst name prefixed with a temporary `[PB] `, the Duelyst sprite and skill icon, and uses the Phobies health, attack, mana cost, movement type/range and attack type/range via the unit-stats spec; Phobies Walking, Flying and Bypassing map to walk, fly and phase.
- **CAP-2**
  - **intent:** Imported cards can be used in Practice and Sandbox decks and nowhere else.
  - **success:** The cards appear in Practice and Sandbox nine-card deck creation and can be played in those matches under ruleset `practice-sandbox-hex` v2. They never appear in, or leak into, any other mode's collection, shop, crafting, 40-card decks, draws, generated cards or lookups.
- **CAP-3**
  - **intent:** Phobies passives work on imported cards.
  - **success:** Each passive in `card-roster.md` (Body Count, Counter Attack, Regatorate, Rage, Heart Attack) behaves as its Phobies description states and appears in the card's effect text, worded in Duelyst terminology (General, minion, Attack, Health) per `card-roster.md`.
- **CAP-4**
  - **intent:** Phobies active abilities work as hand-slot abilities.
  - **success:** Each active in `card-roster.md` is a hand-slot ability under the unit-stats ability structure, with Phobies Lockdown (`unlocking`), Cooldown (default 1), range and effect, and displays the roster's Duelyst skill icon; its effect text is worded in Duelyst terminology per `card-roster.md`. Using it plays the spell-style card reveal (card back, then reveal) followed by the caster and target effects and sounds listed in the roster's FX table, using existing Duelyst effects only.

- **CAP-5**
  - **intent:** Generals are sturdier and Methron control hits harder to match Phobies-scale stats.
  - **success:** In Practice and Sandbox v2 matches each General starts with 6000 health, and the Methron deficit deals 200 damage per point of deficit (3 versus 1 deals 400); other modes keep their General health and damage values. Ogre's Rage and Hi-Five's Heart Attack treat the General as the Heart.

- **CAP-6**
  - **intent:** The eight Phobies Undead cards carry the Lifegain modifier.
  - **success:** Crimson Oculus, Rock Pulverizer, Inquisitor Kron, Flameblood Warlock, Wings of Paradise, Dioltas, Red Synja and Hamon Bladeseeker, whenever they deal damage, restore Health to themselves equal to 50% of the damage dealt, rounded down and capped at missing Health. No Undead race or tag exists, and healing effects have no Undead restriction.

- **CAP-7**
  - **intent:** Practice and Sandbox allow only the imported cards, and the Practice bot plays them.
  - **success:** The allowed-card list for Practice and Sandbox decks is reset to the 35 imported cards plus generals; no previously allowed neutral or faction card is selectable or playable there, and saved Practice/Sandbox decks containing removed cards are deleted automatically. Deck selection offers, for each faction's primary General, a preset starter deck equal to that General plus the eight cards of `practice-bot-deck.md`, replacing the 40-card faction starter decks in these modes. The Practice bot deck is `practice-bot-deck.md` for each general, replacing the former list, and the bot plays it under its existing difficulty modes and balanced policy.

## Constraints

- Neutral Walls in Practice and Sandbox v2 have 2000 Health instead of 10, superseding the map spec's CAP-4 value; the Bonechill Barrier visuals and all other Wall rules are unchanged.
- The `[PB] ` name prefix is temporary and display-only; it must be removable in one place without changing card ids or lookups. Original and imported cards are told apart by id, a dedicated `Phobies` card set and a field linking to the original card id, not by name.
- Supersedes the allowed cards of the overhaul spec and the bot deck in `../spec-duelyst-rules-overhaul/practice-bot-deck.md` for Practice and Sandbox. Planar Scout's dev placeholder ability in the unit-stats spec is retired from these modes, since the card is no longer allowed.
- Lifegain is a new generic modifier (ratio-parameterized, modeled on the existing heal-self-when-dealing-damage modifier, which restores 100%), attached only to imported cards; no legacy card changes. It counts all damage the unit deals, including its active abilities.

- The 6000 General health and 200-per-point Methron damage supersede the Methron value (2 per point) in the map spec's CAP-3, in Practice and Sandbox v2 only.
- Phobies Targeted AOE basic attacks (Numbskull, Minotaur, Hi-Five) are area attacks centered on the attacker, with the attack range as radius, hitting enemies only.
- Phobies electric, poison, fire and disease fields are ignored; Zappy's Counter Attack applies only its 35% reflect, rounded down.
- Imported cards use ruleset `practice-sandbox-hex` v2, with no new version.

- Every imported card is a new card with its own id; the original Duelyst card is never modified, so legacy modes, collections, replays and snapshots keep original behavior and appearance.
- Imported cards are legal only in Practice and Sandbox matches bound to ruleset `practice-sandbox-hex` v2; selecting or playing them under any other ruleset, mode or Developer Sandbox is rejected rather than silently substituted.
- Imported cards must be excluded from every card pool other modes read (collection, shop, crafting, Gauntlet, Rift, Challenges, Boss Battle, random generation); any mode-gating must be enforced at that pool, not by hiding in the UI.
- Phobies is authoritative for stats, passives and actives; Duelyst is authoritative only for name, sprite and skill icon. Where the two conflict, Phobies wins.
- Phobies abilities with unique effects need their own effect definitions; they cannot all reuse existing Duelyst spells. The Duelyst skill icon is presentation only. This supersedes the unit-stats spec constraint that ability effects come from existing Duelyst spells and its non-goal on the ability roster, for these 35 cards.
- Imported cards follow all Practice/Sandbox rules in the overhaul, map and unit-stats specs (fixed hand slots, action points, six-neighbor hex, no counterattack, Walls).
- A passive or active whose Phobies effect conflicts with those rules is unavailable until reconciled; it is not an exception to them.

## Non-goals

- Importing the other Phobies cards, Phobies factions, rarity or progression, or rebalancing the imported cards.
- Enabling imported cards, or the new rules, in any mode beyond Practice and Sandbox.
- New art beyond the Duelyst sprites and skill icons in `card-roster.md`.

## Success signal

A Practice match and a Sandbox match each accept a nine-card deck containing imported cards; units show Duelyst name and sprite with Phobies stats; passives and actives (with Lockdown/Cooldown counters and Duelyst skill icons) behave per `card-roster.md`. In Ranked, Casual, Gauntlet, collection, shop and crafting no imported card appears, and every original Duelyst card (e.g. Ion) plays and displays exactly as before.

## Assumptions

- Beauty's basic attack is a ranged single-target attack of range 2; its Behold active is the separate straight-line beam.
- Phobies `keys` is the mana cost.
- Phobies health and damage values (hundreds to thousands) are used as-is; existing cards and Generals are not rescaled.
- Phobies `unlocking` is the base Lockdown; a blank cooldown defaults to 1; the Phobies Heart is the General.
- Phobies Line of Sight range 1 is melee, range 2 or more ranged; Lob is lobbed.
