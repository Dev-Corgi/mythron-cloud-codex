---
title: 'Story 7: Add the Lifegain ratio and attach it to the eight cards'
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

**Problem:** The existing heal-self-when-dealing-damage modifier always restores 100% of damage and is not attached to the eight Phobies cards that need 50% Lifegain.

**Approach:** Extend that modifier with an optional ratio defaulting to 1.0, preserving existing card behavior, and attach it at 0.5 only to imported card IDs 50002, 50004, 50011, 50014, 50015, 50018, 50030, and 50034. Healing is based on the final damage applied after defenses, floored, and capped by the source unit's missing Health; damage from active abilities counts when its source is the Lifegain unit.

</frozen-after-approval>

## Implementation Notes

- Reuse review (AD-15): `ModifierHealSelfWhenDealingDamage` is already used by Sworn Defender in `duelyst/app/sdk/cards/factory/core/neutral.coffee` and a boss definition in `duelyst/app/sdk/cards/factory/misc/bosses.coffee`. Extend it with a ratio parameter; do not add another modifier.
- All imported units are created in `duelyst/app/sdk/cards/factory/phobies/neutral.coffee`; attach Lifegain there by the eight explicit Phobies IDs, without changing original Duelyst factories.
- `DamageAction.getTotalDamageAmount()` returns the adjusted, floored amount; `DamageAction._execute()` applies it to the target. Cap the Lifegain basis by the target's current HP to exclude overkill, then apply ratio/floor and the source's missing-Health cap.
- Add tests for default 1.0 behavior, 0.5 flooring and post-defense/overkill damage, ability-sourced damage, and exactly the eight Phobies attachments.
- Read and applied `SPEC.md`, `card-roster.md`, architecture decisions AD-13, AD-14, AD-15, and AD-17. AD-13 keeps this modifier story out of the v2 numeric configuration; AD-14/AD-17 define ratio, applied-damage, flooring, and healing cap semantics.

## Verification

**Commands:**
- `./node_modules/.bin/mocha -t 1000 test/unit/sdk/cards/phobies_factory.js test/unit/sdk/game/phobies_lifegain.js` — expected: all factory, ratio, applied-damage, overkill, and default-behavior assertions pass.
- `./node_modules/.bin/coffeelint app/sdk/modifiers/modifierHealSelfWhenDealingDamage.coffee app/sdk/cards/factory/phobies/neutral.coffee` — expected: no CoffeeScript lint errors.
- `./node_modules/.bin/eslint --quiet test/unit/sdk/game/phobies_lifegain.js` — expected: no lint errors in the added behavior test.

## Review Triage Log

- `medium` — Ability damage coverage: extended the behavior test to mark the DamageAction through `UseActiveAbilityAction.setAbilityOriginOn`, verify the casting unit remains its source, and assert Lifegain resolves.
- `medium` — Missing-Health cap coverage: added a case where only 1 Health is missing while Lifegain calculates 2; the source is healed by only 1.
- `medium` — Post-defense coverage: added a target with the existing `ModifierImmuneToDamage` and asserted that zero applied damage produces no Lifegain; retained the adjusted-damage multiplier case for floor behavior.
