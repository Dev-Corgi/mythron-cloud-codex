---
id: SPEC-duelyst-rules-overhaul
companions:
  - rules-detail.md
  - practice-bot-deck.md
  - ../../planning-artifacts/architecture/architecture-duelyst-2026-10-30/ARCHITECTURE-SPINE.md
sources: []
---

# Duelyst Core Rules Overhaul

## Why

Replace Duelyst's square-board combat and escalating, expiring mana economy with a hex battlefield, general-centered summoning, no automatic counterattacks, finite reserve mana, and an eight-card starting hand. Initially, these rules apply to Practice and Sandbox matches.

## Capabilities

- **CAP-1**
  - **intent:** Players can move and attack on a staggered 9-column, 5-row battlefield of 45 pointy-top hex tiles where movement, range, and adjacency use six neighboring directions.
  - **success:** The battlefield contains 45 pointy-top hex tiles with vertically staggered columns; generals start at axial addresses `(-2,4)` and `(2,4)`, the leftmost and rightmost center cells; every legal move, range check, and adjacency result agrees with six-neighbor geometry, without square-grid-only paths or diagonals.
- **CAP-2**
  - **intent:** A player can summon units only onto available tiles adjacent to that player's general.
  - **success:** A summon beside the general is legal when the destination is otherwise valid; a tile adjacent only to another allied unit is illegal.
- **CAP-3**
  - **intent:** Attacks resolve without the Duelyst counterattack rule.
  - **success:** An attacked unit does not automatically attack its attacker in response.
- **CAP-4**
  - **intent:** Each player spends persistent mana funded by a finite 20-point reserve, with an opening transfer and a further transfer when that player ends their own turn.
  - **success:** Opening balances are first player 3 mana/17 reserve and second player 4 mana/16 reserve; at each turn end only the ending player transfers mana according to `rules-detail.md`, unspent mana persists, and mana has no fixed maximum.
- **CAP-5**
  - **intent:** Players create separate Practice and Sandbox decks of one general and eight other cards, then enter matches with all eight cards in fixed hand slots, without draw, replacement, deck-exhaustion fatigue, or other hand-content changes.
  - **success:** A valid Practice or Sandbox deck contains exactly nine cards including its general and no temporarily unavailable cards; the Practice bot uses the predefined list in `practice-bot-deck.md`. Each player starts with the other eight cards occupying eight hand slots. Playing a card empties only its slot; no later action adds, returns, shifts, refills, or otherwise changes cards in hand. Existing 40-card decks remain available to other modes and are not auto-converted.

## Constraints

- Apply the rule changes in this order: board, summoning, counterattack, mana, deck and hand.
- Apply the new rules only in Practice and Sandbox matches during the initial rollout; other modes retain their existing rules.
- All movement, range, and adjacency judgments must use the same six-neighbor hex topology.
- Mana transfers cannot take more than the reserve contains; spendable mana cannot be capped at nine or cleared for being unspent.
- Card use consumes spendable mana.
- Existing cards with effects that conflict with the new rules are temporarily unavailable for play; their old effects do not create exceptions to the new rules.
- Cards or effects that create, add, return, or otherwise change hand contents or slots are unavailable in Practice and Sandbox.
- Practice and Sandbox use separately created nine-card decks; existing 40-card decks remain intact for other modes.

## Non-goals

- Adding new cards, factions, or victory conditions.
- Changing match rules in Ranked, Casual, Friendly, Gauntlet, Challenges, Boss Battle, or Rift during the initial rollout.

## Success signal

A Practice match and a Sandbox match using a one-general, eight-card deck each start with eight fixed hand slots and the specified opening mana balances. Demonstrations confirm that playing cards only empties their slots, general-only hex-adjacent summoning, no automatic counterattack, six-neighbor movement/range/adjacency, and reserve-funded mana that persists across turns until spent. An unaffected mode still uses its existing rules.

