---
title: 'Story 17: Ranged attacks use center-line geometry with linked-Wall barriers and follow the range stat'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: '2783d4de'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/map-layout.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-duelyst-2026-10-30/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/stories/11-resolve-ranged-lobbed-and-area-geometry-in-one-shared-resolver.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** In Practice/Sandbox v2 a ranged attack can only hit targets on the six hex axes, so a ranged unit cannot attack diagonally, and a unit with the Ranged keyword reports an attack range of 14 (`CONFIG.REACH_RANGED`) instead of its attack range stat, the same defect Flying and Phasing had with movement distance.

**Approach:** Replace the six-axis rule for ranged attacks (only) with the Phobies rule: a ranged unit can attack any tile within its attack range stat in hex distance, unless the straight line from its center to the target's center is blocked by Walls. Make the attack range stat the only range for every v2 unit, with the Ranged keyword granting no range.

## Rule (agreed with the human)

A tile is a legal ranged target when all of these hold:

1. Its hex distance from the attacker is at least 1 and at most the attacker's attack range stat.
2. The straight segment from the attacker's tile center to the target's tile center is not blocked by Walls.

The segment is blocked when either:

- **Center block:** it passes through the center of any Wall tile strictly between the two ends.
- **Linked-Wall block:** it crosses the line joining the centers of two Walls that are hex-adjacent to each other. Walls linked this way act as one barrier.

Everything else does not block: a segment that merely clips a Wall's corner or edge, a Wall on the attacker's tile or the target's tile (the target-supporting Wall exception), and Units. A Wall can itself be a target (the segment ends at its center) and is a legal target whenever the segment to it is not blocked. Walls with 0 health that are still on the board keep blocking until removed, as today. A segment that runs along an edge shared by two Walls is blocked by the linked-Wall rule, and one flanked by a single Wall is not blocked.

Use a Cartesian embedding of the hex centers to evaluate this (center of axial `{q, r}` at `x = sqrt(3) * (q + r / 2)`, `y = 1.5 * r`, or the equivalent) and a small tolerance, because center-line and link-midpoint cases are exact ties.

## Boundaries & Constraints

**Always:** Version 2 only (`getIsPracticeSandboxV2`). Only direct ranged attacks change. Keep `canDeliver` the single owner of ranged delivery (spine AD-8), keep one shared function for both target selection and validation so highlights, `getIsValidTarget`, `validatorEntityAction`, and the AI agree, and keep every query stateless so a removed Wall stops blocking immediately. The attack range stat is `getAttackRangeValue`; in version 2 it must equal the stored `reach` stat for every unit regardless of keywords, and `getReach` must not exceed it.

**Never:** Change lobbed, melee, area attack, `ModifierBlastAttack`, spell area geometry, `isSegmentBlockedByWall`'s existing area rules, legacy, or version 1 behavior (including the version 1 ranged behavior and the whole-map ranged keyword in legacy). Add a cache. Make Units block. Remove `HexTopology.isOnHexAxis` if anything else uses it (Beauty's Behold straight beam and any active ability may).

## Test fixtures (grid notation)

Rows are shown as on the board: each row is staggered, odd rows indented by half a tile. Convert a fixture cell (column `c` in its row `r`) to axial with `q = c - floor(r / 2)`, `r = r` before translating the attacker to the chosen board position, and use tiles that exist on the v2 board. Legend: `A` attacker, `#` legal target, `W` Wall that is a legal target, `w` Wall that is not, `x` or `!` in range but blocked (`x` center block, `!` linked-Wall block; both just mean illegal), `.` out of range. Walls are listed where they appear as `W` or `w`.

Range 2, five columns wide:

```
. # # x . 
 # # W # 
x W A # # 
 ! W W # 
. x ! x . 
```

Range 3, one Wall left of the attacker (diagonal-side tiles stay legal):

```
. . # # # # # . . 
 . # # # # # # . 
. x x W A # # # . 
 . # # # # # # . 
. . # # # # # . . 
```

Range 3, two unlinked Walls to the right:

```
. . # # # # # . . 
 . # # # # W # . 
. # # # A # # # . 
 . # # # # W # . 
. . # # # # # . . 
```

Range 4, scattered Walls (left-below tiles blocked by the linked pair):

```
. # # # # # # x . 
 # # # # # W ! ! 
x x x W A # W x x 
 ! ! ! W W # # # 
. ! ! x ! x # # . 
```

Range 4, a linked diagonal Wall chain, then the same chain with a gap:

```
. # # x ! x ! x . 
 # # # W W W W # 
# # # # A # # # # 
 # # # # # # # # 
. # # # # # # # . 
```

```
. # # x ! x # # . 
 # # # W W # W W 
# # # # A # # # # 
 # # # # # # # # 
. # # # # # # # . 
```

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| OPEN_DIAGONAL | Range 2, no Walls, target not on an axis | Legal | N/A |
| OUT_OF_RANGE | Distance above the range stat | Illegal | Unchanged rejection |
| CENTER_BLOCK | A Wall center lies on the segment | Illegal | N/A |
| CLIPPED_CORNER | Segment only grazes a Wall corner or edge, one side open | Legal | N/A |
| LINKED_BARRIER | Segment crosses the link between two adjacent Walls | Illegal | N/A |
| UNLINKED_PAIR | Two non-adjacent Walls flank a clear segment | Legal | N/A |
| WALL_TARGET | Wall is the target, segment to its center is clear | Legal | N/A |
| SUPPORTING_WALL | Target Unit stands on a Wall | Wall does not block | N/A |
| UNITS_DO_NOT_BLOCK | Units on the segment | Legal | N/A |
| KEYWORD_NO_RANGE | Unit with the Ranged keyword and stat range 2 | `getAttackRangeValue` is 2, `getReach` is 2, in range 2 only | N/A |
| NON_V2 | Legacy, v1, lobbed, area, Blast, spell | Unchanged | N/A |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/rulesets/hexAttackGeometry.coffee` -- `canDeliver` (ranged branch uses `isOnHexAxis` and `isSegmentBlockedByWall`): replace only the ranged branch with the new rule; keep `isSegmentBlockedByWall` for area and spell filtering.
- `duelyst/app/sdk/rulesets/hexTopology.coffee` -- `isOnHexAxis`, `segmentEntersHexInterior`, `getDistance`; add the Cartesian helper and segment tests here or in the resolver.
- `duelyst/app/sdk/entities/attackRange.coffee` -- v2 branches in `getValidPositions` (l.26-28, 46-47) already call `canDeliver`; verify the range loop uses the stat and that `getTargetAtPosition` and target validation use the same function.
- `duelyst/app/sdk/entities/entity.coffee` -- `getReach`, `getAttackRangeValue`, `isRanged`, `getAttackType`; `duelyst/app/sdk/modifiers/modifierRanged.coffee` (`attributeBuffs reach: REACH_RANGED - REACH_MELEE`) and `modifierBandedRanged.coffee`: in v2 the keyword must not change reach (follow `ModifierFlying`'s v2 constructor pattern from commit 2783d4de), and `isRanged` / `getAttackType` must stay correct without the buff for v2 units that only have the keyword.
- `duelyst/app/sdk/validators/validatorEntityAction.coffee` -- already routes v2 attacks through `getTargetAtPosition` and `getIsPositionValid`.
- AI and view: `duelyst/app/sdk/ai` target and board geometry code and the card UI range display (`CardNode.js` reads `getAttackRangeValue`) must show and use the stat.
- Tests: `duelyst/test/unit/sdk/game/hex_attack_geometry.js` (existing axis cases will change; replace them with the fixtures), `board.js`, `test/unit/sdk/ai/board_geometry.js`, `test/unit/sdk/game/phase_keyword.js` (pattern for keyword stat tests).

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/test/unit/sdk/game/hex_attack_geometry.js` -- add the fixtures above as table-driven tests (including `getValidTargets` and `getIsValidTarget` agreement, a removed Wall, a 0-health Wall, a Wall target, and the supporting-Wall exception); update the axis-only ranged tests; add `KEYWORD_NO_RANGE` -- fixes the agreed behavior first.
- [x] `duelyst/app/sdk/rulesets/hexAttackGeometry.coffee` (and `hexTopology.coffee` for geometry helpers) -- implement the ranged rule in `canDeliver`; leave area, spell, lobbed, and melee untouched.
- [x] `duelyst/app/sdk/modifiers/modifierRanged.coffee`, `modifierBandedRanged.coffee`, `duelyst/app/sdk/entities/entity.coffee` -- in v2 the Ranged keyword grants no reach; `getAttackRangeValue` equals the stat; legacy and v1 unchanged.
- [x] `duelyst/app/sdk/ai` and view range display -- confirm they read the stat and `canDeliver`; fix any path that assumes the six axes or `REACH_RANGED` in v2.
- [x] `_bmad-output/specs/spec-practice-sandbox-map/SPEC.md` (ranged rules around the six-axis and Wall-blocking wording), `.../spec-unit-stats-active-abilities/SPEC.md`, and `ARCHITECTURE-SPINE.md` AD-8 -- replace the six-axis wording with this rule; keep the area-effect wording.

**Acceptance Criteria:**
- Given each fixture, when a v2 ranged attacker with that range is evaluated, then exactly the `#` and `W` tiles are legal targets.
- Given a unit with the Ranged keyword and a stat range of 2 in a v2 match, when its stats are read in the game or the card UI, then the attack range shows 2 and no target beyond distance 2 is legal.
- Given legacy, version 1, lobbed, area, and spell tests, when run, then they pass unchanged.
- Given a Wall that is destroyed, when the next target query runs, then it no longer blocks.

## Implementation Notes

- The previous ranged branch treated any segment entering a Wall's hex interior as blocked. Story 17 requires center-only Wall blocking, so the ranged path now tests the Wall center; area and spell obstruction retain the existing interior rule.
- Added the six story ASCII fixtures as table-driven resolver tests. The existing live-board checks still verify range/target agreement, target-supporting Walls, removed Walls, zero-health Walls, and Ranged keyword stat behavior.
- `npx mocha --exit -t 3000 test/unit/sdk/game/hex_attack_geometry.js test/unit/sdk/game/board.js test/unit/sdk/ai/board_geometry.js test/unit/sdk/game/phase_keyword.js`: 111 passing.
- CoffeeLint passes the changed CoffeeScript files when run with the checkout-specific `line_endings` rule omitted; the repo rule requires LF but these Windows checkout files are CRLF. ESLint with parserOptions `ecmaVersion: 2022` reports five pre-existing errors in `test/unit/sdk/game/board.js` (lines 415, 434, 843, 873, 874); the changed geometry test has warnings only.
- Manual Practice match verification was not available in this CLI session.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence / route |
|---|---|---|
| Blind Hunter: no `getValidTargets`/`getIsValidTarget` agreement coverage | false | `getValidTargets and getIsValidTarget agree for ranged attackers` compares both paths for enemies and Walls and checks a blocked target is omitted. |
| Blind Hunter: ASCII fixtures only use a fake board | false | The table-driven cases target the pure shared `canDeliver` resolver; a separate live-board test verifies valid-target selection and validation agree through that resolver, and each fixture candidate's range is asserted. |
| Blind Hunter: no explicit `ModifierBandedRanged` reach regression test | low / patch | The class inherits `ModifierRanged`; added a focused v2 subclass test asserting attack type and reach/range remain 2. |
| Blind Hunter: `KEYWORD_NO_RANGE` missing | false | The Ranged-keyword test verifies attack type, `getReach()`, `getAttackRangeValue()`, an in-range target, and rejection beyond distance 2. |
| Blind Hunter: removed-Wall behavior not asserted | false | The separate `RANGED: a Wall no longer on the board stops blocking` test checks the target becomes valid after removal. |
| Blind Hunter: endpoint Wall exception unclear for linked barriers | false | Both map specs state that Walls on attacker/target tiles do not block; ranged code excludes endpoint Walls from center and linked-Wall checks. |

## Verification

**Commands:**
- `cd duelyst && npx mocha --exit -t 3000 test/unit/sdk/game/hex_attack_geometry.js test/unit/sdk/game/board.js test/unit/sdk/ai/board_geometry.js test/unit/sdk/game/phase_keyword.js` -- expected: all passing
- `cd duelyst && npx eslint` on every edited file -- expected: clean

**Manual checks (no CLI):**
- In a Practice match, select a ranged unit next to Walls and confirm the red highlights match the fixtures, that the card shows its stat range, and that a Wall behind a linked pair of Walls is not highlighted.
