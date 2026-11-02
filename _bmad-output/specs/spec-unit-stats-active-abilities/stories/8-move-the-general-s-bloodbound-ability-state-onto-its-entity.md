---
title: 'Story 8: Move the General''s Bloodbound ability state onto its entity'
type: 'refactor'
created: '2026-11-02'
status: 'done'
baseline_commit: '60164cba4ccd011049a5b6a348ed68ab485ffed9'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-duelyst-2026-10-30/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The General's Bloodbound counters live in `Player.signatureAbilityState`, a second state machine beside `Entity.activeAbilityState`, which violates spine AD-7 and duplicates counter, serialization, and initialization logic.

**Approach:** In version 2, store the General's Lockdown/Cooldown on the General entity using the existing active-ability state, and remove the player-level state and its helpers. `PlaySignatureCardAction`, the AI, the Bloodbound slot UI, and network events keep working unchanged and now read the General's state (Story 14 unifies the action type).

## Boundaries & Constraints

**Always:** Version 2 only (`getIsPracticeSandboxV2`). Each General gets an `activeAbility` definition (Lockdown 2, Cooldown 2) and an `activeAbilityState` by explicit initialization when it is placed and when the version 2 ruleset is assigned or a session is restored; initialization never overwrites existing state and never runs inside a getter. Counters decrement only in `p_endTurn` through the entity loop already there. Cooldown resets through the entity method. `getIsSignatureCardActive` and the validator read the General's state. Snapshots that still carry `players[].signatureAbilityState` restore those counters onto the General. Serialization stays deterministic.

**Never:** Change the action type, `actionPlaySignatureCard`, AI calls, `SignatureCardNode`, `Player.js` events, or network payloads. Touch legacy or version 1 behavior (no ability state, no `activeAbility` on Generals). Add silence handling (Story 9). Leave `Player.signatureAbilityState` or its helpers in place.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| V2_SETUP | New version 2 match | Each General has state `{lockdown 2, cooldown 0, base 2/2}` | N/A |
| RULESET_AFTER_SETUP | `setRuleset(v2)` after generals exist | Generals get state exactly once | Second call does not reset |
| END_TURN | Owner ends turn | Owner's General counters decrease; opponent's do not | Floors at 0 |
| USE | Bloodbound used at 0/0 | Cooldown becomes 2 on the General, one action point spent, no mana | Invalid when counters are above 0 |
| SNAPSHOT | Serialize then restore | General state identical | N/A |
| OLD_V2_SNAPSHOT | Snapshot with `players[].signatureAbilityState` | Counters land on the General; field dropped | Missing General leaves no state |
| REAPPLY | General applied to the board again | State preserved | N/A |
| NON_V2 | Legacy or version 1 | No ability state; signature play unchanged | N/A |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/player.coffee` -- remove `signatureAbilityState`, `SIGNATURE_ABILITY_*`, `initializeSignatureAbilityState`, `getSignatureAbilityState`, `decrementSignatureAbilityCounters`, `startSignatureAbilityCooldown`; `getIsSignatureCardActive` (v2 branch) and `getSignatureCardData` (injects `activeAbility`, forces `manaCost` 0) read the General.
- `duelyst/app/sdk/entities/entity.coffee` -- `initializeActiveAbility` (overwrites state today), `getActiveAbilityState`, `decrementActiveAbilityCounters`, `startActiveAbilityCooldown`, `clearActiveAbility`.
- `duelyst/app/sdk/entities/unit.coffee` -- `onApplyToBoard` calls `initializeActiveAbility` with no hand slot for a General.
- `duelyst/app/sdk/gameSetup.coffee` -- `addGeneral` places the General with `applyCardToBoard` and no source action.
- `duelyst/app/sdk/gameSession.coffee` -- `setRuleset` initializer loop, `p_endTurn` (entity loop plus the player decrement to remove), deserialize hook after `player.deserialize`.
- `duelyst/app/sdk/actions/playSignatureCardAction.coffee`, `duelyst/app/sdk/validators/validatorPlayCard.coffee` (l.20-28) -- read and reset through the General.
- `duelyst/test/unit/sdk/game/active_abilities.js` (signature test at the end) and `duelyst/test/unit/sdk/game/ruleset_gate.js` (signature cases) -- assert Player API and `playerData.signatureAbilityState`; rewrite against the General.
- Leave alone: AI (`server/ai`), `server/single_player.coffee`, `app/view/Player.js`, `SignatureCardNode`, legacy signature tests.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/test/unit/sdk/game/active_abilities.js`, `duelyst/test/unit/sdk/game/ruleset_gate.js` -- rewrite the signature cases against the General's state and add matrix cases (RULESET_AFTER_SETUP, REAPPLY, OLD_V2_SNAPSHOT, NON_V2) -- pins the new model.
- [x] `duelyst/app/sdk/entities/entity.coffee`, `duelyst/app/sdk/entities/unit.coffee`, `duelyst/app/sdk/gameSetup.coffee`, `duelyst/app/sdk/gameSession.coffee` -- General definition, non-overwriting initialization, restore shim, turn-end decrement only via the entity -- single state owner.
- [x] `duelyst/app/sdk/player.coffee`, `duelyst/app/sdk/actions/playSignatureCardAction.coffee`, `duelyst/app/sdk/validators/validatorPlayCard.coffee` -- remove player state and read the General -- no parallel state machine.

**Acceptance Criteria:**
- Given the repository, when `signatureAbilityState` is searched in `app/` and `test/`, then only the old-snapshot restore shim and its test mention it.
- Given a version 2 match played through Bloodbound use and turn ends, when compared with the previous counters, then lockdown, cooldown, action points, and mana are identical.
- Given the legacy signature tests (`bloodborn_spells.js` and others), when run, then they pass unchanged.

## Implementation Notes

- Each version 2 General gets `activeAbility {lockdown 2, cooldown 2}` and `activeAbilityState` from `Entity.initializeActiveAbility`, called from `Unit.onApplyToBoard`, `GameSetup.addGeneral`, `GameSession.setRuleset`, and the deserialize path. The definition lives in `Entity.getGeneralActiveAbilityDefinition`, which `Player.getSignatureCardData` also uses as a default so uninitialized Generals still report 2/2.
- The non-overwriting guard applies to Generals only. The first implementation applied it to every entity, which would let a cloned unit keep its source's `handSlotIndex`; a regression test pins fresh state for non-General units.
- `clearActiveAbility` is a no-op for Generals so a board remove and re-apply keeps the counters. `unit.coffee` needed no change.
- Old snapshots: `players[].signatureAbilityState` is read after `player.deserialize`, removed from the player, and copied onto the General only when the General has no state of its own.
- `UseActiveAbilityAction` already rejects a General source (no `effectCardId`); a test pins it for Story 14.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence |
|---|---|---|
| Non-overwrite guard applied to all entities | high | Found while verifying the diff, before review: a copied unit keeps a stale `handSlotIndex`. Restricted to Generals; regression test fails on the broad guard. |
| Precedence flip and lost 2/2 default in `getSignatureCardData` | medium | Default lost when the General is not initialized yet. Restored through `getGeneralActiveAbilityDefinition`; test added. |
| `getActiveAbilityForHandSlot(undefined)` could match a General | low | No caller passes undefined; one-line guard added. |
| General usable as source of `UseActiveAbilityAction` | false | Probe test shows the action is invalid, action points and counters unchanged; test kept as a guard for Story 14. |
| Counters frozen while the General is off the board | false | A General leaving the board ends the match, so the case is unreachable; deferred to Story 14 if that changes. |
| Legacy restore only tested for player 1; both states present | low | Test added for player 2 and for the General's own state winning. |
| Legacy restore lacks base fields, or players shorter than expected | false | Old snapshots always carried the full state shape; `Player.deserialize` copies unknown fields, shown by the restore test. |
| Definition hardcoded in `Entity` | low | Moved behind one `getGeneralActiveAbilityDefinition` method. |
| State persists after the ruleset leaves version 2 | false | The ruleset is set once per session in production; only tests switch it. |
| Redundant initialization entry points | false | All no-ops after the first thanks to the guard; the spec asks for explicit initialization at placement and restore. |
| Stale cached General during deserialize | false | The cache is flushed before the restore-time initialization. |

## Verification

**Commands:**
- `cd duelyst && npx mocha -t 1000 test/unit/sdk/game/active_abilities.js test/unit/sdk/game/ruleset_gate.js test/unit/sdk/game/game_active.js test/unit/sdk/game/basic.js test/unit/sdk/game/unit_stats.js test/unit/sdk/cards/misc/bloodborn_spells.js` -- expected: all passing
- `cd duelyst && grep -rn "signatureAbilityState" app test` -- expected: only the restore shim and its test
