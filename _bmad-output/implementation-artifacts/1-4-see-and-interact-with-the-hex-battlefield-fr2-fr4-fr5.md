---
title: 'See and interact with the hex battlefield'
type: 'feature'
created: '2026-10-30'
status: 'done'
route: 'dispatch'
baseline_commit: 'a29b4f8cc49aa20879c2ed8ef5c52bfc91bd9d87'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/1-2-play-on-a-correctly-bounded-hex-battlefield-fr2-fr5.md'
  - '{project-root}/_bmad-output/implementation-artifacts/1-3-move-and-target-consistently-on-hexes-fr5.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The SDK now models the new-rules board as axial hexes, but the game view still draws, picks, and highlights positions on a square lattice. Players cannot reliably identify or select the hex cell represented by an SDK position.

**Approach:** Add a ruleset-aware display adapter between axial SDK cells and the rendered battlefield. Draw and interact with the 45-cell pointy-top layout, route hover/selection and action previews through the same mapping, and leave legacy square rendering and interaction unchanged.

## Boundaries & Constraints

**Always:** New-rules Practice and Sandbox display all 45 cells in nine columns and five rows, with odd columns staggered down; show generals in the two center cells at opposite edges. Axial `{q,r}` positions and action targets map to the matching rendered cell and back. Input selection resolves to a legal axial board cell; previews use SDK-produced movement, attack, and range results. Legacy sessions retain the existing square layout, input, and previews.

**Never:** Change SDK movement, attack, target legality, card eligibility, or ruleset selection. Do not apply hex display conversion to legacy matches. Do not modify unrelated menus, deck screens, or environment art.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|-----------------------------|----------------|
| Hex board render | `practice-sandbox-hex` board | 45 pointy-top cells across 9 columns × 5 rows; odd columns stagger down; generals occupy opposite center-edge cells | No phantom cells outside board bounds |
| Position display | Valid axial cell or action target | Display adapter places the node/preview on its matching rendered cell | Malformed or off-board axial positions are not rendered as legal cells |
| Pointer selection | Pointer on a rendered cell, gap, or outside board | Cell center round-trips to the same axial position; hover/down/up agree; gaps/outside do not select another cell | Invalid hit returns no board position |
| Action previews | SDK move, attack, and range positions | Highlighted cells and paths correspond to the same positions SDK validates | Invalid targets are not highlighted as legal |
| Legacy display | Legacy session and square position | Existing layout, pointer mapping, and previews remain unchanged | N/A |

</frozen-after-approval>

## Code Map

- `app/sdk/rulesets/hexTopology.coffee`, `app/sdk/board.coffee` -- authoritative axial/rendered conversion and bounds; reuse these, do not introduce another topology.
- `app/common/utils/utils_engine.js` -- square board/screen and tile-map projection; add or route through explicit hex display conversions while preserving legacy transforms.
- `app/view/layers/game/BattleMap.js` -- `_setupTiles`, floor tile placement, and `showTiles` still assume a rectangular square grid; render only canonical board cells with staggered hex centers.
- `app/view/Player.js` -- pointer screen/down/up mapping, board hover position, and valid action preview tiles; make its hex path use axial cells and SDK position lists.
- `app/view/layers/game/TileLayer.js`, `app/view/layers/game/GameLayer.js`, `app/view/nodes/cards/EntityNode.js` -- merged tile maps, node lookup/placement, hover, and FX consume positions; keep axial model values and convert only at display boundaries.
- `test/unit/sdk/game/board.js` and a focused display-mapping test -- reuse the SDK hex board fixture; cover all 45 cell centers, inverse mapping, off-board/gap hits, preview placement, and legacy transform behavior.

## Tasks & Acceptance

**Execution:**
- [x] `app/common/utils/utils_engine.js` and a focused view mapper -- provide axial↔screen/rendered conversion and board-cell hit testing using Story 1.2 topology; retain square transforms for legacy.
- [x] `app/view/layers/game/BattleMap.js` -- render the bounded 45-cell pointy-top board, position floor cells and generals, and animate only valid cells.
- [x] `app/view/Player.js` -- map pointer move/down/up and programmatic board positions to the same axial cell; display legal move, attack, range, spell, and path previews at mapped positions.
- [x] `app/view/layers/game/TileLayer.js`, `GameLayer.js`, and entity/FX placement call sites -- adapt cell-keyed lookup, entity selection, hover, and action target drawing without converting axial coordinates into square SDK positions.
- [x] Focused mapper/view tests -- cover 45-cell round trips, pointer edge/gap behavior, axial preview placement, and unchanged legacy mapping.
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- mark Story 1.4 in progress during implementation and review when complete.

**Acceptance Criteria:**
- Given a new-rules Practice or Sandbox match, when the battlefield renders, then all 45 pointy-top cells appear in nine columns and five rows with odd columns staggered down, and the generals appear in the leftmost and rightmost center cells.
- Given an axial cell or SDK action target, when displayed or selected, then the view maps it to that rendered cell and back, and movement, attack, and range previews agree with SDK legality.
- Given a legacy match, when the board renders and receives pointer input, then its existing square layout and interactions remain available and the hex adapter is not applied.

## Implementation Notes

Added `utils_hex_view.js` as a view-only adapter over the shared axial topology. Hex screen transforms position the 45 cells in a staggered layout and hit-test cell footprints, returning no board position outside the board and resolving shared edges deterministically. Floor tiles, preview tile indices, entity hit-testing, action targets, and entity movement FX retain `{q,r}` through the view boundary. Legacy square transforms and lookup paths remain in place.

## Spec Change Log

## Review Triage Log

- Fixed the reported board-width calculation so the reported size includes both half-hex outer edges.
- Fixed shared-edge picking to choose the nearest cell center deterministically; outside points remain unselectable.
- Centralized pointer tile-map conversion in `UtilsEngine.transformPointerTileMapToBoard`; verified the move/down/up wiring and both axial conversion modes. Direct `Player` event execution was not available in the headless Cocos test environment.
- Fresh final review passes reported no actionable code or edge-case defects.

## Design Notes

Rendered `{c,k}` coordinates are a view adapter only; axial `{q,r}` remains the SDK/action identity. Cell center, hit testing, hover state, entity lookup, and preview placement must share one conversion path so a click and its highlight cannot disagree. Legacy `{x,y}` transforms remain the default for callers outside the hex ruleset.

## Verification

**Commands:**
- `node_modules/.bin/mocha --no-config --require coffeescript/register --timeout 10000 --exit test/unit/misc/hex_view.js test/unit/sdk/game/board.js` -- passed (50 tests).
- `node_modules/.bin/eslint --quiet app/common/utils/utils_hex_view.js app/common/utils/utils_engine.js app/view/Player.js app/view/layers/game/BattleMap.js app/view/layers/game/GameLayer.js app/view/layers/game/TileLayer.js app/view/nodes/cards/EntityNode.js app/view/nodes/cards/TileNode.js test/unit/misc/hex_view.js` -- passed.
- `git diff --check` -- passed.
