---
title: 'Move and target consistently on hexes'
type: 'feature'
created: '2026-10-30'
status: 'done'
route: 'dispatch'
baseline_commit: 'f55dc78c0e5bda577f2d8ccdbbf4cd32a5823669'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The new-rules board stores axial positions, but movement, attack range, targeting, modifiers, and AI still contain square `{x,y}` calculations. That can make client predictions, authoritative validation, and replay disagree or accept moves across non-neighbor diagonals.

**Approach:** Route new-rules movement and target calculations through the shared axial topology while keeping legacy square behavior intact. Carry `{q,r}` positions through actions, modifiers, AI, validation, and replay without implicit coordinate-shape conversion.

## Boundaries & Constraints

**Always:** New-rules positions in SDK state and action payloads are integer `{q,r}` pairs. Movement and adjacency use only the six shared axial neighbors; distance and range use hex distance; every produced destination is on the 45-cell board. Obstruction, movement speed, attack reach, and line-of-sight rules remain enforced in their respective SDK paths. A malformed or legacy `{x,y}` position cannot make a new-rules action legal. Client prediction, server validation, and replay use the same ruleset-specific logic. Legacy matches retain `{x,y}`, square patterns, and current action behavior.

**Never:** Implicitly reinterpret square offsets as axial directions, change legacy behavior, or include view rendering and interaction changes owned by Story 1.4. Do not broaden card eligibility; conflicting card policy is handled by later stories.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|-----------------------------|----------------|
| Hex movement | New-rules unit, legal destination within speed | Path uses only six-neighbor axial steps and preserves `{q,r}` from start through destination | Off-board, occupied, malformed, or out-of-speed destinations are invalid |
| Edge movement | Valid unit and destination at a board edge | Client preview and authoritative validation agree; no off-board step appears | Invalid edge target is rejected |
| Hex attack | New-rules attacker and target | Attack range and required line of sight use axial distance/line cells; square-only diagonals cannot authorize a target | Out-of-range or blocked target is invalid |
| Modifier / AI action | New-rules action generated from a position or offset | Generated source and target positions are `{q,r}` and pass the same validator | Legacy-shaped or off-board payload cannot be silently converted |
| Serialize / replay | Valid and invalid new-rules actions | Serialized action and replay preserve axial coordinates and the same legality result | Unsupported coordinate shape is rejected |
| Legacy action | Legacy match and `{x,y}` positions | Existing movement, attack, prediction, and replay behavior remains unchanged | N/A |

</frozen-after-approval>

## Code Map

- `app/sdk/rulesets/hexTopology.coffee`, `app/sdk/board.coffee` -- shared neighbor, distance, range, path, and bounds API from Story 1.2; reuse it rather than adding offset lists.
- `app/sdk/entities/range.coffee`, `movementRange.coffee`, `attackRange.coffee`, `entity.coffee` -- pattern expansion, path cost, attack range/LOS, and public action entry points; add new-rules branches and keep legacy implementations intact.
- `app/sdk/actions/action.coffee`, `applyCardToBoardAction.coffee`, `moveAction.coffee`, `teleportAction.coffee`, `swapUnitsAction.coffee`, `app/sdk/player.coffee`, `app/sdk/gameSession.coffee` -- source/target position creation, action execution, and serialization boundaries.
- `app/sdk/validators/validatorEntityAction.coffee`, `validatorApplyCardToBoard.coffee`, `validatorFollowup.coffee` -- shared server/client legality checks; compare axial positions and reject mixed shapes.
- `app/sdk/agents/agentActions.coffee` -- AI action deltas, targets, and follow-up source positions currently assume x/y.
- `app/common/utils/utils_position.js` and position-using `app/sdk/modifiers` / `app/sdk/spells` -- legacy equality, membership, range, and action creation seams; add ruleset-aware shared helpers where positions enter new-rules actions, without changing legacy helpers globally.
- `test/unit/sdk/game/actions_validators.js`, `test/unit/sdk/game/board.js`, and `test/unit/sdk/ai` -- add movement, attack, mixed-shape, and parity coverage; retain existing legacy assertions.

## Tasks & Acceptance

**Execution:**
- [x] `app/sdk/entities/range.coffee` and `movementRange.coffee` -- implement axial neighbor traversal, distance cost, shortest legal paths, obstruction handling, and axial path caching for the new ruleset.
- [x] `app/sdk/entities/attackRange.coffee` and `entity.coffee` -- compute axial attack positions, range, and required line of sight using shared topology; preserve legacy attack patterns.
- [x] `app/sdk/actions`, `app/sdk/player.coffee`, `app/sdk/gameSession.coffee`, and validators -- retain `{q,r}` in source/target positions, reject mixed shapes, and use identical legality checks in prediction and authoritative execution.
- [x] Position-producing `app/sdk/agents`, modifiers, and spells -- use axial offsets/helpers for new-rules actions; ensure square-only calculations cannot authorize movement or targeting; keep legacy paths unchanged.
- [x] `test/unit/sdk/game/actions_validators.js`, board/action tests, and `test/unit/sdk/ai` -- cover the matrix, serialization/replay parity, edge cases, and legacy behavior.
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- mark Story 1.3 in progress during implementation and review when complete.

**Acceptance Criteria:**
- Given a new-rules match, when SDK actions, modifiers, AI, or server validation produce or consume a position, then they use axial `{q,r}` positions and the shared six-neighbor topology, and square-only offsets or diagonals cannot make an action legal.
- Given legal or illegal movement, range, or target requests at a board edge, when client prediction and authoritative resolution process them, then both return the same legality result and preserve the same axial action target through replay.
- Given a legacy match or explicitly supported legacy input adapter, when positions are processed, then `{x,y}` remains valid only in that context and no implicit conversion mixes coordinate shapes in a new-rules action.

## Implementation Notes


## Spec Change Log


## Review Triage Log
- **medium — patch:** `app/sdk/board.coffee` `getHexPositionAtRenderedOffset` returned an off-board position instead of the `null` sentinel used by its stepping callers; tracing the row/front traversal confirmed it can continue past the board indefinitely. Fixed to return `null` for off-board results.
- **medium — patch:** `app/sdk/board.coffee` the same missing off-board guard contradicted the frozen requirement that generated destinations are bounded to the 45-cell board. Fixed with the guard and covered by a boundary test.
- **medium — patch:** `app/sdk/spells/spellBloodRage.coffee` receives axial q/r callback arguments in hex sessions but used `{x,y}` to look up the target, so its buff target was missing. Switched to ruleset-aware effect positions.
- **medium — patch:** `app/sdk/spells/spellFirestormOfAgony.coffee` used `{x,y}` for the target lookup after the base spell callback supplies axial q/r, preventing the general effect from resolving. Switched to ruleset-aware effect positions.
- **medium — patch:** `app/sdk/spells/spellFountainOfYouth.coffee` used `{x,y}` for the hex callback target lookup; an unresolved unit could then be dereferenced. Switched to ruleset-aware effect positions and guarded the missing unit.
- **medium — patch:** `app/sdk/spells/spellResilience.coffee` used `{x,y}` for the hex callback target lookup, leaving its heal/draw effect without a unit and risking dereference. Switched to ruleset-aware effect positions and guarded the missing unit.
- **medium — patch:** `app/sdk/spells/spellSaurianFinality.coffee` built `{x,y}` from axial callback arguments, preventing its intended general target from resolving. Switched to ruleset-aware effect positions.
- **medium — patch:** `app/sdk/spells/spellTickleTendril.coffee` built `{x,y}` from axial callback arguments, preventing its target unit from resolving. Switched to ruleset-aware effect positions.
- **medium — patch:** `app/sdk/spells/spellVoidPulse.coffee` built `{x,y}` from axial callback arguments, preventing general lookup and its heal/damage effect. Switched to ruleset-aware effect positions.
- **medium — patch:** `app/sdk/spells/spellVoidSteal.coffee` passed `{x,y}` into the hex radius search after receiving axial callback arguments, so nearby allies were not selected. Switched to ruleset-aware effect positions.
- **medium — patch:** `app/sdk/spells/spellSpawnEntity.coffee` checked obstruction using `{x,y}` while creating a spawn action at the axial location, potentially bypassing a target obstruction. Reused the ruleset-aware effect position for the obstruction lookup.
- **medium — patch:** `app/sdk/modifiers/modifierOpponentSummonWatchSpawn1HealthClone.coffee` received an axial summon target but queried `.x/.y`, so the watcher could not find the summoned source unit. Updated lookup to use the ruleset-aware action target.
- **medium — patch:** `app/sdk/spells/spellWrathOfGod.coffee` changed to an axial position lookup and queued Hallowed at that position, but no test exercised that spell boundary. Added a test asserting the resulting axial action target.


## Design Notes

Hex movement speed is measured in neighbor steps; each traversed edge costs one. For attacks requiring line of sight, trace a deterministic shortest hex line between valid cells and reject off-board line cells or intervening obstructors. A move path is a traversable route and must account for occupancy; it is distinct from a straight line used for visibility. Use stable coordinate keys (`q,r`) for caches instead of rectangular x/y map indices.

## Verification

**Commands:**
- `node_modules/.bin/mocha --no-config --require coffeescript/register --timeout 10000 --exit test/unit/sdk/game/actions_validators.js test/unit/sdk/game/board.js` -- expected: new hex movement/attack/action cases and legacy board/action cases pass.
- Run focused AI tests covering `AgentActions` plus any new tests -- expected: axial targets and deltas survive action construction.
- Compile each changed CoffeeScript source with `coffeescript.compile` -- expected: all changed CoffeeScript files compile.
- `git diff --check` -- expected: no whitespace errors.

