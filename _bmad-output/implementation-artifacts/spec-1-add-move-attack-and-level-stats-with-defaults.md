---
title: 'Story 1: Add move, attack, and level stats with defaults'
type: 'feature'
created: '2026-11-02'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '1c45882041c8ce79d7088cdf95155a665509e186'
context:
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
  - '{project-root}/_bmad-output/specs/spec-duelyst-rules-overhaul/rules-detail.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/map-layout.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Units currently expose implicit movement speed and attack reach, while movement and attack kinds are represented by modifiers and legacy conventions. The new unit-card model needs explicit movement, attack, and level stats with stable defaults.

**Approach:** Add a stat API for movement type/distance, attack type/range, and level, backed by existing speed/reach and modifier behavior. Use walk/2, melee/1, and level 1 when a card has no configured value. Keep new rule behavior scoped to Practice and Sandbox.

## Boundaries & Constraints

**Always:** Preserve existing speed and reach semantics, including buffs, caching, and card-specific values. Movement distance is the existing speed; attack range is existing reach. Reflect established Flying and Blast attack traits in the exposed type values. The model is available on units across modes, while this story must not change legacy mode behavior. Phase is represented as a valid stat value for later use; its modifier and terrain behavior belong to Story 2.

**Never:** Implement Story 2 phase mechanics, Story 3 ranged/area geometry, Story 6 card UI, or any action-point or active-ability behavior. Do not change the legacy ruleset's movement, attack, presentation, or balance.

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/entities/entity.coffee` -- owns speed/reach getters, setters, aura handling, and movement/attack pattern caches. Reuse these paths for distance and range; do not replace them.
- `duelyst/app/sdk/entities/unit.coffee` -- unit defaults are speed 2 and melee reach 1. Add unit-level defaults for movement type, attack type, and level without overwriting card factory overrides.
- `duelyst/app/sdk/entities/movementRange.coffee` -- derives movement from `getSpeed()` and checks active `ModifierFlying`; preserve this behavior.
- `duelyst/app/sdk/entities/attackRange.coffee` -- derives attack distance from `getReach()`; geometry remains out of scope.
- `duelyst/app/sdk/modifiers/modifierFlying.coffee` and `modifierBlastAttack.coffee` -- existing movement and area-attack traits used to report the corresponding stat types.
- `duelyst/app/sdk/cards/card.coffee` -- card data application and cloning/serialization paths; preserve new stat values when card instances are copied or reconstructed.
- `duelyst/app/sdk/rulesets/` and `gameSession.getRulesetId()` -- `practice-sandbox-hex` is the explicit new-rules gate. Do not include Developer Sandbox or other modes by broad mode checks.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/entities/entity.coffee`, `unit.coffee` -- expose validated movement type, movement distance, attack type, attack range, and level defaults while retaining existing speed/reach behavior.
- [x] `duelyst/app/sdk/cards/card.coffee` and relevant SDK copy paths -- retain configured stats through card-data cloning and reconstruction.

**Acceptance Criteria:**
- Given a unit with no configured stat values, when its stats are read, then it reports walk, distance 2, melee, range 1, and level 1.
- Given a unit with card-specific speed/reach or Flying/Blast traits, when its stats are read, then distance/range preserve the existing values and type reflects the existing trait.
- Given a match outside Practice or Sandbox, when a unit moves or attacks, then existing rules and behavior remain unchanged.
- Given a unit has a phase stat, when Story 1 code reads it, then the value is preserved without introducing phase movement behavior.

## Implementation Notes

Added Unit defaults for movement type, attack type, and level. Entity exposes type setters/getters and stat accessors backed by existing speed/reach, deriving fly and area from current Flying and Blast traits. Card clone/copy data paths carry speed, reach, and the new values. The existing `getAttackRange()` returns the attack-range engine object, so the numeric stat is exposed as `getAttackRangeStat()` to preserve compatibility. No movement, attack geometry, or legacy behavior path was changed.

## Verification

**Manual checks:** Confirm model defaults, configured type and distance values, cloned/reconstructed card stat persistence, and that MovementRange/AttackRange still consume the existing speed/reach values. Confirm no behavior gates were broadened beyond the `practice-sandbox-hex` ruleset.

## Spec Change Log

## Review Triage Log

- false — The movement-type getter reports the intrinsic Flying card trait, while active movement legality continues to use `hasActiveModifierClass()` in `MovementRange`; a suppressed modifier does not rewrite the card's stat.
- medium — Explicit attack types were shadowed by Blast/reach inference. Fixed by returning a valid configured `attackType` before legacy inference, with an assertion for an explicit melee type at ranged reach.
- false — The Verification section is the check plan, and the suggested fix was to edit this build spec; that class of finding is rejected by the review workflow. The focused SDK suite was run and passed.
- medium — The new stat API had no focused assertions. Fixed with tests for defaults, setter validation, phase preservation, and Flying/Blast/ranged type reporting; all five focused cases pass.
- medium — Card-data cloning and reconstruction had no assertions for the new fields. Fixed with a test that verifies speed, reach, movement type, attack type, and level survive copying and reconstruction.

