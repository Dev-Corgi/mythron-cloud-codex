---
title: 'Story 10: Route action-point checks through Entity accessors only'
type: 'refactor'
created: '2026-11-02'
status: 'done'
baseline_commit: '9fb12d15'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-duelyst-2026-10-30/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Moves, attacks, abilities, validators, and several modifiers each branch on version 2 action points themselves, so the AP rules are spread over about ten files and version 1 behavior can regress anywhere (spine AD-6).

**Approach:** Add the missing `Entity` accessors and make every external caller use them, so that only `Entity` knows whether a unit uses action points. Behavior in version 1, legacy, and version 2 stays identical.

## Boundaries & Constraints

**Always:** Version 1 and legacy results, ordering, and serialized data are unchanged; accessors reduce to the old logic when action points are not in use (`getActionPoints()` is 0 and `getHasSpentActionPointThisTurn()` is false there). Keep the AP spend before the moves/attacks counter increment, and keep the `!getIsImplicit()` guard so implicit and counter attacks spend nothing. Keep SetExhaustion's order (exhausted, moves, attacks, then points). A version 2 unit is exhausted exactly when it has zero points. Version checks use the AD-1 helper.

**Never:** Change the `ModifierTransformed.createContextObject` signature or its callers (12 sites, serialized), rename the serialized `actionPoints` and `actionPointsSpentThisTurn` fields, change AI code, add action-point UI, or alter version 2 battle-pet handling. Callers that only forward AP values into a transform context stay as they are.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| V2_MOVE_ATTACK | Version 2 unit moves then attacks | One point each; third explicit action invalid | Same rejection as today |
| IMPLICIT_ATTACK | Counterattack or implicit attack | No point spent | N/A |
| FIRST_BLOOD | Version 2 unit with 2 points, none spent this turn | FirstBlood and PseudoRush treat it as not yet acted | After one spend, treated as acted |
| TRANSFORM | Version 2 unit with 1 point transforms or is built | New unit keeps 1 point and the spent flag | N/A |
| ABILITY | Version 2 unit or General at 0 points | Ability and Bloodbound use invalid; at 1 point valid | Same messages |
| V1_LEGACY | Version 1 or legacy unit | Old move, attack, FirstBlood, transform behavior; serialized modifier context unchanged | N/A |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/entities/entity.coffee` -- existing `getUsesActionPoints`, `getActionPoints`, `getHasSpentActionPointThisTurn`, `setActionPoints`, `spendActionPoint`, `getCanMove`, `getCanAttack`, `getIsExhausted`, `refreshExhaustion`; add `getHasActedThisTurn`, `recordMove`, `recordAttack`, `getCanUseActiveAbility`, and an action-point state restore used by SetExhaustion; route `getUsesActionPoints` through `getIsPracticeSandboxV2`.
- `duelyst/app/sdk/actions/moveAction.coffee` (~l.42), `attackAction.coffee` (~l.61), `useActiveAbilityAction.coffee` (~l.20), `playSignatureCardAction.coffee` (~l.25), `setExhaustionAction.coffee` (~l.49) -- external branches to replace.
- `duelyst/app/sdk/validators/validatorEntityAction.coffee` (~l.32), `validatorPlayCard.coffee` (~l.25, 34) -- replace AP reads with accessors.
- `duelyst/app/sdk/modifiers/modifierFirstBlood.coffee` (~l.31), `modifierPseudoRush.coffee` (~l.26), `modifierBuilding.coffee` (~l.80) -- replace the inline AP branch; `modifierTransformed.coffee` keeps its signature.
- `duelyst/app/sdk/gameSession.coffee` -- `p_startTurn` owner-only refresh stays; use the AD-1 helper.
- Leave alone: `modifierSpawnedFromEgg`, `refreshExhaustionAction`, `applyExhaustionAction`, `modifierStunned`, AI.
- Tests: `test/unit/sdk/game/basic.js` (move/attack AP), `unit_stats.js` (AP set/spend/refresh, Transformed round trip), `active_abilities.js`.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/test/unit/sdk/game/action_point_accessors.js` -- characterization tests for the matrix, including FirstBlood and PseudoRush in version 2, building/transform AP carry-over, ability at 0 and 1 points, and a v1 equality check of accessors and serialized modifier context -- written first, green on current code.
- [x] `duelyst/app/sdk/entities/entity.coffee` -- add the accessors -- single owner of AP rules.
- [x] `duelyst/app/sdk/actions/*`, `duelyst/app/sdk/validators/*`, `duelyst/app/sdk/modifiers/*` -- replace external AP branches with accessor calls -- no AP knowledge outside Entity.

**Acceptance Criteria:**
- Given `app/sdk` outside `entities/entity.coffee`, when searched for `getUsesActionPoints` and `spendActionPoint`, then no caller outside Entity remains except forwarding of values into a transform context.
- Given the existing and new tests, when run, then they all pass and the characterization tests also pass against the pre-refactor code.
- Given a version 1 transform, when its modifier context is serialized before and after, then it is identical.

## Implementation Notes

- New `Entity` accessors: `getHasActedThisTurn`, `recordMove`, `recordAttack`, `getCanUseActiveAbility`, `recordActiveAbilityUse`, `getIsOutOfActionPoints`, `restoreActionPointState`, `getBuildingTransformState`, and `getIsPracticeSandboxV2` (delegates to the AD-1 helper; `getUsesActionPoints` goes through it). Moves, attacks, abilities, SetExhaustion, both validators, FirstBlood, PseudoRush, and Building now call them; no caller outside `entity.coffee` uses `getUsesActionPoints` or `spendActionPoint`.
- `ModifierTransformed.createContextObject`, its 12 callers, and the serialized field names are unchanged. About ten of those callers still pass `getActionPoints()` and the spent flag straight into the context; that is value forwarding, not AP branching, and stays as the spec requires.
- `getBuildingTransformState` returns undefined AP fields in version 1, so the serialized transform context there equals the old three-argument form; a test builds a real building transform and compares.
- All 14 original characterization tests pass on the pre-refactor code. The review added four edge-case tests; mutating `getIsOutOfActionPoints` to always return false now fails two of them.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence |
|---|---|---|
| `getIsOutOfActionPoints` branch in the validator shadowed by `getCanAttack` in the only test | medium | Confirmed: no test failed when the accessor was broken. Added direct and automatic-attack tests; mutation now fails two. |
| New accessors lack direct tests (`restoreActionPointState`, `getHasActedThisTurn` v1, `recordActiveAbilityUse` at 0) | medium | Real gap; covered by the new edge-case tests. |
| v1 building-transform test never calls production code | false | The test applies `ModifierBuilding`, calls `transformSelf`, and compares with the old three-argument context. |
| Dropped `?.` guards on moveAction, attackAction, FirstBlood, PseudoRush, Building | false | The old code read `getMovesMade()` or `setMovesMade()` directly on the same objects, so non-Entity cards already failed there. |
| Counters still increment when no point can be spent | false | Identical to the old code. |
| `getBuildingTransformState` leaks modifier argument order into Entity | low | Deliberate and tested; changing the signature is out of scope. |
| Redundant accessors (`recordActiveAbilityUse` alias, double ability check) | low | Harmless and intentional naming; no divergence found. |
| Other transform callers pass 0/false in version 1 while the building helper passes undefined | low | Both serialize the same; the other callers are out of scope for this story. |
| Entity duplicates the version check; `p_startTurn` not changed | false | `getIsPracticeSandboxV2` delegates to the session helper; `p_startTurn` already used the helper. |
| FirstBlood tests override session methods without restoring | low | Session is reset after each test; no leak. |

## Verification

**Commands:**
- `cd duelyst && npx mocha -t 1000 test/unit/sdk/game/action_point_accessors.js test/unit/sdk/game/basic.js test/unit/sdk/game/unit_stats.js test/unit/sdk/game/active_abilities.js test/unit/sdk/game/board.js` -- expected: all passing
- `cd duelyst && grep -rn "getUsesActionPoints\|spendActionPoint" app/sdk --include=*.coffee` -- expected: only `entities/entity.coffee` and transform-context forwarding
