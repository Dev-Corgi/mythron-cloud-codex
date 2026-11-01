---
title: 'Apply Wall obstruction consistently to attacks and area effects'
type: 'feature'
created: '2026-11-01'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
story_key: '2-7-apply-wall-obstruction-consistently-to-attacks-and-area-effe'
baseline_commit: 'c026d2b76d26180fd928b9c3b97a36cd55740351'
outer_baseline_commit: 'e080798110834a219ec06380ba684a590962708d'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/map-layout.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-6-share-a-wall-position-and-attack-the-correct-target.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Version 2 recognizes Wall occupancy and direct-target priority, but attack and area-effect geometry still accepts positions without one consistent Wall obstruction rule. Ranged attacks also include off-axis targets, while rounded hex-line sampling cannot distinguish a Wall-interior crossing from boundary-only contact.

**Approach:** Add shared axial geometry for six-axis ranged attacks and exact Wall-interior segment checks. Use it for SDK attack legality and eligible area-effect delivery so previews, authoritative play, Sandbox, AI, and replay agree.

## Boundaries & Constraints

**Always:** Apply these combat rules only to `practice-sandbox-hex` version 2; keep version 1 and other modes unchanged. Ranged targets must lie on one of the six center-to-center hex axes and within reach. An intervening Wall blocks a ranged attack. Melee and ranged attacks against a Unit on a Wall ignore that target-supporting Wall but remain blocked by any other intervening Wall. Area candidates use an effect-specific circular hex-distance radius measured from the explosion center, may be off-axis, and are delivered along the direct center-to-target-center segment without detours. A Wall blocks area delivery only when the open segment enters its hex interior; boundary-only and vertex-only contact do not block. Exclude the target-supporting Wall from obstruction. Preserve existing effect target types, team filters, legal range, and allied-damage exclusions. Keep Maw's v2 six-neighbor follow-up selection and apply shared geometry to eligible effects.

**Never:** Approximate area obstruction with rounded centerline cells, route around Walls, let a target-supporting Wall shield its Unit, impose caster-to-explosion-center distance as the area radius, or change map coordinates, movement, direct-target priority, Wall state, version 1 behavior, or unrelated type-limited effects.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|----------------------------|----------------|
| Ranged axis | In-range target on an axial axis, with or without an intervening Wall | Clear axis is valid; a Wall interior on that axis blocks; off-axis target is invalid | UI, SDK, authoritative validation, AI, and replay agree |
| Supporting Wall | Target Unit shares a Wall; optionally another Wall lies between source and target | Supporting Wall does not block; the distinct intervening Wall does | Do not alter Story 2.6 enemy-Unit-first target resolution |
| Area delivery | Explosion center, radius R, and on/off-axis candidates | Include candidates within hex distance R; test each direct segment from the center | R is independent of caster-to-center distance; do not detour around Walls |
| Segment boundary | Direct segment crosses Wall interior, or touches only an edge/vertex | Interior crossing blocks; boundary/vertex-only contact remains clear | Use deterministic shared geometry, including odd/even rendered rows and board holes |
| Eligible follow-up | Maw's adjacent follow-up targets a Unit on/near a Wall | Keep six-neighbor targeting and apply the supporting/intervening Wall rule | Preserve Unit target type and other follow-up legality |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/rulesets/hexTopology.coffee` -- owns axial coordinates, distance, neighbors, and a rounded `getLine`; add a reusable segment-versus-hex-interior primitive here. Do not alter rendered coordinates or map layout.
- `duelyst/app/sdk/entities/attackRange.coffee` and `duelyst/app/sdk/entities/entity.coffee` -- v2 range checks currently use distance and optional sampled LOS; `Entity.isRanged()` distinguishes ranged reach. Route ranged axes and Wall checks through one shared helper while preserving Story 2.6 canonical target resolution and target-supporting Wall exclusion.
- `duelyst/app/sdk/spells/spell.coffee` -- `_findApplyEffectPositions` already builds circular v2 footprints around the selected effect center; filter eligible deliveries by direct center-to-candidate segment, retaining effect radius and existing target filters.
- `duelyst/app/sdk/modifiers/modifierDamageAreaAttack.coffee`, `modifierDispelAreaAttack.coffee`, `modifierMyAttackWatchAreaAttack.coffee`, `modifierSelfDamageAreaAttack.coffee`, and `duelyst/app/sdk/spells/spellFollowupDamage.coffee` -- audit eligible new-rules call sites, reusing shared obstruction only where their current geometry reaches beyond adjacent cells; preserve effect ownership and target type.
- `duelyst/app/sdk/cards/factory/core/neutral.coffee` -- Maw already supplies six axial neighbors for its version 2 follow-up. Preserve that pattern and verify the generated follow-up uses the shared rules.
- `duelyst/app/view/Player.js`, `duelyst/app/view/layers/game/GameLayer.js`, SDK validators, `duelyst/server/ai/starter_ai.js`, and replay -- reuse shared SDK target results; do not add separate UI/server geometry.
- `duelyst/test/unit/sdk/game/board.js`, card-effect tests, and `duelyst/test/integration/misc/utils_game_session.js` -- add axis, support-wall, segment interior/boundary/vertex, radius, follow-up, and cross-path regression coverage.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/rulesets/hexTopology.coffee` -- implement a deterministic open-segment/hex-interior test that distinguishes interior crossings from boundary and vertex touches.
- [x] `duelyst/app/sdk/entities/attackRange.coffee` and `duelyst/app/sdk/entities/entity.coffee` -- restrict v2 ranged attacks to six axes and block intervening Walls through the shared geometry, excluding source/target endpoint cells.
- [x] `duelyst/app/sdk/spells/spell.coffee` and audited area-effect modifiers/follow-ups -- apply direct explosion-center delivery and Wall obstruction without changing each effect's radius, target type, or eligibility.
- [x] UI, validators, AI, Sandbox, and replay callers -- consume shared SDK legality and preserve version 1 behavior and Story 2.6 target priority.
- [x] Focused SDK, eligible card-effect, UI/AI, and persistence/replay tests -- cover every matrix row, holes and odd/even rows, and legacy compatibility.

**Acceptance Criteria:**
- Given a ranged attacker and an in-range target, when geometry is checked, then only six-axis positions are eligible and any intervening Wall blocks the result across preview, SDK, server, Sandbox, AI, and replay.
- Given a legal Unit target on a Wall, when melee, ranged, or area delivery is checked, then the supporting Wall does not block that target; a separate intervening Wall still blocks ranged or area delivery.
- Given an area effect with radius R and explosion center C, when targets are computed, then candidates within hex distance R (including off-axis cells) are tested along the direct C-to-target segment, independent of caster-to-C distance.
- Given a segment that intersects a Wall hex, when the intersection is interior, boundary-only, or vertex-only, then only the interior intersection blocks; results remain consistent on odd/even rows, holes, prediction, authoritative play, and replay.
- Given Maw's eligible nearby follow-up or another audited effect, when its target is resolved, then shared geometry applies without changing its existing target type, team, radius, or other legal conditions.

## Implementation Notes

## Spec Change Log

## Review Triage Log

- **false (Blind Hunter 1):** The filter runs after `_filterApplyPositions`, preserving existing target and team filters; Epic 2 FR8 requires direct Wall obstruction for area-effect candidates. No unrelated effect or changed filter was demonstrated.
- **false (Blind Hunter 2):** The cited area modifiers and Maw use adjacent-only targets, so no distinct hex interior lies between their center and candidate. The spec's Code Map limits adding checks there to effects whose geometry spans intervening cells.
- **low → patch (Blind Hunter 3):** The original tests covered target-supporting and intervening Walls separately. Added a ranged case with both Walls present and asserted the intervening Wall blocks; focused board suite passed.
- **false (Blind Hunter 4):** `_findApplyEffectPositions` receives the explosion center and uses it for radius enumeration and segment checks; caster distance is not part of that calculation. The area test also confirms an off-axis candidate within radius remains eligible.
- **false (Blind Hunter 5):** UI preview, authoritative validation, and AI call the shared `AttackRange` methods, whose target check delegates to the changed `getValidPosition`; board tests exercise that decision. The verification-gap reviewer found no unverified consumer behavior.
- **No findings (Edge Case Hunter):** No reachable unhandled paths or contradicted claims were reported.
- **No findings (Verification Gap Reviewer):** No regression, missing-adoption, or broken-verification gaps were reported.
## Design Notes

In local axial offsets `(dq, dr)` from a Wall center, the open hex interior is described by `|2dq + dr| < 1`, `|dq + 2dr| < 1`, and `|dq - dr| < 1`. Clip the open source-to-target segment against these six strict half-planes. A positive-length overlap blocks; a boundary or vertex touch does not. Exclude the segment endpoints so source and target cells are not treated as intervening Walls.

## Verification

**Commands:**
- Focused board, ranged, area-effect, UI/AI, and persistence/replay suites -- expected: all pass.
- Changed CoffeeScript compilation/lint, changed JavaScript checks, and `git diff --check` in both repositories -- expected: clean.
