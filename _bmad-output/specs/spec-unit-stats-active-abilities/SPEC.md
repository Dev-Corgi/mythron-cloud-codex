---
id: SPEC-unit-stats-active-abilities
companions:
  - active-ability-rules.md
  - ../spec-duelyst-rules-overhaul/SPEC.md
  - ../spec-duelyst-rules-overhaul/rules-detail.md
  - ../spec-practice-sandbox-map/SPEC.md
  - ../../../CARD_UI_HANDOFF.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Unit Stats and Hand-Slot Active Abilities

## Why

A vision to realize: make unit cards carry explicit movement, attack, and level stats, and let some units grant a Phobies-style active ability (Lockdown/Cooldown) as a spell-like card in their hand slot. Today these traits are implicit keywords and numbers; the new card UI in `duelyst/app/resources/card_ui/` already shows them but is not wired into the game.

## Capabilities

- **CAP-1**
  - **intent:** Every unit has a movement type (walk, fly, phase) and a movement distance as explicit stats.
  - **success:** A card with no explicit values shows and uses walk, distance 2. Walk, fly, and phase behave exactly as already defined in game rules and the map spec (fly and phase cross and occupy holes and Walls; walk does not). Movement distance equals the unit's existing per-move speed.
- **CAP-2**
  - **intent:** Every unit has an attack type (melee, ranged, area) and an attack range as explicit stats.
  - **success:** A card with no explicit values shows and uses melee, range 1. Melee, ranged, and area attacks behave as already defined in game rules and the map spec; attack range equals the unit's existing reach.
- **CAP-3**
  - **intent:** Every unit has a level stat.
  - **success:** All cards have level 1 and display `LEVEL 1`; changing a card's level value changes only its display until level rules are specified.
- **CAP-4**
  - **intent:** Some units grant an active ability with Lockdown and Cooldown counters, usable like a spell while the unit lives.
  - **success:** While the granting unit is alive on the field, its hand slot shows the ability as a spell-style card. The ability is usable only when Lockdown and Cooldown are both 0, with the ability's own target range; using it resets Cooldown. When first shown, exactly one counter is nonzero. Rules in `active-ability-rules.md`.
- **CAP-5**
  - **intent:** The hand slot and card detail view present the new stats and the ability's counters.
  - **success:** Unit cards render movement type/distance, attack type/range, level, and attack/health per the `phobies_unit` layout; an ability card renders a violet padlock ring for nonzero Lockdown (image 1) or a cyan hourglass ring for nonzero Cooldown (image 2) per `phobies_ability`. Detail view of an ability-bearing unit shows the unit and, in the related-card position (where a spell like Phoenix Fire appears for Lantern Fox), the ability card.

## Constraints

- Walk, fly, phase, melee, ranged, and area must reuse existing game definitions; stats expose them rather than introduce parallel mechanics.
- Hand slots are fixed: the ability occupies the granting unit's own emptied slot and no card is added to or shifted in hand.
- The ability exists only while its unit is alive on the field.
- The card UI uses the layered assets and `*-layout.json` in `card_ui/phobies_unit` and `phobies_ability`, never the flattened preview images.
- Ability effects come from existing Duelyst spell cards.

## Non-goals

- Level mechanics (progression, stat scaling); all cards stay level 1.
- Designing new abilities or rebalancing cards.
- Changing the existing 40-card deck modes' rules beyond what the shared stat model requires.
- New unit art or UI asset redesign.

## Success signal

A Practice match shows a unit card with its move, attack, and level stats; after it is summoned, its slot shows e.g. Phoenix Fire with a padlock or hourglass counter. The ability becomes castable only after the counter reaches 0, shows the other counter after use, and the detail view shows unit plus ability together.

## Assumptions

- The stat model applies to all cards, while the new UI and abilities appear first in Practice and Sandbox, matching the rules-overhaul rollout.
- Phobies semantics: Lockdown delays first use after deployment; Cooldown delays reuse after each use. Counter decrement timing is undecided (see Open Questions).

## Open Questions

- When do Lockdown and Cooldown decrement (whose turn end/start), and what are the initial values per ability?
- Does using an ability cost mana?
- What is the initial ability roster, each ability's use range, and which units carry them?
- What is the area attack's shape, and does ranged keep "whole board" or follow the explicit attack range stat?
- What happens to the ability if its unit dies, is silenced, or is dispelled?
- Do the new stat icons replace or coexist with existing keyword text such as Ranged and Flying?
