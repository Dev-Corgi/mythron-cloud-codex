---
title: 'Face a Practice bot that evaluates Walls and routes'
type: 'feature'
created: '2026-11-01'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
story_key: '2-11-face-a-practice-bot-that-evaluates-walls-and-routes'
baseline_commit: '4a14b17f030f460d1f4456ba4c6d730f6dfa5697'
outer_baseline_commit: '40cf36fe50a012a4f9a43677ff91f64c8d97d8dd'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/map-layout.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-10-face-a-practice-bot-that-makes-legal-terrain-aware-actions.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-7-apply-wall-obstruction-consistently-to-attacks-and-area-effects.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Version 2 Practice AI can attack destructible Walls, but its evaluation does not value remaining Wall health or routes opened by destroying one. This can leave the bot attacking an irrelevant obstruction or ignoring a useful route.

**Approach:** Extend version 2 AI candidate scoring to account for Wall durability and the legal movement/attack opportunities after a candidate's resolved effect. Use shared SDK targeting, obstruction, and action resolution so co-located targets and hypothetical destruction match authoritative play, while keeping candidate evaluation isolated from live match state.

## Boundaries & Constraints

**Always:** Apply Wall tactical scoring only to `practice-sandbox-hex` version 2. Score the Wall's remaining health and grant route-opening value only when the candidate's actual resolved damage destroys it. A living Wall remains obstructing for ordinary movement; route evaluation after destruction uses shared board geometry and movement permissions. Direct attacks at a shared Wall/Unit position resolve to an enemy Unit first; do not create an AI Wall override. Eligible area attacks may evaluate the Wall and occupant independently and must respect shared intervening-Wall and supporting-Wall rules. Hypothetical damage, destruction, and occupancy never mutate the live match. Executing a selected action must match the evaluated SDK target and result. Preserve lethal-win priority, existing scalar difficulties, exact Practice roster, hand/mana contracts, and non-v2 behavior.

**Never:** Change SDK Wall health, targeting, movement, obstruction, or damage rules; treat a nonlethal Wall hit as an open route; duplicate hex attack/path geometry in AI; score a Wall attack against an enemy occupant; let route value override a winning action; change roster, difficulty, point-control policy, or other modes. Do not use the experimental `phase_ii_ai.js` search path in place of the production `StarterAI` flow.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Partial Wall damage | Candidate damage leaves Wall health above zero | Score remaining health but retain obstruction and award no newly opened route | Use actual resolved damage, including SDK modifiers |
| Wall destruction opens route | Lethal candidate hit removes a Wall blocking an ordinary Unit | Project the destroyed Wall as an open tile and score legal routes made reachable | Flying/phasing paths already available receive no duplicate route credit |
| Shared coordinate target | Enemy Unit occupies a Wall, or an area effect covers both | Direct attack scores the enemy Unit; eligible area attack scores each valid entity under shared obstruction rules | No Wall-override candidate; do not bypass intervening Walls |
| Winning action versus route | A winning attack competes with a route-opening Wall attack | Preserve winning action priority | Route score only breaks/changes non-winning comparisons |
| Candidate isolation and replay | Score a hypothetical Wall attack then compare with SDK execution/replay | Live HP, removal, occupancy, and paths remain unchanged during evaluation; executed result matches prediction | Discard isolated candidate state after comparison |

</frozen-after-approval>

## Code Map

- `duelyst/server/ai/starter_ai.js` -- production `StarterAI` action ordering; `_findAttackActionsForUnit`, `_findSortedFilteredAttackObjectivesAndScoresForUnit`, `_findMoveActionsForUnit`, and `_positionObjectiveAndScoreForUnitFromSourceToTargetPosition` are the integration points. Preserve lethal-first sequencing and use the SDK's already-resolved target.
- `duelyst/server/ai/scoring/utils/utils_findAttackObjectivesAndScoresForUnit.js` and `scoring/base/unit_damage.js` -- existing objective sorting and target damage bounty. Add Wall residual-health/route value without duplicating enemy Unit target priority or applying unit-only scoring assumptions to Tiles.
- `duelyst/app/sdk/actions/damageAction.coffee`, `app/sdk/modifiers/modifierWall.coffee`, `app/sdk/entities/attackRange.coffee`, `app/sdk/entities/movementRange.coffee`, and `app/sdk/board.coffee` -- authoritative damage/destruction, target priority, range/obstruction, and path rules. Use these as the simulation contract; do not alter them unless an observed SDK defect blocks this story.
- `duelyst/server/ai/phase_ii_ai.js` -- contains experimental branch/search code but is not the production Practice `StarterAI` route; do not route the feature through it.
- `duelyst/test/unit/sdk/ai/board_geometry.js` and `ai.js` -- deterministic v2 geometry, target, scoring, and selected-action fixture patterns. `duelyst/test/integration/misc/utils_game_session.js` -- Wall damage/destruction, co-location, serialization, and replay expectations.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/server/ai/scoring/utils/utils_scoreWallRouteBenefit.js` -- add a deterministic, isolated evaluation of residual Wall health and only those legal routes newly opened by the candidate's resolved destruction.
- [x] `duelyst/server/ai/starter_ai.js` and `duelyst/server/ai/scoring/utils/utils_findAttackObjectivesAndScoresForUnit.js` -- incorporate Wall durability and route benefit in version 2 target/action ranking while retaining SDK target priority, area-target independence, and lethal-first action ordering.
- [x] `duelyst/test/unit/sdk/ai/board_geometry.js`, `test/unit/sdk/ai/ai.js`, and `test/integration/misc/utils_game_session.js` -- cover partial/lethal Wall hits, route opening for ordinary versus special movement, shared-position direct and area targets, winning-action precedence, candidate-state isolation, and execution/replay consistency.

**Acceptance Criteria:**
- Given an attack candidate against a Wall, when its resolved damage is evaluated, then remaining health is valued and routes become available only after actual destruction.
- Given an intact Wall blocks an ordinary Unit, when route score is computed, then the route remains blocked; after hypothetical destruction, legal shared-SDK routes can affect deterministic candidate selection when alternatives have no combat or positional benefit.
- Given an enemy Unit shares the Wall position, when direct or eligible area attacks are evaluated, then direct targeting chooses the enemy Unit and area effects evaluate both independently under shared obstruction rules.
- Given a winning move competes with Wall destruction, when the bot selects its action, then the winning move takes priority.
- Given hypothetical Wall damage/destruction, when evaluation finishes and the chosen action executes/replays, then live state was not speculatively mutated and the actual target, Wall health, occupancy, and resulting routes match the shared SDK outcome.

## Implementation Notes

## Spec Change Log

## Review Triage Log

- **medium / patch — lethal-only Wall filtering:** The original exception retained every Wall when `allowOnlyLethalAttacks` was true, and `_findAttackActionsForUnit` could select that nonlethal target if no lethal target remained. Filtering now applies candidate attack damage to Walls too; regression verifies the nonlethal Wall is absent.
- **low / patch — candidate cleanup on setup errors:** Serialization or deserialization could throw before entering `finally`, leaving the candidate session unterminated. Setup now occurs inside the cleanup scope.
- **medium / patch — General Wall-filter coverage:** The changed General filter lacked proof it allows an isolated Wall target under the low-health counterattack guard. Added a version 2 fixture asserting the General objective includes that Wall.
- **false — damage without route opening:** Partial Wall damage is explicitly valued by the frozen intent and first acceptance criterion; route value remains gated on actual destruction.
- **false — candidate mutates live session:** Evaluation serializes into a new GameSession and executes only in that candidate; tests assert live Wall health/activity and integration checks execution/replay route parity.
- **false — unattackable or inactive Wall scoring:** StarterAI supplies the SDK's valid targets to this helper, so inactive, out-of-range, or otherwise invalid Walls do not reach scoring. The helper also returns zero for inactive candidate Walls.
- **false — route permissions and special movement:** Route deltas come from each unit's shared SDK MovementRange before and after destruction. Flying is excluded because it already ignores Wall obstruction; existing v2 geometry tests exercise Flying and ordinary movement.

## Design Notes

Wall damage only opens routes when resolved damage reaches its current health. A scoring candidate must therefore distinguish a damaged-but-living Wall from a destroyed Wall, and query legal movement on the resulting candidate state without temporarily changing the live Wall or board.

## Verification

**Commands:**
- From `duelyst`: focused AI Wall/route tests and `npx mocha --exit -t 1000 test/integration/misc/utils_game_session.js` -- expected: all relevant enabled tests pass.
- From both repositories: changed-file lint and `git diff --check` -- expected: clean.
