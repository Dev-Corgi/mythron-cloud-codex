---
title: 'Story 11: Resolve ranged, lobbed, and area geometry in one shared resolver'
type: 'refactor'
created: '2026-11-02'
status: 'done'
baseline_commit: 'c83a74afdd5212fb27c66e133d72f533b46636de'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/map-layout.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-duelyst-2026-10-30/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Wall obstruction for ranged lines and area delivery is implemented three times (`attackRange`, `spell`, `AttackAction`) with slightly different position-equality helpers, which violates spine AD-8 and lets spells and area-attack units drift apart.

**Approach:** Add one pure SDK resolver for version 2 wall-blocked segments, delivery by attack type, and area victims, and make `attackRange`, `spell`, and `AttackAction` call it. Gameplay, ordering, and replays stay identical.

## Boundaries & Constraints

**Always:** Version 2 only (`getIsPracticeSandboxV2`). Keep area victim iteration in `board.getEntities()` order. Keep the area loop after the base attack and before the action point is spent. Lobbed stays unrestricted by Walls and limited by reach only. `getValidTargets` in version 2 keeps returning only enemy Units or Walls from `getTargetAtPosition`. Spell positions stay computed in `onApplyToBoard` under authoritative execution. Write characterization tests before moving code.

**Never:** Change legacy, version 1, or non-v2 `practice-sandbox-hex` branches or the legacy atlas path. Route `ModifierBlastAttack` through the resolver, loosen the strict `attackType` own-property area gate, or touch `modifierMyAttackWatchScarabBlast`. Add a cache that can go stale when a Wall dies. Put geometry back in `AttackAction`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| RANGED_BLOCKED | Ranged attacker, active Wall strictly between on a hex axis | Target invalid | Unchanged rejection |
| RANGED_ENDPOINT_WALL | Wall on the origin or target cell only | Not blocking; attack legal | N/A |
| LOBBED | Lobbed attacker, Walls and Units between | Any in-reach target legal | N/A |
| AREA_PER_VICTIM | Area attacker, Wall between origin and one victim | Only unblocked enemy Units and Walls take damage; allies excluded | N/A |
| BOUNDARY_CONTACT | Wall touching the segment only at a hex boundary or vertex | Not blocking | N/A |
| SPELL_AREA | Spell with radius over the same geometry | Same candidate set as the equivalent area attack | N/A |
| SHARED_CELL | Enemy Unit on an enemy Wall | Unit has target priority | `validatorEntityAction` rejects the Wall |
| NON_V2 | Legacy, v1, or Blast unit | Behavior byte-identical to today | N/A |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/rulesets/hexTopology.coffee` -- `segmentEntersHexInterior` (~l.125), `isOnHexAxis` (~l.155), `getLine`, `getDistance`; reuse, do not change.
- `duelyst/app/sdk/entities/attackRange.coffee` -- `getTargetAtPosition` (l.123), `_isLegalV2RangedLine` (l.150), `_hasHexLineOfSight` (l.134, legacy, keep), `_isV2RangedAttack`; v2 branches of `getValidPositions`, `getValidPosition`, `getValidTargets`, `getIsValidTarget`.
- `duelyst/app/sdk/spells/spell.coffee` -- `_findApplyEffectPositions` v2 filter (~l.163-170) with an inline Wall list.
- `duelyst/app/sdk/actions/attackAction.coffee` -- `_execute` area loop (l.38-67), `_isVersion2StatDrivenAreaAttack`, `_isEligibleAreaVictim`, `_hasAreaDelivery` (l.84, a copy of the spell filter).
- `duelyst/app/sdk/board.coffee` -- `getObstructionAtPositionForEntity` (~l.368), `positionsEqual`; `duelyst/app/sdk/modifiers/modifierBlastAttack.coffee` -- legacy, leave alone.
- Tests: `duelyst/test/unit/sdk/game/board.js` (v2 ranged, lobbed, area, Blast, Maw, Dying Wish cases), `duelyst/test/unit/sdk/ai/board_geometry.js`.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/test/unit/sdk/game/hex_attack_geometry.js` -- characterization tests for the matrix, including ranged vs Wall on origin or target cell, `getValidTargets` and `getIsValidTarget` agreement, validator rejection of a Wall under an enemy Unit, lobbed over an allied-covered enemy Wall, and spell filter equals attack filter -- written first and green on current code.
- [x] `duelyst/app/sdk/rulesets/hexAttackGeometry.coffee` -- new pure resolver: `isSegmentBlockedByWall`, `canDeliver`, `getAreaVictims`, `filterAreaPositions`, `getTargetAtPosition` -- single owner of v2 geometry.
- [x] `duelyst/app/sdk/entities/attackRange.coffee`, `duelyst/app/sdk/spells/spell.coffee`, `duelyst/app/sdk/actions/attackAction.coffee` -- replace inline copies with resolver calls; one position-equality rule -- removes duplication.

**Acceptance Criteria:**
- Given the existing v2 geometry tests in `board.js` and `board_geometry.js`, when run after the refactor, then all pass unchanged.
- Given `attackRange.coffee`, `spell.coffee`, and `attackAction.coffee`, when searched, then none contains `segmentEntersHexInterior` or an inline Wall list.
- Given a replay or snapshot from before the change, when restored, then actions and results are identical.

## Implementation Notes

- New `app/sdk/rulesets/hexAttackGeometry.coffee` exports `isSegmentBlockedByWall`, `canDeliver`, `getTargetAtPosition`, `isAreaVictim`, `filterAreaPositions`. `getAreaVictims` from the plan was dropped: `AttackAction` evaluates `isAreaVictim` per victim, so a precomputed list had no caller.
- `attackRange`, `spell`, and `attackAction` now call the resolver; their inline Wall loops, `_isLegalV2RangedLine`, `_isV2RangedAttack`, `_isEligibleAreaVictim`, and `_hasAreaDelivery` are gone, and `attackRange` lost its unused `Cards`/`CardType` imports.
- Surprise: area damage applies immediately but deaths resolve after the loop, so a Wall destroyed by the same attack still shields victims behind it. This is existing behavior, pinned by `AREA_RESOLUTION_ORDER`; the first draft comment claimed the opposite and was corrected.
- Review follow-ups applied: `filterAreaPositions` reuses `isSegmentBlockedByWall`, the area radius is read per victim as before, and tests were added for ranged-through-units, a removed Wall, version 1 ranged, and absolute spell candidates.
- All 16 tests in `hex_attack_geometry.js` also pass against the pre-refactor callers. `test/unit/misc/hex_view.js` has one timeout failure under `-t 1000` that predates this change.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence |
|---|---|---|
| `getAreaVictims` has no caller or test | low | Confirmed by grep; removed. |
| `filterAreaPositions` duplicates the blocking rule | medium | Confirmed by reading; now delegates to `isSegmentBlockedByWall`. |
| No test for a Wall dying mid-resolution | medium | Real gap; the test showed deaths resolve after the loop, so the test pins that order instead. |
| `radius` read once before the loop | low | Direct correction; `attacker.getReach()` is read per victim again. |
| Unused `Cards`/`CardType` in `attackRange` | low | Confirmed by grep; removed. |
| Double-negative guard in `attackRange` | low | Rewritten as `continue if v2 and !canDeliver`. |
| `SPELL_AREA` no-op line and weak assertion | low | No-op removed; absolute candidate assertions added. |
| Ranged through Units, removed Wall, v1 ranged untested | medium | Tests added and green on old and new callers. |
| `canDeliver` unrestricted for non-ranged types | false | Documented intent; lobbed, melee, and area target selection were never Wall-restricted. |
| nil guards in `canDeliver`, `isAreaVictim`, identical endpoints | false | Callers always pass live entities and exclude origin==target; no reachable failure. |
| `positionsEqual` ruleset-id dependence | false | The resolver is only called inside the v2 gate where the id is `practice-sandbox-hex`. |
| Initiator behind a Wall hit once, twice or not at all | false | Not changed by this diff; existing board.js tests cover it. |
| Tests may encode post-refactor behavior | false | Ran all 16 against the reverted callers: passing. |

## Verification

**Commands:**
- `cd duelyst && npx mocha -t 1000 test/unit/sdk/game/board.js test/unit/sdk/game/hex_attack_geometry.js test/unit/sdk/ai/board_geometry.js test/unit/sdk/game/unit_stats.js test/unit/sdk/game/basic.js` -- expected: all passing
- `cd duelyst && grep -rn "segmentEntersHexInterior" app/sdk` -- expected: only `hexTopology.coffee` and the new resolver
