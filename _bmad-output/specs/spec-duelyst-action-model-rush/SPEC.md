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

## Constraints

- The two-action-point contract is retired outright: no action-point count remains as the rule, in state, AI, or UI.
- An ability shares the attack slot; ability use must never be allowed alongside a direct attack in the same turn.
- Generals, including the General Bloodbound ability, follow the same move-then-attack model.
- Only an executed move consumes the move slot; a zero-tile or rejected move does not.
- Rush removes only the default summon exhaustion; other exhaustion sources still apply.
- Lockdown and Cooldown counters, decrement timing, and use conditions stay as they are.
- Only Rock Pulverizer is changed on the card side; other cards' data and descriptions stay untouched.
- Work is split into two stories; Rush depends on the action model.
- Design follows the companion architecture spine: AD-18 to AD-20 and AD-22 govern CAP-1, AD-21 governs CAP-2.

## Non-goals

- Implementation in this run; this spec produces stories only.
- Compatibility with old snapshots/replays: those recorded under the two-action-point rule are discarded.
- New cards, new abilities, or stat changes.
- Any other card receiving Rush.
- Action-point display or counters in the UI.

## Success signal

A match plays like original Duelyst: units move then attack or use an ability, never both attack and ability, and summons wait a turn — except Rock Pulverizer, which can move and attack the turn it lands.

## Assumptions

- "No other card has Rush" is read as the Phobies roster only (confirmed as a working assumption); original Duelyst `ModifierFirstBlood` cards are unchanged.

