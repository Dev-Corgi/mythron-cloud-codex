---
title: 'Story 4: Replace move and attack allowance with action points'
type: 'feature'
created: '2026-11-02'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'bddfe8f4cfab9b8e55d20591b36e402246fcd72f'
context:
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Units in Practice and Sandbox still use the legacy one-move/one-attack allowance, preventing flexible action combinations and leaving the exhausted state disconnected from a shared action budget.

**Approach:** Give each unit two action points per turn in `practice-sandbox-hex` version 2. Every explicit move and attack spends one point, and expose a shared spend method for active abilities in the next story. Refresh points at the owning player's turn start; ordinary newly summoned units have zero until that start.

## Boundaries & Constraints

**Always:** Apply action-point rules only to Practice/Sandbox ruleset version 2; preserve version 1, legacy, and other modes. An available unit starts its owner's turn with 2 points. Each explicit move, attack, or later active-ability use costs 1 point in any order or combination; implicit reactions do not consume an additional point. Zero points means exhausted and prevents another explicit action. A unit summoned during a turn starts at 0, is not refreshed at the opponent's turn start, and receives 2 at its owner's next turn start. Existing effects that explicitly refresh exhaustion restore the v2 unit to 2 points; effects that apply exhaustion reduce it to 0. Preserve the remaining points when transforming a unit, and serialize the remaining count with card state. Keep the existing exhausted indicator; add no AP display.

**Never:** Change old move/attack counters or ordering rules in legacy/version 1; add UI for points; implement active-ability lifecycle or use validation (Story 5); let an explicit automatic move/attack bypass the v2 action-point limit.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| TWO_MOVES | V2 unit begins with 2 AP and makes two legal moves | Both succeed; remaining AP is 0 and unit is exhausted | A third move is rejected |
| TWO_ATTACKS | V2 unit begins with 2 AP and makes two legal attacks | Both succeed; remaining AP is 0 | A third attack is rejected |
| MIXED_ORDER | V2 unit has 2 AP; moves and attacks in either order | Any two legal actions succeed, including attack then move | Third explicit action is rejected |
| TURN_REFRESH | Unit used one or both AP, then its owner's next turn starts | Points refresh to 2 and exhausted state clears | Opponent start does not refresh this unit |
| SUMMONED | Unit is summoned during its owner's turn | Starts at 0; opponent start leaves 0; owner's next start sets 2 | No explicit move/attack can act at 0 |
| OTHER_RULESETS | Legacy, v1, or another mode runs move/attack actions | Existing allowance and exhausted behavior remain | Existing validators still apply |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/entities/entity.coffee` -- `getCanMove`, `getCanAttack`, `getIsExhausted`, and exhaustion/counter setters gate actions; add a serializable AP field and shared query/spend API while retaining old branches.
- `duelyst/app/sdk/actions/moveAction.coffee`, `duelyst/app/sdk/actions/attackAction.coffee` -- consume one point for each explicit v2 action; implicit strikebacks and collateral attacks belong to their parent action.
- `duelyst/app/sdk/validators/validatorEntityAction.coffee` -- enforce AP availability for explicit moves and attacks, including automatic explicit actions; continue using existing legality checks.
- `duelyst/app/sdk/gameSession.coffee::p_startTurn` -- currently refreshes all entities; for v2 refresh only entities owned by the newly active player. Keep current loop for other rulesets.
- `duelyst/app/sdk/entities/unit.coffee::onApplyToBoard` -- ordinary summons already apply exhaustion; make that equivalent to 0 AP in v2.
- `duelyst/app/sdk/actions/setExhaustionAction.coffee`, `duelyst/app/sdk/modifiers/modifierTransformed.coffee`, and transform context call sites -- preserve AP through explicit exhaustion changes and transformations.
- `duelyst/test/unit/sdk/game/basic.js`, `duelyst/test/unit/sdk/game/game_active.js`, and `duelyst/test/unit/sdk/game/actions_validators.js` -- cover spending/order, owner-turn refresh, summoning delay, serialization/transform preservation, and legacy behavior.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/entities/entity.coffee` -- add version-gated AP state/query/spend methods, map exhaustion to 0 or 2, and make v2 availability independent of old move/attack caps.
- [x] `duelyst/app/sdk/actions/moveAction.coffee`, `duelyst/app/sdk/actions/attackAction.coffee`, `duelyst/app/sdk/validators/validatorEntityAction.coffee` -- charge and validate one AP per explicit action; keep implicit reactions free.
- [x] `duelyst/app/sdk/gameSession.coffee`, `duelyst/app/sdk/actions/setExhaustionAction.coffee`, `duelyst/app/sdk/modifiers/modifierTransformed.coffee` and relevant transform callers -- refresh only at owner start and preserve AP across summons, exhaustion effects, and transforms.
- [x] `duelyst/test/unit/sdk/game/basic.js`, `duelyst/test/unit/sdk/game/game_active.js`, `duelyst/test/unit/sdk/game/actions_validators.js` -- verify matrix, mix-and-match actions, refresh timing, state reconstruction, and unchanged legacy rules.

**Acceptance Criteria:**
- Given a ready v2 unit with 2 AP, when it performs any two legal moves and/or attacks in any order, then both actions succeed and its remaining points become 0.
- Given a v2 unit with 0 AP, when it attempts an explicit move or attack (including an automatic explicit action), then validation rejects it; implicit reactions consume no additional AP.
- Given a v2 unit has spent points, when its owner starts a turn, then it has 2 AP; an opponent's turn start does not refresh it.
- Given a unit is summoned during a turn, when it enters play, then it has 0 AP until its owner's next turn starts.
- Given a v2 unit is transformed or its exhaustion is explicitly refreshed/applied, when state is reconstructed or changed, then its AP and exhausted state remain consistent.
- Given a version 1, legacy, or other-mode match, when units move, attack, refresh, or exhaust, then the existing rules remain unchanged.

## Implementation Notes

- AP state and the per-turn spent marker are serialized; only Practice/Sandbox ruleset v2 reads or consumes them.
- Explicit moves/attacks spend AP while preserving the existing move/attack counters; implicit attack sub-actions remain free. AP exhaustion is enforced even for automatic explicit attacks.
- Rush/Pseudo Rush now distinguish a fresh summoned unit at 0 AP from a unit that has already spent both AP, without changing legacy counter checks.
- Owner-turn refresh, delayed summon readiness, explicit exhaustion effects, and transform state are covered by focused tests.

## Verification

**Commands:**
- `cd duelyst && ./node_modules/.bin/mocha -t 1000 test/unit/sdk/game/basic.js test/unit/sdk/game/game_active.js test/unit/sdk/game/actions_validators.js test/unit/sdk/game/unit_stats.js test/unit/sdk/game/board.js` -- 132 passing; includes AP matrix, ruleset v1 behavior, Story 3 area/ranged integration, serialization, summon timing, exhaustion actions, and transforms.

## Review Triage Log

- `false` — The spent marker's lifecycle was undocumented. The code resets it on owner-turn refresh and serializes it; spent-out card reconstruction now asserts both values.
- `false` — Summon entry paths were underspecified. Unit board application applies exhaustion in v2, and the summon-delay test confirms the 0-to-2 owner-turn sequence.
- `false` — The report questioned AP on later-cancelled actions. Explicit actions are charged only in their successful `_execute` path after validation and effect resolution; invalid actions leave the budget intact.
- `false` — The report requested a v2 strikeback-specific case. Hex v2 disables counterattacks; area child attacks exercise implicit collateral and leave only the parent AP charged.
- `patch` — Automatic moves at 0 AP lacked a check. Added an automatic move rejection assertion beside the automatic attack case; the focused suite passes.
- `patch` — Two explicit attacks did not assert the retained attack counter. Added the counter assertion; both attacks increment it while spending exactly two AP.
- `patch` — Owner-turn refresh only checked a newly summoned unit. The turn-lifecycle test now also checks that an active unit's 1 AP survives the opponent turn and refreshes to 2 on its owner's turn.
- `patch` — Explicit exhaustion action mapping was not directly covered. Added `SetExhaustionAction` and `RefreshExhaustionAction` coverage for 0 and 2 AP.
- `patch` — Transform coverage did not audit every caller. The audit found building completion passed no AP state; it now forwards the transformed unit's counters, AP, and spent marker, covered through `ModifierBuilding.transformSelf`.
- `patch` — Serialization only reconstructed a 1-AP state. Added reconstruction assertions at 0 AP with the spent marker set.
- `false` — The report requested extra non-v2 modes. V2 behavior is explicitly guarded by ruleset id and version; the v1 action test and existing default-legacy suite exercise the retained branches.
- `false` — Rush-path coverage applied modifiers directly. Both changed checks live in modifier activation; tests exercise the spent-out v2 state, while legacy mode continues to use the original counters.
- `patch` — Verification-gap report independently identified missing direct exhaustion-action coverage. Resolved by the same direct action-path test above; the filed evidence described the pre-patch gap.
