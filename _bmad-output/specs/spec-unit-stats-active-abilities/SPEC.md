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
  - **success:** A card with no explicit values shows and uses walk, distance 2. Walk and fly behave as already defined for terrain (fly crosses and occupies holes and Walls; walk does not), and both move at most the unit's movement distance; fly no longer means moving anywhere on the battlefield. Fly cannot pass through enemy units. Phase has all fly abilities and can also pass through enemy units; it still cannot stop on an occupied position. Movement distance equals the unit's existing per-move speed.
- **CAP-2**
  - **intent:** Every unit has an attack type (melee, ranged, lobbed, area) and an attack range as explicit stats.
  - **success:** A card with no explicit values shows and uses melee, range 1. Melee, ranged, and area attacks reuse existing definitions; a lobbed attack, as in Phobies, arcs over obstacles, so intervening Walls and units do not block it, and it can target any tile within hex distance of its range, adjacent tiles included; attack range equals the unit's existing reach, including for ranged units (no longer the whole board). Ranged and area geometry follow the map spec: ranged targets any in-range tile whose center line is not blocked by Walls, area as circular explosions per `map-layout.md`, where an area attack explodes centered on the attacker and the range stat is the explosion radius; enemies within it are hit, allies excluded. The Ranged keyword does not increase the attack-range stat.
- **CAP-3**
  - **intent:** Every unit has a level stat.
  - **success:** All cards have level 1 and display `LEVEL 1`; changing a card's level value changes only its display until level rules are specified.
- **CAP-4**
  - **intent:** Some units grant an active ability with Lockdown and Cooldown counters, usable like a spell while the unit lives.
  - **success:** While the granting unit is alive on the field, its hand slot shows the ability as a spell-style card. The ability is usable only when Lockdown and Cooldown are both 0, with the ability's own target range, at no mana cost; using it resets Cooldown to its base. Counters decrement by 1 (floor 0) at the end of the owning player's turn; defaults are Lockdown 0, Cooldown 1 unless an ability sets its own. Lockdown and Cooldown are base values per ability: a deployed ability starts with Lockdown at its base and Cooldown 0, and Cooldown takes its base value only after the first use (default 0/1 is ready immediately). Death empties the slot; silence disables the ability and removal of silence re-enables it. Rules in `active-ability-rules.md`.
- **CAP-5**
  - **intent:** The hand slot and card detail view present the new stats and the ability's counters.
  - **success:** Unit cards render movement type/distance, attack type/range, level, and attack/health per the `phobies_unit` layout; an ability card renders a violet padlock ring for nonzero Lockdown (image 1) or a cyan hourglass ring for nonzero Cooldown (image 2) per `phobies_ability`. Detail view of an ability-bearing unit shows the unit and, in the related-card position (where a spell like Phoenix Fire appears for Lantern Fox), the ability card.
- **CAP-6**
  - **intent:** Each unit follows Duelyst's move-then-attack turn sequence, with an active ability using the attack action.
  - **success:** In Practice/Sandbox v2, a unit may move once, and only before it attacks or uses an active ability; it may attack or use one ready ability, but not both. It may also take either action without moving, or do nothing. A summoned unit is exhausted through its summon turn and refreshes at its owner's next turn start. Embedded moves and attacks within an ability consume no additional action. Details in `active-ability-rules.md`.
- **CAP-7**
  - **intent:** Rock Pulverizer has a summon-turn Rush passive instead of its active ability.
  - **success:** In Practice/Sandbox v2, Rock Pulverizer is not exhausted when summoned and can move once, then attack once that turn. It has no active ability; its stats and Lifegain remain unchanged. No other Phobies card receives this passive; original Duelyst cards using `ModifierFirstBlood` are unchanged.

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
- In Practice/Sandbox v2, an active ability is the unit's attack action; Lockdown and Cooldown timing and values do not change.
- Each general's Bloodbound Spell is an active ability with Lockdown 2 and Cooldown 2 and costs no mana, replacing its existing mana-costed use in Practice and Sandbox. It stays in its existing dedicated Bloodbound slot (not a hand slot) and starts counting from match start, since the general is on the field from the beginning.
- Rock Pulverizer's Phobies card data removes active ability effect 51012 (`move_and_strike`) and adds its Rush passive; retire that effect only if no other card references it.
- Ability data (effect, Lockdown, Cooldown, use range) is attached per card through a general structure so later cards can add unique abilities without engine changes.
- Development placeholder: Planar Scout carries Phoenix Fire with Lockdown 1, Cooldown 1.

## Non-goals

- Level mechanics (progression, stat scaling); all cards stay level 1.
- Designing the ability roster or new abilities now; unique abilities arrive with future cards. Only the structure and the Planar Scout placeholder are in scope.
- Rebalancing cards.
- Adding a general action-point system; the Practice/Sandbox v2 rule returns to the move/attack sequence.
- Changing the existing 40-card deck modes' rules beyond what the shared stat model requires.
- New unit art or UI asset redesign.

## Success signal

A Practice match shows the original move-then-attack sequence: after a unit moves it can attack or use an ability, but cannot move again; after an attack or ability it cannot move or use the other attack action. Ordinary summons stay exhausted until their next owner turn; Rock Pulverizer can move and attack on its summon turn. Existing ability counters retain their Lockdown/Cooldown behavior.

## Open Questions

- How should saved snapshots or replays recorded under the two-action-point rule be interpreted after this rules change?
