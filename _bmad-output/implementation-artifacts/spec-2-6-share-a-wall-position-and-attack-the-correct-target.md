---
title: 'Share a Wall position and attack the correct target'
type: 'feature'
created: '2026-11-01'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
story_key: '2-6-share-a-wall-position-and-attack-the-correct-target'
baseline_commit: '9941fb5a9e83f7dde59084af73af13d9adc2ec92'
outer_baseline_commit: '1d46105d581035e3ec87b516257929750b55f131'
context:
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/map-layout.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-5-attack-neutral-walls-and-open-their-tiles.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-4-traverse-and-occupy-holes-according-to-unit-movement.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A living Wall is currently an exclusive movement obstruction and direct target, so a special-movement unit cannot stand on it and an attack can select the wrong co-located entity. This prevents the replacement map's Wall occupancy and combat priority rules from working consistently.

**Approach:** Let the existing Flying movement capability cross and end on a living Wall while keeping the Wall and Unit as separate board entities. Resolve direct attacks through one shared priority rule, and make eligible area damage, UI previews, AI choices, snapshots, and replay preserve both identities and their independent state.

## Boundaries & Constraints

**Always:** Apply only to `practice-sandbox-hex` version 2. Reuse `ModifierFlying` as the existing flying/phasing permission. Enemy Unit occupants take direct melee/ranged priority over the Wall; an allied occupant is skipped so the neutral Wall can be attacked when legal; a tile with only an allied Unit cannot be directly attacked. Explicit Wall targets cannot bypass enemy-occupant priority. Area damage excludes allied Units and may damage eligible enemy Units and neutral Walls independently, including both at one position, subject to each effect's existing radius and target conditions. Removing either entity preserves the other and the physical tile. Keep Wall/Unit identity, health, occupancy, and target resolution consistent in saves and replay.

**Never:** Permit ordinary Units to cross or end on living Walls, or let movement permission alter summon legality. Add a separate Phasing modifier. Change version 1/legacy behavior, Wall setup/health, map geometry, or entity identity. Rework intervening-Wall ranged/area obstruction, six-axis ranged geometry, or explosion-segment geometry; Story 2.7 owns those rules. Do not broaden effects explicitly limited to minions or another target type.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Wall movement | Flying Unit routes through or ends on a living Wall | Move is valid; Unit and Wall remain separately addressable at that coordinate | Ordinary Unit and summon restrictions remain unchanged |
| Direct targeting | Enemy Unit and Wall share a position | Enemy Unit is the only resolved direct target, even when the Wall was explicitly supplied | Stale target identity/position is rejected or revalidated through the same priority |
| Allied occupant | Allied Unit shares a Wall, or occupies a tile alone | Wall can be targeted when otherwise legal; allied Unit is never a direct target | No legal target when the tile has only an allied Unit |
| Area damage | Eligible enemy Unit, ally, and Wall share or neighbor an effect position | Apply damage independently to eligible enemy Unit and Wall; exclude allied Units | Preserve effect-specific radius/target filters and defer obstruction geometry to Story 2.7 |
| Removal and replay | Remove either member, save/restore, or replay a co-located action | Surviving entity keeps its identity, HP, coordinate, and Wall/tile relationship | Reject or revalidate stale target references; never duplicate or damage an unintended entity |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/board.coffee` -- `getEntitiesAtPosition` exposes Unit and Tile separately; `getEntityAtPosition` is Unit-first. Reuse the separate lanes and entity-radius lookup for co-location and area candidates without changing map storage.
- `duelyst/app/sdk/entities/movementRange.coffee` and `duelyst/app/sdk/validators/validatorEntityAction.coffee` -- v2 BFS already lets Flying traverse obstructions, but omits obstructed endpoints. Add the Wall endpoint exception to shared preview/validation. Preserve hole behavior and use `validatorApplyCardToBoard.coffee` as the separate summon gate.
- `duelyst/app/sdk/entities/attackRange.coffee`, `duelyst/app/sdk/entities/entity.coffee`, and `duelyst/app/sdk/actions/attackAction.coffee` -- attack targets are currently enumerated independently and validated by position; `actionAttackEntityAtPosition` uses Unit-first lookup. Add a shared canonical target resolver and enforce target identity/priority before resolution.
- `duelyst/app/view/layers/game/GameLayer.js` and `duelyst/app/view/Player.js` -- attack hover/click is Unit-first; attackable previews iterate SDK valid targets. Use the SDK's canonical targets for cursor, preview, selection, and action creation.
- `duelyst/server/ai/starter_ai.js` -- `_findSortedFilteredAttackObjectivesAndScoresForUnit` consumes `AttackRange.getValidTargets`; verify scoring handles Walls and that AI cannot choose a lower-priority co-located Wall.
- `duelyst/app/sdk/modifiers/modifierOpeningGambitDamageNearby.coffee`, `modifierDyingWishDamageNearbyEnemies.coffee`, and related damage-area effects -- preserve each effect's area and target conditions while including eligible Walls as separate candidates and excluding allied Units under version 2.
- `duelyst/app/sdk/gameSession.coffee`, `duelyst/app/sdk/gameSetup.coffee`, `duelyst/test/unit/sdk/game/board.js`, `duelyst/test/unit/sdk/ai/board_geometry.js`, and `duelyst/test/integration/misc/utils_game_session.js` -- reuse existing card/action serialization and setup restoration; add movement, target priority, area damage, independent removal, and replay coverage.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/entities/movementRange.coffee`, `duelyst/app/sdk/board.coffee`, and `duelyst/app/sdk/validators/validatorEntityAction.coffee` -- allow only Flying Units to end on living Walls while retaining separate entities and ordinary/summon restrictions.
- [x] `duelyst/app/sdk/entities/attackRange.coffee`, `duelyst/app/sdk/entities/entity.coffee`, `duelyst/app/sdk/actions/attackAction.coffee`, and `duelyst/app/sdk/validators/validatorEntityAction.coffee` -- centralize target priority and revalidate direct target identity for SDK prediction and execution.
- [x] `duelyst/app/view/layers/game/GameLayer.js`, `duelyst/app/view/Player.js`, and `duelyst/server/ai/starter_ai.js` -- make attack preview, selection, and AI candidates follow the shared target resolver.
- [x] `duelyst/app/sdk/modifiers/` area-damage effects -- apply existing eligible area conditions to Units and Walls independently while excluding allied Units; preserve explicitly type-limited effects.
- [x] `duelyst/test/unit/sdk/game/board.js`, `duelyst/test/unit/sdk/ai/board_geometry.js`, and `duelyst/test/integration/misc/utils_game_session.js` -- cover special movement, summon separation, direct target priority, area ally exclusion, independent removal, and save/replay consistency.

**Acceptance Criteria:**
- Given a Flying Unit and living Wall, when an otherwise legal move crosses or ends on the Wall, then the action succeeds and both entities remain at that coordinate; ordinary movement and summon legality are unchanged.
- Given a Wall position occupied by an enemy Unit, when a direct melee/ranged attack is requested against the position or Wall, then the enemy Unit is the resolved target across preview, SDK validation, execution, AI, and replay.
- Given a Wall under an allied Unit, when a direct attack is requested, then the Wall can be attacked when legal and the ally is skipped; without a Wall, the allied Unit cannot be attacked.
- Given an eligible area effect, when enemy Units and neutral Walls are in range, then each eligible entity receives its own damage, including both co-located entities, and allied Units receive none.
- Given either co-located entity is removed, when the action resolves, then the other entity and tile remain unchanged; save, restore, and replay preserve both identities, health, position, and target priority.

## Implementation Notes

The SDK already keeps Units and Tiles in separate board lanes, so Story 2.6 adds no board storage or identity changes. Flying-only Wall endpoints remain distinct from traversal and summon checks. Direct attacks use the canonical v2 target selected by position; area effects retain their own radius and type rules.

Review follow-up added UI path assertions, Dying Wish area coverage, Wall crossing/ordinary movement and summon checks, allied-only target rejection, neighboring Wall damage, and version 1 regression coverage. Focused suites passed: board 59, practice UI 13, AI geometry 2, and session persistence/replay 11. CoffeeScript compilation, GameLayer syntax, and `git diff --check` passed.

## Spec Change Log

## Review Triage Log

| Finding | Verdict / Evidence | Route / Resolution |
|---------|-------------------|--------------------|
| Blind review: Dying Wish Wall candidate lacked coverage | patch — added a neighboring enemy Unit and Wall damage test with allied Unit exclusion. | patch — test added and passed in board suite. |
| Blind review: Flying summon legality on Walls lacked coverage | patch — `isValidGeneralAdjacentSpawnPosition` is asserted false while a Wall is alive and true after its removal. | patch — test added and passed in board suite. |
| Blind review: ordinary Wall rejection and Flying Wall traversal lacked complete coverage | patch — asserts ordinary route/endpoint rejection and Flying route through the living Wall; integration also executes the Flying Wall endpoint move. | patch — tests added/confirmed and passed. |
| Blind review: replay test disables validators and thus does not verify stale target rejection | false — replay restores and executes a serialized Unit target; a separate validator test explicitly supplies the co-located Wall while an enemy Unit has priority and confirms rejection. The spec requires replay to preserve target priority and stale references to be rejected or revalidated, not that a replay pipeline re-run interactive validators. | reject — no code change. |
| Blind review: an allied-only tile lacked direct-target rejection coverage | patch — verifies an allied Unit without a Wall is neither a valid target nor returned by the position resolver. | patch — test added and passed in board suite. |
| Blind review: area coverage lacked an adjacent Wall case | patch — added a neighboring Wall within Opening Gambit's existing radius and asserted it is queued alongside eligible targets. | patch — test added and passed in board suite. |
| Blind review: version 1 preservation lacked regression coverage | patch — added version 1 Wall movement rejection and legacy enemy Unit target acceptance assertions. | patch — test added and passed in board suite. |
| Verification-gap review: changed GameLayer hover/click target paths lacked UI assertions | patch — tests execute the production hover and click methods for enemy Unit priority and Wall-under-ally targeting. | patch — test added and passed in practice UI suite. |
| Verification-gap review: Dying Wish Wall damage lacked verification | patch — same missing coverage as the blind-review Dying Wish finding; the new test checks enemy Unit/Wall damage and allied exclusion. | patch — test added and passed in board suite. |

## Design Notes

Use two entity lanes at a shared axial position. The attack resolver must return one direct target by team-aware priority: enemy Unit first; otherwise the neutral Wall when present; otherwise the Unit/Tile candidate, which normal legality may reject. Area effects use independent candidates, so direct-target priority must not collapse a co-located pair into one damage target. Movement permission and summon validation stay separate.

## Verification

**Commands:**
- Focused board, AI target, and persistence/replay suites -- expected: all pass.
- `git diff --check` in both repositories -- expected: no whitespace errors.
