---
id: SPEC-duelyst-action-model-rush
companions:
  - ../../planning-artifacts/architecture/architecture-action-model-rush-2026-11-03/ARCHITECTURE-SPINE.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Duelyst Action Model and Rush

## Why

A rules mandate for the modded Duelyst game: replace the current Phobies-style rule (2 interchangeable action points per unit per turn; move, attack, and active-ability use cost 1 each; points refresh to 2 at the owner's turn start; a summoned unit starts at 0) with the original Duelyst model of one move and one attack per turn. Rock Pulverizer (Cassowary) loses its active ability and gets a summon-turn Rush instead, which the restored model needs to express.

## Capabilities

- **CAP-1**
  - **intent:** Each unit follows the original Duelyst turn: at most one move, then at most one attack action, where an active ability is the attack action.
  - **success:** Tests show: move only, move then attack, move then ability, attack only, ability only, and no action are legal; attack plus ability in one turn, a second move, and any move after an attack or ability are rejected. Embedded moves/attacks inside an ability consume no slot. A summoned unit is exhausted on its summon turn and ready at its owner's next turn start. Lockdown/Cooldown behavior is unchanged.
- **CAP-2**
  - **intent:** Rock Pulverizer has a Rush passive instead of its active ability.
  - **success:** Rock Pulverizer has no active ability (`move_and_strike` removed from it); on the turn it is summoned it is not exhausted and can move then attack, exactly like a ready unit, and has no other effect. Its stats and Lifegain are unchanged, no other card has Rush, and `move_and_strike` is retired only if no other card uses it.

- **CAP-3**
  - **intent:** A ranged attack cannot reach through an enemy unit to hit something behind it.
  - **success:** In Practice/Sandbox v2, for a ranged attacker, every enemy unit (including a General) between the ends of the attack line obstructs it exactly as a Wall does, using the same line tests; the nearest obstruction decides, so a unit behind an enemy, and a target behind an enemy that stands behind a Wall, is untargetable. An enemy unit standing on the target tile never blocks its own tile, and allied units never block. Lobbed and area attacks are unchanged, and so are active abilities with their own geometry: Behold's straight-line beam still pierces enemies and stops only at Walls. Targeting, previews, AI, and replay use the same shared resolver.
- **CAP-4**
  - **intent:** Fly and phase units can be summoned onto Walls next to their owner's General.
  - **success:** In Practice/Sandbox v2, a unit whose movement type is fly or phase may be summoned onto a Wall on a tile adjacent to its owner's General, from a hand card or from an effect-created summon on any Wall the effect itself is allowed to place a unit on (the effect's own placement constraints still apply; only the Wall exclusion is lifted for these units); the Wall stays as a separate entity at that position. Walk units still cannot be summoned onto Walls, and no other summon rule changes. Legal-position highlighting, validation, and AI use one shared source of valid summon positions.

## Constraints

- The two-action-point contract is retired outright: no action-point count remains as the rule, in state, AI, or UI.
- An ability shares the attack slot; ability use must never be allowed alongside a direct attack in the same turn.
- Generals, including the General Bloodbound ability, follow the same move-then-attack model.
- Only an executed move consumes the move slot; a zero-tile or rejected move does not.
- Rush removes only the default summon exhaustion; other exhaustion sources still apply.
- Lockdown and Cooldown counters, decrement timing, and use conditions stay as they are.
- Only Rock Pulverizer is changed on the card side; other cards' data and descriptions stay untouched.
- Work is split into four stories; Rush depends on the action model, and the ranged-blocking and Wall-summon stories are independent of the others.
- CAP-3 supersedes the map spec's "Units do not block" ranged rule for enemy units only; every other ranged rule (including the Wall beneath the target) stays. CAP-4 supersedes the map spec's note that summoning rules apply separately from movement permissions, for fly and phase units on Walls adjacent to the General only.
- Design follows the companion architecture spine: AD-18 to AD-20 and AD-22 govern CAP-1, AD-21 governs CAP-2.

## Non-goals

- Implementation in this run; this spec produces stories only.
- Compatibility with old snapshots/replays: those recorded under the two-action-point rule are discarded.
- New cards, new abilities, or stat changes.
- Changing lobbed or area attack obstruction.
- Letting walk units, or any unit, be summoned onto holes or onto Walls not adjacent to the General.
- Any other card receiving Rush.
- Action-point display or counters in the UI.

## Success signal

A match plays like original Duelyst: units move then attack or use an ability, never both attack and ability, and summons wait a turn — except Rock Pulverizer, which can move and attack the turn it lands.

## Assumptions

- Obstruction by an enemy unit uses exactly the Wall tests (center of its tile on the line, and the center-to-center link between two hex-adjacent obstructors); a Wall and an enemy unit that are hex-adjacent form such a link (confirmed).
- Behold (a piercing active ability, not a ranged attack) is unaffected by CAP-3: its target selection and beam keep their current Wall-only rules (confirmed).
- "No other card has Rush" is read as the Phobies roster only (confirmed as a working assumption); original Duelyst `ModifierFirstBlood` cards are unchanged.
