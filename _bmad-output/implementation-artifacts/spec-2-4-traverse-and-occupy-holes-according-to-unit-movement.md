---
title: 'Traverse and occupy holes according to unit movement'
type: 'feature'
created: '2026-11-01'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
story_key: '2-4-traverse-and-occupy-holes-according-to-unit-movement'
baseline_commit: '1d3765d02aa90c90544b1175c8b729539e23633a'
outer_baseline_commit: 'b94fce16b0821a992d623ac14e18b528ee58872e'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/map-layout.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-3-enter-and-interact-with-the-exact-replacement-battlefield.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Version 2 holes remain logical board positions, so shared movement search currently allows ordinary units to route through and occupy them. This makes movement previews, validation, and resolved actions disagree with the map's movement rules.

**Approach:** Apply hole movement permissions in the shared hex movement range: ordinary units cannot traverse or end on holes, while Flying units can do both. Preserve logical hole coordinates and keep summon legality independent from movement permissions.

## Boundaries & Constraints

**Always:** Apply only to `practice-sandbox-hex` version 2. Keep version 1 and legacy movement behavior. Treat the existing Flying movement capability as the ruleset's flying/phasing permission; do not introduce a separate Phasing modifier. Hole occupants remain ordinary entities at their axial coordinates and the hole remains tileless. Preserve speed, occupancy, and existing combat rules. Summons still use their existing legality rules.

**Never:** Change board logical geometry, tile mask, saved coordinates, summon rules, Wall movement behavior (Stories 2.5–2.6), attack obstruction (Story 2.7), or map entry selection.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ordinary endpoint | Version 2 ordinary unit has a hole within speed | Hole is absent from valid destinations and `getPathTo` returns an empty path | Invalid move remains rejected by shared validation |
| Ordinary route | Every route to a tile crosses a hole | Destination is unreachable; preview and validation use the same result | No alternate route is fabricated |
| Flying endpoint and route | Version 2 Flying unit has a hole within speed | Hole may be an endpoint or intermediate path position | Occupancy and speed constraints still apply |
| Compatibility | Version 1 or legacy board | Existing movement results are unchanged | Existing ruleset behavior |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/entities/movementRange.coffee` -- shared hex BFS feeds valid destinations, path lookup, client previews, action validation, and action execution. Filter v2 holes here; retain the existing Flying traversal rule.
- `duelyst/app/sdk/board.coffee` and `duelyst/app/sdk/rulesets/hexTopology.coffee` -- reuse `hasTileAtPosition` / ruleset-aware tile mask to identify holes; preserve `isOnBoard` and logical neighbor geometry.
- `duelyst/app/sdk/validators/validatorEntityAction.coffee` and `duelyst/app/sdk/actions/moveAction.coffee` -- consume the shared MovementRange result; leave call paths unchanged unless tests show a gap.
- `duelyst/test/unit/sdk/game/board.js` -- extend axial movement tests for ordinary/Flying v2 units, v1 compatibility, and shared path validation.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/entities/movementRange.coffee` -- make v2 hole traversal and endpoints depend on Flying movement permission, keeping all other movement behavior.
- [x] `duelyst/test/unit/sdk/game/board.js` -- cover ordinary route/endpoint rejection, Flying route/endpoint acceptance, and v1 compatibility.

**Acceptance Criteria:**
- Given an ordinary v2 unit, when a candidate path crosses or ends on either hole, then shared movement range excludes that path and destination.
- Given a Flying v2 unit, when a legal path crosses or ends on either hole, then shared movement range accepts it while preserving speed and occupancy rules.
- Given movement preview, validation, execution, and replay, when they evaluate a hole path, then they agree through the shared movement path and retain the axial occupant position without requiring a tile.
- Given a summon targeting a hole, when existing summon validation runs, then movement permission alone does not make the summon legal.
- Given a v1 or legacy game, when movement is evaluated, then prior behavior remains unchanged.

## Implementation Notes

- Version 2 hex movement now blocks ordinary units from traversing or occupying either tileless hole; Flying units retain traversal and occupancy subject to normal speed and obstruction rules. Existing shared MovementRange keeps previews, validation, execution, and replay aligned.
- Tests cover both holes, ordinary rejection, Flying endpoints/routes, occupied-hole traversal without stopping, move validation, and serialized/replayed axial positions. Existing summon checks were left on their separate legality path.
- Review triage: one ruleset-scope claim was false because the changed code is already inside the practice-sandbox-hex branch; three coverage findings were patched. No findings remain deferred. Final acceptance additions also prove General adjacency/available destination still govern hole summons and board lookup resolves a unit at a tileless hole.

- Version 2 MovementRange now blocks non-Flying traversal into tileless holes; Flying remains traversable, and hole endpoints remain valid for Flying. The shared range continues to drive previews, validation, and move action path generation.
- Added unit coverage for ordinary endpoint and only-route rejection, Flying endpoint and route acceptance, and version 1 compatibility. Focused board suite initially passed 51 tests.

## Spec Change Log

## Review Triage Log

- `false` — Blind Hunter: the hole check lacks a ruleset-ID guard. The changed lines are nested within `if entity.getGameSession().getRulesetId() is 'practice-sandbox-hex'`, so another ruleset version 2 never reaches this branch.
- `low` — Blind Hunter: coverage omitted the second v2 hole. Routed to `patch`; added ordinary and Flying endpoint/route assertions for `{ q: 4, r: 4 }`, confirming behavior matches the shared mask for both canonical holes.
- `low` — Blind Hunter: coverage omitted occupancy constraints when Flying traverses an occupied hole. Routed to `patch`; the occupied-hole test asserts no endpoint path exists while the Flying route through it to the next tile remains valid.
- `medium` — Blind Hunter: tests exercised range/path lookup but not action validation, execution, or replay. Routed to `patch`; the action test rejects an ordinary move, validates a Flying move, checks its serialized/replayed axial path, executes the replay, and finds the unit at the tileless hole.

## Design Notes

Treat physical tile availability as a movement restriction only for ordinary units under v2. Flying already permits traversal over occupied cells but occupied cells remain invalid endpoints; holes have no occupant by default, so they can be legal Flying endpoints without creating a tile. Do not make holes globally invalid or alter neighbor enumeration, since targeting and coordinate addressability rely on logical geometry.

## Verification

**Commands:**
- `node_modules/.bin/mocha -t 1000 test/unit/sdk/game/board.js` -- 54 passing.
- `node_modules/.bin/mocha -t 1000 test/unit/sdk/game/basic.js --grep "flying to allow a unit to move across the map|not be able to move out of range|not be able to move through an enemy unit"` -- 3 passing (legacy movement compatibility).
- `git diff --check` in both repositories -- expected: no whitespace errors.
