---
title: 'Story 3: Enemy units block ranged attacks'
type: 'feature'
created: '2026-11-04'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
baseline_commit: 'a5f1cd79e6285bbccb184bc0e57c0adf4d251eaa'
context:
  - '../../specs/spec-duelyst-action-model-rush/stories/3-enemy-units-block-ranged-attacks.md'
  - '../../planning-artifacts/architecture/architecture-duelyst-2026-10-30/ARCHITECTURE-SPINE.md'
  - '../../specs/spec-practice-sandbox-map/map-layout.md'
---

<frozen-after-approval reason="human-owned intent — approved in the invocation">

## Intent

**Problem:** In Practice/Sandbox v2, ranged attacks can currently pass through enemy units to hit targets behind them.

**Approach:** Treat active enemy units, including Generals, as ranged obstructions using the shared resolver's existing Wall center and adjacent-center-link tests. Keep allied units transparent, exclude origin and target positions from self-obstruction, and preserve Wall-only geometry for Behold plus the existing lobbed and area rules.

</frozen-after-approval>

## Implementation Notes

- Updated only the ranged delivery path in `hexAttackGeometry`; Behold continues to use the original Wall-only predicate, while lobbed and area paths remain on their existing logic.
- The shared blocker geometry now applies the existing strict tile-center and adjacent-obstructor center-link tests to active enemy Units and Walls, excluding origin/target positions. AttackRange target lists, preview positions, AI target queries, validators and replay therefore consume the same decision.
- Added geometry tests for direct enemy blocking, transparent allied units, endpoint self-exclusion, enemy Generals, unit-unit and Wall-unit adjacent links, edge clipping, Behold, Wall target support, and unchanged lobbed/area behavior.
- Focused verification passed: `mocha -t 10000 --reporter dot test/unit/sdk/game/hex_attack_geometry.js` (28 passing). Full `npm test` still aborts before loading tests because legacy `require-dir` reads missing `module.parent.filename` under Node 22; this is the same existing runner limitation from prior stories.

## Review Triage Log

- false — The review noted that the implementation spec does not restate the direct enemy center-line acceptance case; the linked source story remains in `context`, and the new center-line test verifies the nearest enemy remains targetable while the unit behind it is blocked.
- false — The review noted that allied transparency was not restated; the linked source story specifies it and the test confirms a unit behind an allied blocker remains targetable.
- false — The review noted target-tile self-blocking was not restated; the linked source story specifies it and the test confirms the enemy blocker itself remains a legal target.
- false — The review noted the adjacent-obstructor and clip rules were not restated; the linked source story specifies both, and tests exercise unit-unit and Wall-unit links plus a single edge-clipping unit.
- false — The review noted General blocking was not restated; the linked source story specifies Generals, and the test puts the enemy General between the attacker and target.
- false — The review noted Wall-under-target behavior was not restated; that behavior remains covered by the existing ranged Wall-support test and the shared geometry excludes endpoint Walls.
- false — The review noted lobbed/area preservation was not restated; the linked source story specifies both and their existing tests pass because `canDeliver` only applies the new branch to `ranged`.
- false — The review noted Behold's Wall-only contract was not restated; the linked source story includes it, Behold still calls the Wall-only resolver, and its test verifies an intervening enemy does not block selection.
- false — The review noted shared targeting/preview/AI/replay consistency was not restated; AttackRange owns `getValidTargets` and preview positions, the AI calls that API, and `ValidatorEntityAction` validates through it; the integration test checks target lists, preview positions, and rejection of the blocked attack.
- false — The review noted that the source story's test matrix was absent from this compact oneshot spec; the story remains a context input and `hex_attack_geometry.js` covers its enumerated cases.
- patch — Review found implementation notes empty; added the resolver decision, test coverage, and full-suite limitation after completing verification.

