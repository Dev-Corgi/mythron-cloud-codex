---
title: 'Damage the disadvantaged General at both turn ends'
type: 'feature'
created: '2026-11-01'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
story_key: '2-9-damage-the-disadvantaged-general-at-both-turn-ends'
baseline_commit: 'be629093330322944935207e0ab18366d63b61fd'
outer_baseline_commit: 'be77cded7e774e81cf240212746e8559b2771e79'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/map-layout.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-8-capture-and-retain-methron-points.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Methron control has no turn-end consequence, so controlling more points does not pressure the opposing General.

**Approach:** At either player's turn end in `practice-sandbox-hex` version 2, finish end-turn effects and point captures first, then count all five points, including empty owned points. If counts differ, deal the player with fewer points damage to their General equal to twice the difference; equal counts deal none. Use the existing General damage and match-end behavior. Other rulesets and versions remain unchanged.

</frozen-after-approval>

## Boundaries & Constraints

**Always:** Run only for `practice-sandbox-hex` version 2. At both players' turn ends, queue scoring after all five existing capture actions and before `StartTurnAction`; calculate from live Methron tile owners when the scoring action executes. Count empty owned points, ignore neutral points, and deal `2 * abs(player1Count - player2Count)` damage to the General of the player with fewer points. Equal counts produce no damage. Use existing `DamageAction` and General death/match-end behavior. Keep scoring actions authorized, serializable, and deterministic.

**Never:** Change capture timing or ownership rules, reserve transfer, fixed hands, or other rulesets; add control damage to point occupants, mana effects, a Heart, a new victory condition, or separate persisted score state.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Control deficit | Either player's turn ends at 3–1 | The General belonging to the player with one point takes 4 damage | Resolve through the normal General damage path |
| Equal control | Both players control 2 points | Neither General takes deficit damage | Do not create a zero-damage action |
| Maximum deficit | One player controls 5 points and the other 0 | The disadvantaged General takes 10 damage | Existing lethal-damage handling applies |
| Capture during turn end | A living player unit occupies a neutral/opponent point after end-turn effects | Resolve capture first, then count and damage from updated owners | A unit removed before capture does not alter control |
| Empty owned points | One or more controlled points have no occupant | Each remains in its owner's count | Do not infer control from occupancy |
| Compatibility and replay | Legacy/v1 end, or a v2 turn is saved/restored/replayed | Legacy/v1 takes no deficit damage; v2 state and damage reproduce deterministically | Keep the existing ruleset identity and action reconstruction path |

## Code Map

- `duelyst/app/sdk/gameSession.coffee` -- `_endStep` queues captures before `StartTurnAction`; authorize and enqueue the new resolver after the capture loop so its execution observes the updated owners.
- `duelyst/app/sdk/actions/captureMethronPointAction.coffee` and `gameSession.coffee` authorization helpers -- reuse the one-shot authorization pattern so a forged explicit scoring action cannot cause damage outside the end-turn phase.
- `duelyst/app/sdk/actions/resolveMethronPointControlDamageAction.coffee` -- new replayable action that counts current Methron owners and queues damage only for a nonzero deficit.
- `duelyst/app/sdk/actions/actionFactory.coffee` and `duelyst/app/sdk.coffee` -- register and expose the resolver for action deserialization and tests.
- `duelyst/app/sdk/actions/damageAction.coffee` -- preserve normal damage modifiers, General death, and match-end handling; do not call `applyDamage` directly.
- `duelyst/test/integration/misc/utils_game_session.js` -- existing capture, death, replay, and reserve test conventions; add scoring examples, post-capture ordering, compatibility, and replay assertions.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/actions/resolveMethronPointControlDamageAction.coffee` -- add a version-2-only, one-shot-authorized action that counts all five live owner states when it executes and queues normal General damage for the deficit.
- [x] `duelyst/app/sdk/gameSession.coffee` -- enqueue the authorized resolver after point captures and before the next turn starts; leave turn-end reserve transfer and all other rulesets unchanged.
- [x] `duelyst/app/sdk/actions/actionFactory.coffee` and `duelyst/app/sdk.coffee` -- register/export the action so serialization and replay reconstruct it.
- [x] `duelyst/test/integration/misc/utils_game_session.js` -- cover both turn owners, 3–1/2–2/5–0, empty points, capture-before-score, General capture, lethal damage, legacy/v1 exclusion, snapshot/replay, and single reserve transfer.

**Acceptance Criteria:**
- Given either player's turn ends in v2, when end-turn effects and captures finish, then the player with fewer than five-point control count loses `2 * the count difference` Health from their General, including points they control while empty.
- Given 3–1, 2–2, or 5–0 ownership, when either player ends their turn, then damage is respectively 4 to the disadvantaged General, 0, or 10, independent of whose turn ended.
- Given a capture or death changes occupancy during end-turn effects, when scoring executes, then the post-capture live owner counts determine damage and a removed occupant cannot capture.
- Given deficit damage is lethal or the turn is saved/replayed, when normal action resolution runs, then the existing General death/match-end path is used and the restored/replayed result matches without changing reserve transfer or v1/legacy behavior.

## Review Triage Log

| Finding | Verdict and evidence |
|---------|----------------------|
| Blind Hunter: v1/legacy exclusion test leaves all Methron Points neutral | **false** — valid legacy and hex v1 setup does not create Methron Points, and both the end-turn scheduling and resolver guard require exact `practice-sandbox-hex` version 2; no valid v1/legacy turn can have the proposed control deficit. |
| Blind Hunter: replay coverage never replays the authorized resolver action | **false** — the restored v2 snapshot preserves point owners, and replaying `EndTurnAction` regenerates the one-shot authorization, resolver, and damage; the test also round-trips resolver deserialization through `ActionFactory`. |
| Blind Hunter: General capture behavior is not covered | **false** — `counts a point captured during the same turn-end before applying deficit damage` places player 1's General on a neutral point and asserts its ownership changes before scoring. |
| Blind Hunter: death before capture is not covered | **false** — the integration suite's `does not capture a point after an end-turn effect kills its regular Unit occupant` test verifies removal before the capture phase leaves the point neutral. |
| Blind Hunter: empty owned points are not explicitly shown to count | **medium** — added an assertion that all five points are unoccupied in the 3–1 deficit case before ending the turn; the disadvantaged General still takes 4 damage. Patched. |

## Implementation Notes

Repository investigation found the v2 capture phase in `duelyst/app/sdk/gameSession.coffee` inside `_endStep`, after queued end-turn effects and before turn advance. The first implementation experiment showed `executeAction` queues each capture for later resolution; counting immediately after enqueueing therefore misses newly captured points. The scoring action therefore calculates when it executes, queued after captures and before `StartTurnAction`. Implemented the one-shot authorization and serializable resolver, registered it in `ActionFactory`/SDK, and reused `DamageAction` for General damage and lethal match resolution. The integration coverage checks both deficit directions and turn owners, 3–1/2–2/5–0, same-turn capture, empty control, damage replay/restore, lethal damage, forged authorization, legacy/v1 exclusion, and single reserve transfer. The focused integration suite passed (28 tests); changed-file CoffeeLint, ESLint, and inner/outer `git diff --check` passed. Preserve fixed-hand behavior and existing v1/legacy paths; no other implementation risks remain.

## Design Notes

`executeAction` queues capture actions during `_endStep`; code immediately following the enqueue loop still sees pre-capture ownership. The scoring action must calculate counts in its own `_execute`, when it runs after the queued captures and before `StartTurnAction`.

## Verification

**Commands:**
- From `duelyst`: `npx mocha --exit -t 1000 test/integration/misc/utils_game_session.js` -- expected: all integration tests pass.
- From `duelyst`: changed-file CoffeeLint/ESLint and `git diff --check` -- expected: clean.
