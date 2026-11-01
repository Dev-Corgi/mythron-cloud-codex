---
title: 'Enter and interact with the exact replacement battlefield'
type: 'feature'
created: '2026-11-01'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
story_key: '2-3-enter-and-interact-with-the-exact-replacement-battlefield'
baseline_commit: '5b9521a00168564d7ccd1aae768664db27ad7360'
outer_baseline_commit: 'f7ca8997ab1732c74ae07adf73f7f91e14546b70'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-2-resolve-positions-consistently-on-the-irregular-hex-battlefield.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The versioned replacement map already distinguishes 43 logical positions from 41 physical tiles, but the battlefield renderer still builds floor hexes from all logical positions. This draws floor at both holes and makes the rendered board disagree with the version 2 tile mask.

**Approach:** Render the battlefield's physical floor from the version-specific tile positions while keeping the shared axial mapping and pointer adapters as the source of coordinates. Preserve version 1's 43 rendered tiles and keep holes addressable in logical geometry for the later movement story.

## Boundaries & Constraints

**Always:** Version 2 renders exactly 41 cells, omitting `(row,column) (0,2)` and `(4,6)`; the other 41 positions use the existing hex center and hit-test mapping. Version 1 remains 43 tiles. Keep `{q,r}` action and snapshot coordinates, fixed starts, and non-hex map behavior unchanged. Version 2 rendering must follow the match's stored ruleset version, not the current launch default.

**Never:** Change saved version 1 maps or legacy rendering; make holes invalid logical positions; add Walls, Methron Points, hole movement permissions, or other later-story terrain rules; enable version 2 entry before the replacement rules package is integrated.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Replacement floor | Version 2 board | 41 floor hexes are constructed at the tile-mask positions; neither hole has a floor node | Invalid rendered positions are skipped |
| Prior floor | Version 1 board | All 43 existing hex positions still receive floor nodes | No reinterpretation of saved ruleset identity |
| Pointer mapping | Version 2 tile or logical hole center | Existing adapter returns the same `{q,r}` coordinate; hole addressability stays available to Story 2.4 | Off-board screen points return `null` |
| Other modes | Legacy or non-hex session | Existing board geometry and map rendering remain unchanged | Existing behavior |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/rulesets/hexTopology.coffee` -- canonical 43-position geometry and `getTilePositions(version)` already define the version 2 mask; reuse them without adding another map source.
- `duelyst/app/sdk/board.coffee` -- `getPositions()` returns logical geometry; `getTilePositions()` returns the physical, version-aware set. The renderer must use the latter only for floor construction.
- `duelyst/app/common/utils/utils_hex_view.js` and `utils_engine.js` -- preserve the established axial/rendered and screen/pointer adapters. Logical holes still resolve to coordinates; tile omission is a rendering concern here.
- `duelyst/app/view/layers/game/BattleMap.js::_setupTiles` -- currently loops over `board.getPositions()` and creates/stores a floor hex per position. Use the tile-mask positions while retaining sparse indices and resize behavior.
- `duelyst/app/view/layers/game/TileLayer.js` -- existing hex polygon drawing and layer insertion are reusable; avoid square-grid merged-tile changes.
- `duelyst/test/unit/misc/hex_view.js`, `test/unit/sdk/game/board.js`, and `test/integration/misc/utils_game_session.js` -- extend focused renderer, mapping, version compatibility, and reconstructed-version coverage.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/view/layers/game/BattleMap.js` -- construct versioned floor hexes from `Board.getTilePositions()` and preserve coordinate-indexed sparse storage so omitted cells do not shift other tiles.
- [x] `duelyst/test/unit/misc/hex_view.js` -- verify v2 has no rendered floor at either hole, all other 41 tile centers map correctly, and logical pointer conversion remains stable.
- [x] `duelyst/test/unit/sdk/game/board.js` and `test/integration/misc/utils_game_session.js` -- confirm v1 stays at 43 tiles and restored/replayed v2 sessions select the 41-tile mask.

**Acceptance Criteria:**
- Given a version 2 battlefield, when its floor is constructed, then exactly the 41 tile-mask positions receive hex floor nodes and the two holes receive none.
- Given any rendered version 2 tile, when input is transformed through the existing view and SDK adapters, then the original axial position is returned without changing serialized coordinates.
- Given a pointer at a logical hole center, when the adapter resolves the position, then the hole remains addressable even though no floor tile is rendered there.
- Given a version 1 saved session or a legacy session, when the battlefield is rendered or reconstructed, then its prior tile count, map selection, and coordinate behavior remain unchanged.
- Given Practice or Sandbox entry before the replacement rules package is complete, when a new match is created, then it retains the existing version 1 selection.

## Implementation Notes

- `BattleMap._setupTiles()` now reads `Board.getTilePositions()`. Version 1 and legacy boards still enumerate their full physical position set; version 2 leaves sparse floor-map entries for the two holes.
- The existing axial screen adapter remains version-independent so a logical hole still resolves to `{q,r}` while the floor layer omits it. Practice/Sandbox entry remains version 1 until the complete replacement package is integrated.
- Added `UtilsHexView.createTileMap()` for the floor-node sparse map. The focused view test exercises its node factory and layer-add callback, checks all 41 version 2 indices and both holes, round-trips every tile center, and verifies BattleMap wires the helper. Existing board and restore/replay checks also ran.
- Verification: focused hex view, board, and game-session restore/replay suite passed 69 tests.

## Spec Change Log

## Review Triage Log

- `medium` — Blind Hunter: the initial floor test inspected Board positions and BattleMap source only, so an incorrect floor map could go undetected. Routed to `patch`; `UtilsHexView.createTileMap()` is now exercised with node creation and layer-add callbacks, and the test asserts the sparse result contains exactly the 41 tile positions and no hole nodes.
- `low` — Blind Hunter: session setup and file reads originally occurred before the test's `try/finally`, so a setup error could leave the shared GameSession in version 2 for later tests. Routed to `patch`; the entire test body now runs within `try/finally` and resets the session if initialization succeeded.
- `false` — Blind Hunter: the added non-hex equality assertion alone did not check the version 1 count. The same focused board suite already asserts version 1 has 43 positions and 43 tile positions, disproving the claimed compatibility gap.
- `false` — Blind Hunter: the diff did not add a new snapshot/replay test. The existing `utils_game_session.js` version 2 restore and replay case asserts both reconstructed boards have 41 tile positions, and that case ran in the passing focused suite.
- `medium` — Verification Gap Reviewer: no runtime renderer verification existed in the first review diff. Routed with the same floor-map verification patch; the actual helper used by `_setupTiles()` now builds and adds 41 sparse nodes in the test, with no entries at the hole indices.
- `medium` — Edge Case Hunter: the first review diff did not assert that hole indices are empty in the generated floor map. Routed with the same floor-map verification patch; the test now directly checks both sparse map entries are undefined.

## Design Notes

Logical geometry and physical floor rendering intentionally use different enumerations: `getPositions()` contains 43 addressable cells, while `getTilePositions(2)` omits only the two holes. The renderer should retain each position's canonical cell index so the missing tiles remain sparse rather than compressing later cells.

## Verification

**Commands:**
- Focused Mocha suites for `test/unit/misc/hex_view.js`, `test/unit/sdk/game/board.js`, and `test/integration/misc/utils_game_session.js` -- expected: all pass.
- `git diff --check` in both repositories -- expected: no whitespace errors.
