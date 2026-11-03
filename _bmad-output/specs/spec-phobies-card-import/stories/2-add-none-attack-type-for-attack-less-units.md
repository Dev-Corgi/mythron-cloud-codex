---
title: 'Add the none attack type for attack-less units'
type: 'feature'
created: '2026-11-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/card-roster.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-phobies-card-import-2026-11-02/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Attack-type stats cannot currently express a unit with no basic attack. Unsupported values are discarded, and the entity's attack eligibility has no explicit no-attack state.

**Approach:** Add `none` to the existing explicit attack-type accessor and make entities with that type ineligible to attack, while leaving inferred and default attack behavior unchanged. BOOM, KABOOM, Cupcake, and Rusty will use this type in their standalone Phobies definitions when Story 4 creates them; their original Duelyst cards must remain unchanged.

</frozen-after-approval>

## Implementation Notes

- Extended the shared `Entity` accessors so `none` is an explicit serializable attack type; `getCanAttack()` now rejects only that explicit value. Existing defaults and inferred types remain unchanged.
- Reuse review (AD-15): checked `Entity.getCanAttack()` and `ValidatorEntityAction`; the validator already uses this accessor for ordinary attack actions, so no parallel action or validator logic was added.
- The four Phobies variants do not exist yet; Story 4 creates their standalone definitions and will assign `none`. Their existing Duelyst source cards were left untouched, as required by the spec.
- Verification: `test/unit/sdk/game/unit_stats.js` passed (17 tests), CoffeeLint passed, and `git diff --check` is clean. ESLint reports 10 `function-paren-newline` violations in unchanged sections of `unit_stats.js`; running ESLint on the committed baseline reports the same 10 violations, and the new tests add none.

## Review Triage Log

- `low` — Initial coverage proved `none` blocks an otherwise attack-eligible v2 unit but did not assert that default and inferred attack types remain eligible; added assertions for default melee and inferred area units. Route: `patch`.
- `low` — The initial notes named the extended accessors but omitted the existing attack-validation path reviewed under AD-15; recorded `getCanAttack()` and `ValidatorEntityAction` and why no new validator was needed. Route: `patch`.
