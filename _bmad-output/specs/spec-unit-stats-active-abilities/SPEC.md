---
id: SPEC-unit-stats-active-abilities
companions:
  - active-ability-rules.md
  - ../spec-duelyst-rules-overhaul/SPEC.md
  - ../spec-duelyst-rules-overhaul/rules-detail.md
  - ../spec-practice-sandbox-map/SPEC.md
  - ../spec-practice-sandbox-map/map-layout.md
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
  - **success:** A card with no explicit values shows and uses walk, distance 2. Walk and fly behave as already defined (fly crosses and occupies holes and Walls; walk does not). Fly cannot pass through enemy units. Phase has all fly abilities and can also pass through enemy units; it still cannot stop on an occupied position. Movement distance equals the unit's existing per-move speed.
- **CAP-2**
  - **intent:** Every unit has an attack type (melee, ranged, area) and an attack range as explicit stats.
  - **success:** A card with no explicit values shows and uses melee, range 1. Melee, ranged, and area attacks reuse existing definitions; attack range equals the unit's existing reach, including for ranged units (no longer the whole board). Ranged and area geometry follow the map spec: ranged along the six hex axes up to the range, area as circular explosions per `map-layout.md`, where an area attack explodes centered on the attacker and the range stat is the explosion radius; enemies within it are hit, allies excluded.
- **CAP-3**
  - **intent:** Every unit has a level stat.
  - **success:** All cards have level 1 and display `LEVEL 1`; changing a card's level value changes only its display until level rules are specified.
- **CAP-4**
  - **intent:** Some units grant an active ability with Lockdown and Cooldown counters, usable like a spell while the unit lives.
  - **success:** While the granting unit is alive on the field, its hand slot shows the ability as a spell-style card. The ability is usable only when Lockdown and Cooldown are both 0, with the ability's own target range, at no mana cost; using it resets Cooldown to its base. Counters decrement by 1 (floor 0) at the end of the owning player's turn; defaults are Lockdown 0, Cooldown 1 unless an ability sets its own. When first shown, exactly one counter is nonzero. Death empties the slot; silence disables the ability and removal of silence re-enables it. Rules in `active-ability-rules.md`.
- **CAP-5**
  - **intent:** The hand slot and card detail view present the new stats and the ability's counters.
  - **success:** Unit cards render movement type/distance, attack type/range, level, and attack/health per the `phobies_unit` layout; an ability card renders a violet padlock ring for nonzero Lockdown (image 1) or a cyan hourglass ring for nonzero Cooldown (image 2) per `phobies_ability`. Detail view of an ability-bearing unit shows the unit and, in the related-card position (where a spell like Phoenix Fire appears for Lantern Fox), the ability card.
- **CAP-6**
  - **intent:** Each unit acts through a per-turn action-point budget, as in Phobies, instead of Duelyst's one move plus one attack.
  - **success:** Every unit has 2 action points per turn. Its moves, attacks, and ability use are limited by that budget rather than by the old one-move-one-attack allowance; each move, attack, and ability use costs 1 action point in any combination, and points refresh to 2 at the start of the owner's turn. The existing exhausted state is treated as 0 action points. A newly summoned unit starts exhausted (0 points) and gains 2 at the start of its owner's next turn. Details in `active-ability-rules.md`. Outside Practice and Sandbox the old allowance is unchanged.

## Constraints

- The stat model exists on all cards, but the new stat-driven rules, UI, and abilities apply only in Practice and Sandbox; all other modes keep existing rules, behavior, and presentation.
- Lockdown delays an ability's first use after its unit is deployed; Cooldown delays reuse after each use, as in the game Phobies.
- Walk, fly, melee, ranged, and area reuse existing game definitions; stats expose them rather than introduce parallel mechanics.
- Phase is a modifier in the same style as the existing Flying modifier (not an ad-hoc flag), granting fly plus passing through enemy units. This supersedes the earlier "no separate Phasing modifier" note in Story 2.4; the map spec's "flying and phasing" terrain permissions then apply to both fly and phase.
- Hand slots are fixed: the ability occupies the granting unit's own emptied slot and no card is added to or shifted in hand.
- The ability exists only while its unit is alive on the field.
- The card UI uses the layered assets and `*-layout.json` in `card_ui/phobies_unit` and `phobies_ability`, never the flattened preview images.
- Ranged and area geometry, Wall blocking, and the target-supporting-Wall exception are defined by the map spec; this spec only supplies the range stat.
- Ability effects come from existing Duelyst spell cards.
- The new stat icons replace the existing keyword text for move and attack types.
- Phase differs from fly only by passing through enemy units; hole and Wall permissions are identical.
- A silenced unit's ability keeps its counters; removing silence re-enables it with the same values.
- Every active ability has Cooldown ≥ 1, so no ability can be used more than once per turn by Cooldown alone.
- Ability data (effect, Lockdown, Cooldown, use range) is attached per card through a general structure so later cards can add unique abilities without engine changes.
- Development placeholder: Planar Scout carries Phoenix Fire with Lockdown 1, Cooldown 1.

## Non-goals

- Level mechanics (progression, stat scaling); all cards stay level 1.
- Designing the ability roster or new abilities now; unique abilities arrive with future cards. Only the structure and the Planar Scout placeholder are in scope.
- Rebalancing cards.
- Changing action points per unit (all units have 2 for now).
- Displaying action points on cards; a later spec handles it. Until then only the existing exhausted indicator is shown.
- Changing the existing 40-card deck modes' rules beyond what the shared stat model requires.
- New unit art or UI asset redesign.

## Success signal

A Practice match shows a unit card with its move, attack, and level stats; after it is summoned, its slot shows e.g. Phoenix Fire with a padlock or hourglass counter. The ability becomes castable only after the counter reaches 0, shows the other counter after use, and the detail view shows unit plus ability together.
