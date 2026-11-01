---
title: 'Attack neutral Walls and open their tiles'
type: 'feature'
created: '2026-11-01'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
story_key: '2-5-attack-neutral-walls-and-open-their-tiles'
baseline_commit: 'fb7469752ee08eb7ae8982109bfd5cdfe2ee7fc4'
outer_baseline_commit: 'f8154a1d48696f8d98360c9c4e1910a22fd727e8'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/map-layout.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-4-traverse-and-occupy-holes-according-to-unit-movement.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The version 2 map has no neutral Wall entities, so its nine marked obstacle positions are passable and cannot be attacked. Players need to damage and destroy those obstacles to open routes while preserving the map tile beneath each Wall.

**Approach:** Add version 2 Walls as neutral, attackable terrain entities with 10 health, place them at the nine canonical positions, and let existing damage/death actions remove only the Wall. Reuse Bonechill Barrier visuals while keeping the original card's ownership, stats, and modifiers out of the Wall rules.

## Boundaries & Constraints

**Always:** Wall positions are (row,column): (0,1),(0,6),(1,3),(2,2),(2,6),(2,8),(3,4),(4,2),(4,7); preserve the asymmetry and leave (2,0) without a Wall. Create Walls only for `practice-sandbox-hex` version 2. Walls have neutral game-session ownership, are targetable with 10 HP, and obstruct ordinary unit traversal and endpoints while alive. Use the existing Wall card ID and Bonechill Barrier animation/audio assets as visuals only. Damage, HP, death, setup snapshots, and replay use existing SDK action/persistence paths. Removing a Wall leaves its physical map tile present.

**Never:** Change v1/legacy maps, match entry selection, hole behavior, summoning rules, or unrelated Bonechill Barrier behavior. Add Wall/unit co-location or its target priority (Story 2.6), special Flying Wall occupancy (Story 2.6), or ranged/area Wall obstruction (Story 2.7). Do not duplicate Walls on reconstruction or alter the static map tile mask when a Wall dies.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Setup | New v2 match | Exactly nine targetable neutral 10-HP Walls at the specified cells; no Wall at (2,0) | Invalid/off-board placement is not silently shifted |
| Attack | Either player, legal attack against a living Wall | Resolved damage updates Wall HP and visible stats; original Barrier modifiers do not apply | Existing attack legality handles invalid attacks |
| Ordinary movement | Living Wall on route or endpoint | Shared preview and validation reject crossing or stopping there | Other valid routes remain available |
| Destruction | Damage reduces Wall to zero | Only Wall entity is removed; underlying tile stays and becomes unobstructed | No repeated death/removal action |
| Save/replay | Damaged or destroyed Wall in a session snapshot/replay | HP, ownerlessness, presence/removal, and underlying tile reconstruct deterministically | No duplicate Wall or missing tile |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/rulesets/hexTopology.coffee` -- canonical version 2 terrain coordinates; add/reuse a single Wall-position source while leaving `getTilePositions()` unchanged.
- `duelyst/app/sdk/gameSetup.coffee` -- use version 2 map-corner General starts (row-column (4,0)/(0,8)) and create the nine Walls before `createGameSetupData`; preserve version 1 starts and restore `boardCardsData` under stored ruleset identity.
- `duelyst/app/sdk/cards/factory/misc/tiles.coffee` and `duelyst/app/sdk/cards/cardsLookup.coffee` -- `Cards.Tile.Wall` ID exists but has no factory implementation; configure a targetable neutral 10-HP `Tile` with obstruction and Barrier visuals, without `ModifierWall` or Barrier card effects.
- `duelyst/app/sdk/board.coffee`, `duelyst/app/sdk/entities/movementRange.coffee`, `duelyst/app/sdk/entities/attackRange.coffee`, `duelyst/app/sdk/entities/entity.coffee` -- reuse tile obstruction, shared hex movement, targetable entity enumeration, and generic attack/death actions. Keep later multi-entity target priority and attack obstruction out.
- `duelyst/app/view/layers/game/GameLayer.js`, `duelyst/app/view/nodes/cards/TileNode.js`, `duelyst/app/view/nodes/cards/EntityNode.js` -- existing TileNode selection and targetable-entity stats support tile health/animations; verify Wall nodes surface attacks and health changes.
- `duelyst/test/unit/sdk/game/game_setup.js`, `duelyst/test/unit/sdk/game/board.js`, `duelyst/test/integration/misc/utils_game_session.js` -- setup, attack/destruction/movement, and snapshot/replay coverage.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/rulesets/hexTopology.coffee`, `duelyst/app/sdk/gameSetup.coffee`, `duelyst/app/sdk/cards/factory/misc/tiles.coffee` -- define the version 2 corner starts and nine Wall positions, then persist them using a dedicated neutral terrain factory and the supplied assets.
- [x] `duelyst/app/sdk/entities/movementRange.coffee` -- verified existing shared obstruction logic blocks Wall traversal/endpoints; lethal removal reopens the existing tile.
- [x] `duelyst/app/sdk/entities/attackRange.coffee`, `duelyst/app/sdk/entities/entity.coffee`, `duelyst/app/view/layers/game/GameLayer.js` -- verified existing target enumeration, attack resolution, and generic TileNode health rendering support Wall targets and visible HP changes.
- [x] `duelyst/test/unit/sdk/game/game_setup.js`, `duelyst/test/unit/sdk/game/board.js`, `duelyst/test/integration/misc/utils_game_session.js` -- verify placements, damage by both players, ordinary obstruction, destruction, tile retention, and damaged/destroyed replay state.

**Acceptance Criteria:**
- Given a new v2 match, when setup completes, then nine neutral 10-HP Walls occupy exactly the specified positions and no Wall appears at (2,0).
- Given a version 2 setup, when General positions are initialized, then the map-corner starts at (4,0) and (0,8) are used so no ordinary General begins on a living Wall.
- Given a living Wall, when either player makes an otherwise legal attack, then SDK resolution damages that Wall and UI stats reflect current HP without inheriting Bonechill Barrier effects.
- Given a living Wall, when an ordinary unit previews or attempts a route or endpoint through it, then shared movement preview and authoritative validation reject it.
- Given lethal damage, when Wall death resolves, then the Wall alone is removed, its underlying tile remains, and ordinary movement and otherwise legal summons can use that tile.
- Given a damaged or destroyed Wall, when the session is saved, reconstructed, or replayed, then Wall health/absence and tile presence remain consistent without duplicate deaths or Walls.
- Given a v1 or legacy match, when setup, attack, or movement runs, then prior map and rules remain unchanged.

## Implementation Notes

- Added a neutral, targetable 10-HP Wall Tile with Bonechill Barrier visual/audio assets and no inherited modifiers. Version 2 setup places exactly nine Walls and uses the documented corner General starts; version 1 and legacy setup remain unchanged.
- The runtime eligibility gate allows only ownerless, actionless Wall setup in version 2. Existing shared range/rendering paths cover movement, attacks, and HP display. Hex removal now passes axial coordinates to the existing removal path so lethal damage removes the Wall while retaining the static tile.
- Verification passed: `board.js` (56), `game_setup.js` (39), `card_eligibility.js` (7), and `utils_game_session.js` (10).

## Spec Change Log

## Review Triage Log

- **medium — patch:** The initial movement test exercised shared path preview but did not prove `ValidatorEntityAction` rejects a `MoveAction` onto a living Wall. The validator delegates to the same `MovementRange.getIsPositionValid` path; added an explicit validation assertion.
- **medium — patch:** No case proved a Wall-blocked spawn position becomes legal after destruction. `Board.isValidGeneralAdjacentSpawnPosition` checks the same obstruction and tile state; added before/after spawn checks and verified the removed Wall is no longer a valid attack target.
- **false:** UI stats coverage was claimed missing, but `TileNode` extends `EntityNode`, whose targetable-entity path creates a `StatsNode`; `StatsNode` reads the SDK entity's current HP and updates its label. The Wall is targetable, so the existing UI path applies without a Wall-specific code change.
- **low — patch:** Attack-range eligibility already rejects inactive targets, but the initial tests did not assert that after Wall death. Added a regression assertion that the removed Wall is no longer a valid target.
- **medium — patch:** The initial replay test only reconstructed initial setup and did not replay a Wall damage action. Added serialization, replay execution, and an HP assertion while retaining the destroyed-state snapshot checks.
- **false:** The setup test asserts exactly nine Walls and their exact rendered coordinates. `GameSession.applyCardToBoard` rejects off-board positions, so an invalid placement cannot be silently shifted and still satisfy those assertions.

## Design Notes

Walls use the existing `CardType.Tile` lane so terrain is stored separately from mobile Units and can share a coordinate with an eligible Unit in Story 2.6. The regular rendered board floor is a separate static map layer; therefore removing a Wall Tile entity must not mutate the versioned floor mask. Use the map-documented corner starts for version 2 so the Wall at (2,8) does not overlap the old version 1 General coordinate. The generic AttackRange path enumerates targetable entities; the normal hex attack obstruction pass remains for Story 2.7.

## Verification

**Commands:**
- Focused Mocha suites for setup, board movement/attacks, and game-session snapshot/replay -- expected: all pass.
- `git diff --check` in both repositories -- expected: no whitespace errors.
