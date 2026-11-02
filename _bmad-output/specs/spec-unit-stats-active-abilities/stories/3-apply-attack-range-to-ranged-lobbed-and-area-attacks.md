---
title: 'Story 3: Apply attack range to ranged, lobbed, and area attacks'
type: 'feature'
created: '2026-11-02'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '948f0cbd0348de125288b105030ac73260394fb8'
context:
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/map-layout.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Practice and Sandbox version 2 expose attack stats, but stat-driven attack types do not consistently determine which tiles can be attacked or how area damage is delivered.

**Approach:** Apply the explicit attack type and range to v2 attack targeting and resolution: ranged attacks use six-axis lines, lobbed attacks ignore intervening units and Walls, and area attacks damage eligible enemies in a radius centered on the attacker. Preserve the map contract for Wall obstruction and target priority.

## Boundaries & Constraints

**Always:** Restrict new stat-driven behavior to `practice-sandbox-hex` version 2. Ranged targets must be within `getReach()`, on one of six hex axes, with no intervening Wall whose hex interior the segment enters. Lobbed attacks may target any tile within `getReach()`, including adjacent tiles, and ignore intervening units and Walls. For either direct attack, keep canonical target resolution: enemy unit first; otherwise an attackable neutral Wall, including under an allied unit. Area attack activation targets an eligible enemy unit or neutral Wall within the attacker's range; resolve the one attack action against each active, targetable enemy unit and neutral Wall whose tile is within that same radius from the attacker, excluding allies. Each area victim independently follows direct-segment Wall obstruction from attacker to victim; a Wall under the victim does not obstruct it, and other intervening Walls do. Preserve ordinary attack damage/action accounting and existing mode/version behavior.

**Never:** Change legacy/v1 behavior, add a separate area radius, let area attacks damage allied units, propagate area delivery around Walls, or alter existing Blast modifier collateral semantics for non-stat-driven attacks.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| RANGED_AXIS | V2 ranged unit, target on axis at range | Target is legal; target beyond range is illegal | Invalid target is rejected |
| RANGED_OFF_AXIS | V2 ranged unit, enemy within range off-axis | Target is not offered or accepted | Invalid target is rejected |
| LOBBED_BLOCKERS | V2 lobbed unit, target within range behind unit or Wall | Target is legal regardless of intervening blockers | Out-of-range/empty/ineligible target is rejected |
| AREA_RADIUS | V2 area unit attacks; enemies/Walls at various distances and lines | In-radius unobstructed enemies/Walls take attack damage; out-of-radius or Wall-obstructed entities do not; allies are excluded | Invalid initiating target is rejected |
| AREA_WALL_OCCUPANT | Area victim stands on Wall, with no other blocker | Enemy unit and Wall are independently affected if otherwise eligible; allied unit is excluded while Wall can be affected | No supporting-Wall shield |
| LEGACY_PRESERVATION | Same attack types in v1 or another ruleset | Existing attack targeting/resolution is unchanged | Existing validation remains |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/entities/attackRange.coffee` -- v2 position/target enumeration and validation; select behavior from `getAttackType()` and share legality logic between previews and validators. Preserve legacy branch.
- `duelyst/app/sdk/entities/entity.coffee` -- attack type/range stats and `actionAttackEntityAtPosition`; action construction and canonical position targeting.
- `duelyst/app/sdk/actions/attackAction.coffee` and `duelyst/app/sdk/modifiers/modifierBlastAttack.coffee` -- attack damage/accounting and existing event integration. Area collateral must avoid changing Blast's legacy line behavior.
- `duelyst/app/sdk/rulesets/hexTopology.coffee` -- `getDistance`, `segmentEntersHexInterior`, and `isOnHexAxis` encode the authoritative geometry.
- `duelyst/app/sdk/validators/validatorEntityAction.coffee` -- canonical target and range checks; keep aligned with `AttackRange`.
- `duelyst/test/unit/sdk/game/board.js` -- v2 range, Wall, and target-priority scenarios; add focused behavior coverage.
- `duelyst/test/unit/sdk/game/unit_stats.js` -- explicit stat defaults/types including `lobbed`; preserve existing coverage.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/entities/attackRange.coffee` -- enforce attack-type-specific v2 legal tiles and canonical targets, including ranged axes/range and lobbed blocker bypass; existing validator consumes this shared legality path.
- [x] `duelyst/app/sdk/actions/attackAction.coffee` -- resolve explicit stat-driven area attacks as one action affecting eligible radius victims, preserving ordinary attack accounting and existing Blast behavior.
- [x] `duelyst/test/unit/sdk/game/board.js`, `duelyst/test/unit/sdk/game/unit_stats.js` -- cover ranged range/axis, lobbed blockers, area radius/Wall rules/allied exclusion, Blast regression, and v1 preservation.

**Acceptance Criteria:**
- Given a v2 ranged unit, when an enemy is on a six-axis tile no farther than its attack range, then it is a valid target unless an intervening Wall blocks the segment.
- Given a v2 lobbed unit, when an eligible target tile is within attack range, then intervening units and Walls do not block it, including for adjacent targets.
- Given a v2 area unit attacks an eligible target within range, when the action resolves, then all eligible enemy units and neutral Walls within the attacker's hex-distance radius are independently hit, allies are excluded, and intervening Walls block only victims whose direct segment enters the Wall interior.
- Given an enemy unit shares a Wall tile, when an area attack reaches it, then the unit and Wall remain distinct and both may be damaged; the Wall beneath the unit does not shield it.
- Given any affected attack in v1 or outside the Practice/Sandbox ruleset, when legality and resolution run, then previous behavior remains unchanged.

## Implementation Notes

Version 2 attack geometry now keys ranged behavior from the explicit attack type and applies the reach limit; lobbed targeting skips ranged-axis and Wall checks. Explicit stat-driven area attacks validate through the common attack-range path, then execute per-victim attack actions within the attacker's reach when direct Wall delivery is legal. The original action is counted once, only opposing-player Units are hit, and co-located Walls and enemy Units remain independent victims. Inferred area from the legacy Blast modifier does not enter this path, preserving Blast collateral behavior.

## Verification

**Commands:**
- `cd duelyst && ./node_modules/.bin/mocha -t 1000 test/unit/sdk/game/board.js test/unit/sdk/game/unit_stats.js` -- 80 passing after review fixes.

## Review Triage Log

- false — Review claimed each area victim sub-action increments attack count; child actions have a parent action, so `getIsImplicit()` is true and only the explicit parent increments it; the area test asserts a single count.
- false — Review claimed victim sub-actions are explicit attacks; `setParentAction()` makes them implicit, while per-victim damage hooks receive the target-specific action needed for each hit.
- false — Review claimed clearing the selected target hides it from target-dependent event handlers; action validation and pre-execution modifier events run before `_execute()`, and the target is restored immediately after base damage processing.
- false — Review claimed area activation can fail behind a Wall due to LOS; `Entity.getAttackNeedsLOS()` is always false and has no overrides, so this guard is inactive for reachable units.
- false — Review claimed lobbed targeting can be blocked by LOS; the same always-false base method has no overrides, so no reachable lobbed unit enters that branch.
- false — Review claimed ranged attacks can be blocked by non-Wall obstructions through LOS; the LOS guard is unreachable because no entity overrides the always-false method, while Wall geometry is checked separately.
- low — Review noted the missing area activation-by-Wall test; added a test proving a neutral Wall is a valid initiator and both it and in-radius enemies are hit.
- false — Review claimed allied-unit-on-Wall canonical priority lacked coverage; the existing v2 target-priority test verifies the allied occupant is skipped and the Wall is selected.
- low — Review noted missing area integration coverage for boundary-only Wall contact; added a test proving a Wall touched only at its boundary does not block delivery.
- false — Review claimed the stat test was not run; the specified combined command ran `unit_stats.js` and `board.js`, with 80 passing after review additions.
- medium — Review found neutral Units could be treated as enemies; area victim selection now requires the opposing player's owner ID and has a neutral-Unit exclusion assertion.
