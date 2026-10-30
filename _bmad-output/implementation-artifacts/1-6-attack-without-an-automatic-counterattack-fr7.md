---
title: 'Attack without an automatic counterattack'
type: 'feature'
created: '2026-10-30'
status: 'done'
route: 'dispatch'
baseline_commit: '486758be062d3d9a21724622068f7f5cecf60cea'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/1-5-summon-beside-the-general-fr6.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** New-rules matches still generate the legacy defender strikeback after attacks, so attackers can take forced damage that the new combat rules do not allow.

**Approach:** Suppress automatic strikeback for `practice-sandbox-hex` at the shared SDK strikeback decision point. Keep the attack and its ordinary effects intact, and preserve the existing strikeback behavior in every legacy ruleset.

## Boundaries & Constraints

**Always:** A valid new-rules attack damages its target normally and creates no automatic return attack, whether the initiating attack is explicit or effect-driven and regardless of card or modifier exceptions. Prediction, authoritative resolution, action history, and replay must agree. Legacy rulesets retain their current strikeback behavior.

**Never:** Disable the attack itself, suppress unrelated attack effects, alter attack legality or damage calculation, remove strikeback behavior from legacy units, or change movement, summon, mana, or card eligibility rules.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|-----------------------------|----------------|
| Hex explicit attack | Valid adjacent attack between units with strikeback | Defender takes normal attack damage; no return attack is queued or applied | N/A |
| Hex effect-driven attack | Forced attack or modifier-driven attack against a unit with strikeback | The initiating attack resolves normally; defender creates no counterattack | N/A |
| Prediction and replay | Predict, serialize/replay, or authoritatively resolve the same hex attack | Same health result and no strikeback action in the action history | Invalid attack follows existing validation |
| Legacy attack | Valid legacy attack against a unit with strikeback | Existing return attack and damage remain available | N/A |

</frozen-after-approval>

## Code Map

- `app/sdk/modifiers/modifierStrikeback.coffee` -- `getIsActionRelevant` gates both `onBeforeAction` (immediate execution) and `onEntitiesInvolvedInAttack` (action-tree/prediction generation). Use this shared predicate for the ruleset condition so the two paths cannot diverge.
- `app/sdk/entities/unit.coffee` -- `onApplyModifiersForApplyToNewLocation` grants the inherent strikeback modifier to units. Keep this behavior so legacy units and existing modifier APIs remain unchanged.
- `app/sdk/entities/entity.coffee` -- `getEntitiesKilledByAttackOn` predicts outcomes by emitting the same `entities_involved_in_attack` event; no separate prediction rule should be added here.
- `app/sdk/actions/attackAction.coffee` -- attacks default to strikeback-allowed, while individual effects can suppress it. Preserve this flag and regular attack resolution; the new-rules gate must take precedence over card/modifier exceptions.
- `test/unit/sdk/game/basic.js` -- existing attack coverage asserts legacy strikeback damages both units. Add new-rules explicit and effect-driven cases that check damage, prediction, and action history while retaining the legacy assertion.
- `app/sdk/gameSession.coffee` and `app/sdk/actions/action.coffee` -- action trees and replay deserialize subactions. Reuse their existing serialization so a suppressed strikeback does not reappear in replay.

## Tasks & Acceptance

**Execution:**
- [x] `app/sdk/modifiers/modifierStrikeback.coffee` -- suppress strikeback relevance only for the new ruleset, including forced attacks, while retaining all existing legacy checks.
- [x] `test/unit/sdk/game/basic.js` -- verify normal attack damage without a hex return attack, no effect-driven exception, prediction/action-history agreement, and unchanged legacy strikeback behavior.
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- mark Story 1.6 in progress during implementation and review when complete.

**Acceptance Criteria:**
- Given a valid new-rules attack, when the attacker damages the defender, then no automatic strikeback action is generated and normal attack damage/effects resolve.
- Given client prediction, authoritative execution, or replay of the same new-rules attack, when combat resolves, then health and action history agree and no card or modifier creates a strikeback exception.
- Given a legacy attack that meets current strikeback conditions, when it resolves, then existing counterattack behavior remains available.

## Implementation Notes

## Spec Change Log

## Review Triage Log

- `false` — The shared predicate checks the ruleset ID as a literal. The project has no single exported ruleset ID constant, and existing hex logic across the SDK also compares the same ID directly, so the proposed centralization is not an available local convention or a defect in this change.
- `patch` — The original test only asserted that `getIsActionRelevant` rejects `ForcedAttackAction`; it did not execute that action. The test now executes a forced attack after restoring the initial match state and confirms the target takes normal damage while the source receives no strikeback; the focused test passed.
- `false` — The finding asks for a legacy regression assertion, but the existing first test in `basic.js` executes a valid legacy attack and asserts both units take 2 damage, directly covering preserved strikeback behavior.
- `patch` — The original hex test did not exercise the special implicit `ModifierBlastAttack` path. It now executes an implicit modifier-triggered attack against a unit with Strikeback, checks normal damage, and confirms there are no strikeback subactions; the focused test passed.
- `patch` — The original test inspected serialized action history without replaying it. It now snapshots the pre-attack session, serializes the resolved attack, restores the snapshot, deserializes and executes the attack, then verifies target/source health and the absence of strikeback in the replay tree; the focused test passed.
- `false` — A reviewer said the Blast target lacked Strikeback, but `Unit.onApplyModifiersForApplyToNewLocation` grants `ModifierStrikeback` to every unit on the authoritative board. The test's Windblade Adept has the inherent modifier, so the no-counterattack assertion exercises the relevant behavior.
- `false` — A reviewer requested an additional legacy explicit-attack assertion, but the existing first `basic.js` test already executes a legacy Windblade Adept attack and confirms both units take 2 damage.
- `false` — The test's replay assertions are now performed after restoring the pre-attack session and executing the deserialized action. It verifies the replayed target damage, unchanged source damage, and absence of strikeback subactions.
- `false` — The prediction check uses an attacker at 1 damage with 3 maximum HP and a 2-ATK defender; a strikeback would be lethal and would include the attacker in `predictedKills`. The assertion therefore distinguishes prediction with and without strikeback.
- `false` — The forced-attack test runs through `executeActionWithoutValidation`, which intentionally bypasses attack legality/exhaustion checks; source exhaustion from the earlier explicit attack cannot prevent the forced action or mask strikeback resolution.
- `false` — Requests for future ruleset capabilities/constants and for a second blast target do not identify a current failure in the scoped rule. The SDK compares the same hex ruleset ID directly throughout, and the tested implicit attack uses the same shared predicate for each affected target.
- `false` — A reviewer said the implicit blast test manually constructs a collateral action, but that description does not apply to the current focused regression: it constructs one implicit attack to exercise the modifier-triggered predicate and does not claim to test collateral action generation.
- `false` — A reviewer asked that forced attacks still counterattack in the legacy ruleset. The shared predicate retains its original `ForcedAttackAction` condition outside the hex early return, and existing legacy strikeback execution coverage remains unchanged.
- `false` — A reviewer suggested centralizing the ruleset ID to support hypothetical future rulesets that disable strikeback. The captured intent only names `practice-sandbox-hex`, and the repository uses direct comparisons to that same ID throughout its SDK; no current behavior is broken.
- `false` — A reviewer requested direct action-tree prediction assertions. `getEntitiesKilledByAttackOn` emits `entities_involved_in_attack`, builds and drains implicit subactions, then reports predicted kills; the test makes the defender's 2-damage strikeback lethal and asserts the attacker is absent from predicted kills.
- `false` — A reviewer said the forced attack may be masked by attacker exhaustion. The test deliberately executes a `ForcedAttackAction` through `UtilsSDK.executeActionWithoutValidation`, so exhaustion and ordinary attack legality do not gate the action; the damage assertions verify its strikeback result.
- `low` — A reviewer requested a second hex Blast target. This would add a more elaborate effect fixture but would not exercise a different strikeback decision: each implicit target attack consults the same shared predicate, and the primary implicit Blast path is covered. Rejected as low value relative to the added test setup.
- `false` — A reviewer asked that Blast collateral generation be exercised naturally. The current test is intentionally scoped to a single implicit modifier-triggered attack against a Strikeback unit; it no longer constructs or asserts a collateral action, so the finding's description does not match the current test.
- `false` — A reviewer again requested default-ruleset strikeback coverage. The unchanged legacy attack test in `basic.js` proves the defender returns 2 damage, while the shared predicate's original legacy branch remains intact.

## Design Notes

Both authoritative return-attack execution and predicted implicit actions consult `ModifierStrikeback.getIsActionRelevant`. A ruleset gate at this shared predicate prevents generated actions on every path without removing the inherent modifier or changing attack resolution.

## Verification

**Results:** The complete `basic.js` suite passes (34 tests). The changed CoffeeScript compiles, CoffeeLint reports 0 errors and 0 warnings with only the repository's CRLF line-ending rule ignored, and `git diff --check` is clean. Three independent review layers completed; actionable verification gaps and coverage improvements were fixed, and no findings remain deferred.

**Commands:**
- `node_modules/.bin/mocha --no-config --require coffeescript/register --timeout 10000 --exit test/unit/sdk/game/basic.js` -- expected: focused attack and legacy regression tests pass.
- `node_modules/.bin/coffee --compile --print app/sdk/modifiers/modifierStrikeback.coffee` -- expected: changed CoffeeScript compiles.
- `node_modules/.bin/coffeelint` on the changed CoffeeScript file with only the checkout's CRLF line-ending rule disabled -- expected: no other lint errors.
- `git diff --check` -- expected: clean diff.
