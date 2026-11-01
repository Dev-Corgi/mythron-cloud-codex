---
title: 'Face a Practice bot that makes legal terrain-aware actions'
type: 'feature'
created: '2026-11-01'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
story_key: '2-10-face-a-practice-bot-that-makes-legal-terrain-aware-actions'
baseline_commit: 'd00046aa34a5ba6616d1898d8e5bb2cdbe59b930'
outer_baseline_commit: 'f7e839510d3c90fab4c1a9e232d396aa90eb42b9'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/map-layout.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-9-damage-the-disadvantaged-general-at-both-turn-ends.md'
  - '{project-root}/_bmad-output/implementation-artifacts/1-10-enter-matches-with-valid-decks-and-the-fixed-practice-bot-fr.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Practice AI must act on the version 2 replacement battlefield, but a General-adjacent hole can currently be offered as a summon location because shared summon legality filters obstruction without checking that a rendered tile exists. More broadly, the bot must use the same terrain, target, and action legality as authoritative play to avoid invalid turns.

**Approach:** Make Practice AI candidate generation and execution rely on shared SDK legality for version 2 terrain. Correct shared General-adjacent summon generation and authoritative validation so holes never become summonable merely because they are addressable or a unit can traverse them; preserve movement-type exceptions only for movement. Verify representative bot turns, difficulty compatibility, fixed roster/hand, and deterministic action replay.

## Boundaries & Constraints

**Always:** Version-2 Practice AI uses shared row-staggered six-neighbor geometry, valid row bounds, movement ranges, terrain obstruction, target identity/priority, and action validators. Ordinary units cannot traverse or stop on holes or living Walls; eligible flying and phasing units may. Summoning remains limited to otherwise legal physical General-adjacent tiles regardless of movement permissions. Use existing SDK Action constructors and action flow, including its legal EndTurn fallback. Preserve current scalar difficulty behavior, approved General plus exact eight-card roster, eight stable hand slots, and deterministic snapshot/replay behavior. Apply terrain-specific behavior only to the version-2 ruleset; preserve legacy and version-1 behavior.

**Never:** Add square-grid candidate offsets or coordinate-only target assumptions; let movement permission grant summon permission; change the roster, difficulty model, map, or combat/tactical scoring policy; implement Story 2.11 Wall-route tactics or Story 2.12 point-control strategy; bypass authoritative validation or introduce a separate AI geometry/rules model.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Hole summon candidate | A candidate lies in a logical hole adjacent to the General | Shared summon candidates and authoritative validation reject it for ordinary, flying, and phasing cards | Bot chooses another legal action or ends turn through existing flow |
| Movement by terrain type | Version-2 ordinary, flying, and phasing units consider holes and living Walls | Ordinary path/end candidates exclude them; eligible special movement may cross/end there | Invalid candidates are never emitted |
| No available action | Active bot has no legal move, summon, or attack | Existing legal EndTurn is returned without repeated invalid submissions | Clear/recompute invalid candidates and use existing fallback |
| Replay legality | Bot performs representative actions in a version-2 match at each existing difficulty | Every chosen action validates; restored/replayed outcomes match, exact roster and stable hand slots persist | Preserve existing action serialization and match identity |

</frozen-after-approval>

## Code Map

- `duelyst/server/ai/starter_ai.js` -- `nextActionForActiveGame`, `_findNextActions`, `_findPlayCardActionsForCard`, `_findMoveActionsForUnit`, and attack objective generation; reuse SDK action constructors, `getValidTargetPositions`, shared movement/attack ranges, `_getActionPositionArgs`, and existing invalid-action/EndTurn fallback. Do not replace scalar difficulty or route v2 Practice through legacy difficulty-tiered deck selection.
- `duelyst/app/sdk/board.coffee` -- `getValidGeneralAdjacentSpawnPositions` uses hex neighbors but currently only checks obstruction; require an actual tile for summons without removing addressable hole positions from general geometry.
- `duelyst/app/sdk/validators/validatorApplyCardToBoard.coffee` -- shared authoritative summon placement validation; enforce the same physical-tile restriction as candidate generation and retain other rulesets' behavior.
- `duelyst/app/sdk/rulesets/hexTopology.coffee`, `app/sdk/entities/movementRange.coffee`, `app/sdk/entities/attackRange.coffee`, and `app/sdk/validators/validatorEntityAction.coffee` -- existing shared geometry and terrain legality; extend only where an observed mismatch exists, avoiding duplicate AI rules.
- `duelyst/test/unit/sdk/ai/ai.js`, `test/unit/sdk/ai/board_geometry.js`, and `test/unit/sdk/game/board.js` -- AI, terrain, and board test conventions; add candidate and validator assertions for all movement classes, attack target identity/obstruction, and no-action fallback.
- `duelyst/test/integration/misc/utils_game_session.js` -- session execution and action replay conventions for representative v2 Practice turns. `server/lib/create_single_player_game.coffee` and `app/sdk/cardEligibility.coffee` hold fixed roster setup; verify compatibility without altering setup.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/board.coffee`, `duelyst/app/common/utils/utils_game_session.coffee`, and `duelyst/app/sdk/validators/validatorApplyCardToBoard.coffee` -- require a physical tile for v2 summon candidate generation and validation, including effect/random spawn helpers, preserving legacy/v1 semantics and distinction from movement eligibility.
- [x] `duelyst/server/ai/starter_ai.js` -- confirmed v2 Practice move, summon, and attack candidates already use shared SDK legality and existing actions/fallback; no separate AI rules or tactical scoring were needed.
- [x] `duelyst/test/unit/sdk/ai/board_geometry.js`, `test/unit/sdk/game/board.js`, and `test/integration/misc/utils_game_session.js` -- cover movement classes, summon rejection through hand/random/spawn paths, version 1 compatibility, missing-card validation, no-action termination, representative difficulties, and serialized action restoration.

**Acceptance Criteria:**
- Given the version 2 replacement map, when Practice AI generates movement, summon, or attack choices, then shared SDK geometry and validators reject off-board, hole, obstructed, unreachable, and incorrectly identified targets.
- Given ordinary, flying, or phasing units, when movement or summon positions are considered, then movement permissions follow terrain rules and none of those permissions makes a hole a legal summon tile.
- Given no legal non-ending action, when the bot selects an action, then it returns the existing legal EndTurn without repeating invalid submissions or stalling.
- Given each existing Practice difficulty, when a version 2 match runs and is replayed, then every selected action validates and the approved General, exact eight-card roster, stable hand slots, and deterministic outcome are preserved.

## Implementation Notes

The first pass exposed a version-2 hole in General-adjacent candidate generation and authoritative card placement. Review also found that random/effect spawn helpers could still suggest addressable holes and that random-play actions skip the generic obstruction validator. The fix now rejects v2 Unit hole placements for all apply-action variants and excludes those holes from shared smart spawn candidates. Movement permissions remain separate. The existing StarterAI already consumes shared SDK movement, summon, and attack contracts, so no divergent AI geometry or tactical policy was introduced. A review guard also handles missing card data without throwing.

## Spec Change Log

## Review Triage Log

| Finding | Verdict and evidence |
|---------|----------------------|
| Blind Hunter: random/effect Unit placement bypassed the validator's original random-action exclusion and shared smart spawn candidates included v2 holes | **medium — patch** — `RandomPlayCardSilentlyAction` was explicitly skipped by `ValidatorApplyCardToBoard`, and the hex smart-spawn helper only checked obstruction. Added physical-tile filtering to the shared helper and applied v2 Unit hole validation to all apply actions; regression tests cover both paths. |
| Blind Hunter: version 1 compatibility assertion covered candidates but not authoritative action validation | **low — patch** — the previous test did not prove a v1 hole placement remained accepted by the action validator. Added a valid version 1 `PlayCardAction` validation assertion. |
| Edge Case Hunter: missing resolvable card could throw when the new guard reads its type | **medium — patch** — a valid apply action with absent card data reached `card.getType()` before any null guard. The validator now invalidates the missing card and a test verifies it does not throw. |

## Verification

**Commands:**
- From `duelyst`: `npx mocha --exit -t 1000 test/unit/sdk/game/board.js test/unit/sdk/ai/board_geometry.js test/unit/sdk/ai/ai.js` -- passed, 95 tests.
- From `duelyst`: `npx mocha --exit -t 1000 test/integration/misc/utils_game_session.js --grep "each representative difficulty"` -- passed, covering five scalar difficulty representatives and action serialization/restoration.
- From `duelyst`: `npx mocha --exit -t 1000 test/integration/misc/utils_game_session.js` -- passed, 29 tests.
- From `duelyst`: CoffeeLint on the three changed CoffeeScript files using repository rules with only the existing line-ending rule ignored -- passed.
- From `duelyst`: ESLint on the three changed JavaScript tests with ES2020 parsing and the existing `no-confusing-arrow` baseline issue ignored -- passed.
- From both repositories: `git diff --check` -- passed.
