---
title: 'Resolve positions consistently on the irregular hex battlefield'
type: 'feature'
created: '2026-11-01'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '2ba4bccc4356d07f6beb0955b817352660517f35'
outer_baseline_commit: 'ef4b255ef989fcee4ef72b0de8b2a5d2728e145e'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-1-preserve-each-saved-match-s-battlefield-and-rules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The shared axial topology already models the staggered 9-8-9-8-9 logical rows, but it treats every position as a rendered tile. Version 2 needs the two specified holes to remain addressable geometry without claiming tiles, and geometry consumers need one consistent result.

**Approach:** Keep the established `{q,r}` coordinate format and the existing 43-position coordinate mapping. Expose the versioned tile-presence mask separately from logical board bounds, then route shared board geometry through the canonical topology so version 2 preserves holes as logical positions while reporting only 41 actual tiles. Preserve version 1 behavior and keep version 2 entry/render rollout for Story 2.3.

## Boundaries & Constraints

**Always:** Logical rows are lengths 9, 8, 9, 8, 9 (43 positions); row 1 and row 3 render half a tile right. Version 2 has no tile at (row,column) (0,2) and (4,6), but both positions remain on-board in logical geometry. Within-row neighbors are c-1/c+1. Adjacent-row neighbors are c-1/c for even rows and c/c+1 for odd rows, filtered to row bounds. Preserve axial coordinates, action/snapshot formats, exact map placements, and the existing version 1 topology. Shared SDK geometry remains the source for browser prediction, server AI, and reconstruction.

**Never:** Change version 1 topology or starts; switch coordinate systems; make holes off-board; activate version 2 in match entry or construct the replacement map; add hole movement permissions, terrain blocking, or rendering behavior owned by later stories; change legacy square behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Logical board | Version 2, all valid axial cells | 43 unique in-bounds positions; both hole coordinates remain queryable | Malformed or out-of-row coordinates are rejected |
| Tile mask | Version 2, (0,2), (4,6), and ordinary cells | Holes report no tile; all other 41 cells report a tile | Off-board positions report no tile |
| Prior map | Version 1 session | Existing 43 positions, topology, and all-tile behavior remain unchanged | No reinterpretation by current entry defaults |
| Adapter round trip | Each logical position | SDK axial → rendered row/column → SDK axial returns the same unique position | Invalid positions return no rendered cell |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/rulesets/hexTopology.coffee` -- canonical axial/rendered conversion, 43-cell bounds, six deltas, range, line, and distance. Add the version 2 tile mask here; retain logical bounds for holes.
- `duelyst/app/sdk/board.coffee` -- `getPositions`, `isOnBoard`, neighbors, distance, rendered offsets, range, and paths delegate to `HexTopology`. Expose actual tile positions/presence separately; do not make `isOnBoard` reject holes.
- `duelyst/app/common/utils/utils_hex_view.js` and `utils_engine.js` -- view conversion already round-trips all 43 row-staggered positions. Preserve the mapping and add coverage for hole coordinates; tile rendering belongs to Story 2.3.
- `duelyst/app/sdk/entities/range.coffee`, `attackRange.coffee`, and `movementRange.coffee` -- geometry consumes board bounds/range and shared line helpers. Keep targeting and movement policy unchanged while checking version 2 queries.
- `duelyst/server/ai/scoring/utils/utils_boardGeometry.js` -- AI column, row, and distance features consume the same SDK board helpers; verify parity without introducing private offsets.
- `duelyst/test/unit/sdk/game/board.js`, `test/unit/misc/hex_view.js`, and server AI geometry tests -- extend existing topology and adapter coverage for exact neighbors, holes, version 1 compatibility, and version 2 consumers.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/rulesets/hexTopology.coffee` and `duelyst/app/sdk/board.coffee` -- expose logical positions separately from version-specific tile presence while keeping v1 behavior and holes addressable.
- [x] `duelyst/test/unit/sdk/game/board.js` -- cover 43 unique positions, 41 v2 tiles, both logical holes, out-of-row rejection, the exact center neighbor set, range/path/distance agreement, and unchanged v1 results.
- [x] `duelyst/test/unit/misc/hex_view.js` and server AI geometry tests -- round-trip all 43 coordinates without collisions and confirm view, SDK, and AI adapters agree on representative row/column positions.

**Acceptance Criteria:**
- Given the replacement map, when logical positions and tile presence are queried, then it contains 43 unique positions and exactly 41 tiles, with (0,2)/(4,6) addressable but tileless and invalid row columns rejected.
- Given a position on an even or odd row, when its neighbors are queried, then the adjacent-row column rules and row bounds are followed; (2,4) has exactly (2,3),(2,5),(1,3),(1,4),(3,3),(3,4).
- Given any of the 43 positions, when converted through the existing view/SDK adapters and back, then it returns the same position without collisions and keeps `{q,r}` data unchanged.
- Given geometry queries in a version 2 SDK session, when Board, range/path, targeting, server AI, and reconstruction fixtures process them, then they agree on bounds, neighbors, and distance; version 1 and legacy fixtures retain their prior behavior.
- Given an invalid or off-row position, when geometry APIs query it, then it is rejected without emitting an invalid neighbor, range, path, or rendered coordinate.

## Implementation Notes

- Story 2.1 registered `practice-sandbox-hex:2` but left entry selection at version 1. Story 2.2 may test version 2 explicitly; do not switch Practice or Sandbox entry to it.
- Story 2.1's saved version 1 map uses the current 43-position row-staggered topology with center-edge starts. The older Story 1.2 artifact describes an earlier 45-cell layout, but the committed Practice baseline and current version 1 compatibility tests supersede that historical fixture for this task.
- This story defines logical geometry and a tile-presence query only. Movement permissions for holes, placement of Walls/Points, rendered tile omission, and version 2 rollout remain later-story work.
- No persistence migration, deletion, deployment, or external side effect is expected. Likely code footprint is the canonical topology, Board accessors, and focused SDK/view/server geometry tests.
- `HexTopology.rowLengths` now drives rendered-coordinate bounds and enumeration. Version 2's tile mask excludes axial positions `{q:2,r:0}` and `{q:4,r:4}`; `Board.isOnBoard` and all logical geometry still include them. Version 1 continues to report all 43 cells as tiles.
- Added `Board.getTilePositions()` and `Board.hasTileAtPosition()` so later map rendering and movement work can use physical tile presence without changing logical bounds. Entry selection, coordinate serialization, range/path rules, and movement permissions were not changed.
- Extended board, view, AI-geometry, and snapshot/replay fixtures. Verification: focused suite passed 68 tests; `git diff --check` passes in both repositories.

## Design Notes

Keep two independent questions in the API: `isOnBoard(position)` answers whether the coordinate is valid logical geometry; tile presence answers whether that position has a physical tile in this map version. This preserves range and coordinate resolution over holes for later movement rules without drawing a tile or changing old matches.

## Verification

**Commands:**
- `node node_modules/mocha/bin/_mocha --no-config --require coffeescript/register --timeout 10000 --exit --reporter dot test/unit/sdk/game/board.js test/unit/misc/hex_view.js test/unit/sdk/ai/board_geometry.js test/integration/misc/utils_game_session.js` -- 68 passing.
- `git diff --check` -- expected: no whitespace errors.

## Review Triage Log

- `false` — Blind Hunter: AI geometry coverage does not query the holes. The acceptance intent keeps holes in logical geometry, and the AI reads shared Board geometry; tile presence is a separate query, so excluding holes from AI geometry would violate the specified behavior.
- `false` — Blind Hunter: invalid range/path/neighbor/rendered outputs are not covered exhaustively. Board range and path entry points reject off-board positions, neighbors are filtered through `isOnBoard`, and rendered offset conversion returns `null` when the candidate is outside the row bounds.
- `false` — Blind Hunter: only the center neighbor set is asserted directly. The canonical six axial deltas are applied uniformly and filtered against each row's bounds; the view geometry test checks valid neighbor spacing across every rendered row.
- `false` — Blind Hunter: cell-index uniqueness is not asserted directly. The adapter maps each unique rendered `(c,k)` pair to `c * 5 + k`; since `0 <= k < 5`, distinct pairs cannot collide, and all 43 axial positions round-trip through the same rendered mapping.
- `false` — Blind Hunter: reconstruction fixtures do not re-query neighbors and distance. Both restored and replayed sessions preserve the ruleset version and use the same shared topology functions, while the fixture confirms the restored version-specific mask and logical positions.
- `false` — Blind Hunter: unsupported ruleset versions return no tile. This is fail-closed behavior and no requirement defines a different invalid-version response; adding an exception would introduce new public behavior beyond this story.
- `false` — Edge Case Hunter: no findings.
- `false` — Verification Gap Reviewer: no verification gaps found.
