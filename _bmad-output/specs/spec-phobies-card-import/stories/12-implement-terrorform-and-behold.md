---
title: 'Story 12: Implement Terrorform and Behold'
type: 'feature'
created: '2026-11-03'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '238f5203c0d30ab2f55d27be1a115d7aa650471e'
context:
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/card-roster.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-phobies-card-import-2026-11-02/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-duelyst-2026-10-30/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Grave Digger and Beauty have Phobies actives that are not implemented in the imported-card runtime.

**Approach:** Add Boulder Hurl (Terrorform) and Thunderbomb (Behold) as owner-bound effect cards. Reuse the v2 Wall entity/actions and extend the shared axial attack resolver for Behold's straight beam.

## Boundaries & Constraints

**Always:** Follow CAP-4 and AD-8, AD-9, AD-11, AD-13, and AD-17. Terrorform is Grave Digger's adjacent ability: on a legal empty board tile create an ownerless, targetable, obstructing Wall using the v2 ruleset config health; on an adjacent Wall remove that Wall, regardless of its neutral ownership. Behold is Beauty's range-2 ability: select an enemy Unit, including a General, on one of the three axial axes with a clear Wall-aware line; deal 500 damage to it and each enemy Unit farther along that same ray. Allies are unaffected, and the beam stops at the first Wall obstruction. Resolve damage with `DamageAction` attributed to Beauty. Charge only the ability's one action point. Use the roster's existing FX and sounds.

**Never:** Change Wall setup, configured Wall health, ordinary attack targeting, other modes, or other actives. Do not create a second Wall/beam engine, damage Walls with Behold, or grant unit ownership to generated Walls.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Terrorform create | Grave Digger targets an adjacent empty v2 tile | Add a neutral Wall with configured health; spend one AP total | Reject off-board, hole, occupied, or non-adjacent positions without a partial change |
| Terrorform remove | Grave Digger targets an adjacent Wall | Remove that Wall, including one sharing a position with a Unit | Leave non-Wall entities unchanged |
| Behold beam | Beauty selects a visible enemy Unit within two tiles on an axial line | Deal 500 to the selected Unit and enemy Units behind it on that ray, stopping at Walls | Reject allies, off-axis/out-of-range targets, and targets blocked by a Wall |
| Ability accounting | Either active resolves | Preserve caster source and spend one AP, with no mana charge | Invalid uses spend no AP and create no partial effect |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/cards/cardsLookup.coffee` and `cardsLookupComplete` chain -- reserve effect ids 51015–51016; use existing lookup completion conventions.
- `duelyst/app/sdk/cards/factory/phobies/neutral.coffee` -- link Inquisitor Kron (50011) and Xenkai Cannoneer (50035) with roster Lockdown/Cooldown/range.
- `duelyst/app/sdk/cards/factory/phobies/abilities.coffee` -- add effect spells and sequence `DamageAction`, `RemoveAction`, and `ApplyCardToBoardAction`; reuse `getAbilitySource` and `runAbilityAction`.
- `duelyst/app/sdk/rulesets/hexAttackGeometry.coffee` and `hexTopology.coffee` -- extend AD-8 with axial beam selection and existing Wall-blocking checks; do not put geometry in card effects.
- `duelyst/app/sdk/validators/validatorPlayCard.coffee` -- validate Terrorform's empty-tile/Wall modes and Behold's enemy, axis, range, and visibility before use.
- `duelyst/app/sdk/rulesets/cardEligibility.coffee` -- current Wall policy permits only actionless setup Walls; narrowly allow an ownerless Wall created by the exact Terrorform ability action.
- `duelyst/app/sdk/cards/factory/misc/tiles.coffee` and `duelyst/app/sdk/gameSetup.coffee` -- existing Wall factory reads `getRulesetConfig().wallHealth`; setup seeds neutral Walls through board application.
- `duelyst/app/sdk/actions/applyCardToBoardAction.coffee`, `removeAction.coffee`, and `damageAction.coffee` -- reuse existing card placement, removal, and source-attributed damage semantics.
- `duelyst/test/unit/sdk/game/active_abilities.js`, `hex_attack_geometry.js`, `card_eligibility.js`, and `duelyst/test/unit/sdk/cards/phobies_factory.js` -- cover ability behavior, geometry, runtime Wall permission, and card metadata.

## Tasks & Acceptance

**Execution:**
- [x] `cardsLookup.coffee`, `neutral.coffee`, and `abilities.coffee` -- register both effect cards and implement their owner-bound behavior and roster presentation.
- [x] `hexAttackGeometry.coffee` and `validatorPlayCard.coffee` -- share Behold ray validation/victims and validate Terrorform's two target modes.
- [x] `cardEligibility.coffee` -- permit only neutral Walls created through Terrorform while preserving setup and legacy rules.
- [x] Focused SDK tests -- cover creation/removal, invalid targeting, beams, blockers, General targets, source attribution, AP, and registration.

**Acceptance Criteria:**
- Given a ready Grave Digger ability, when it targets an adjacent empty legal tile or Wall, then it respectively creates a configured neutral Wall or removes that Wall, spending one AP.
- Given a ready Beauty ability and a visible enemy Unit within range 2 on an axial line, when Behold resolves, then it damages that Unit and enemy Units behind it along the ray for 500, but no allies or units beyond a blocking Wall.
- Given an invalid target, when either ability is attempted, then the action is rejected with no board mutation or AP charge.
- Given either effect resolves, when its actions are inspected, then generated damage has the caster as source and only existing roster FX/sounds are used.

## Implementation Notes

AD-15 reuse trace: Wall setup already uses the Wall tile factory and `ApplyCardToBoardAction`; `RemoveAction` removes board entities; `DamageAction` applies caster-attributed damage. No new general action type is planned. The Wall runtime allowlist must distinguish setup (no source action) from the exact Terrorform-origin board application.

## Spec Change Log

## Review Triage Log

- Blind Hunter 1 — `false`: the current ruleset registry contains only Practice Sandbox V2, and `getIsPracticeSandboxV2()` is the same exact ruleset/version guard used by existing Wall support. No registered V2 mode can pass `isV2Rules()` while failing this action guard.
- Blind Hunter 2 — `medium`, route `patch`: the Wall apply allowlist previously checked only the Terrorform root; it now also requires the chosen adjacent position and an empty board cell. Regression coverage verifies off-target applications are rejected.
- Blind Hunter 3 — `medium`, route `patch`: the Wall remove allowlist previously checked only the Terrorform root; it now requires the selected adjacent position. Regression coverage verifies off-target removals are rejected.
- Blind Hunter 4 — `medium`, route `patch`: Behold damage had a caster source but lacked the ability-origin marker. Damage actions now set that marker, and the Behold test confirms it on every hit.
- Blind Hunter 5 — `false`: the resolver now applies the shared ranged Wall-segment check while extending the beam beyond its selected target, in addition to stopping at each Wall tile on the ray.
- Blind Hunter 6 — `low`, route `patch`: the prior removal test did not cover a Wall sharing its tile with a Unit. The Terrorform integration test now verifies the Wall is removed while the Unit remains active.
- Blind Hunter 7 — `low`, route `patch`: the prior Behold tests did not cover a victim dying before later victims resolve. A new test verifies the snapshotted beam continues to damage the next enemy.
- Edge Case Hunter — `medium`, route `patch`: this overlaps Blind Hunter 2 and 3; both Terrorform action branches are now bound to the root selection and adjacency, with off-target validation tests.
- Verification Gap Reviewer — `low`, route `patch`: this repeats Blind Hunter 6; the Wall-under-Unit removal case is now covered and passed.

## Design Notes

Behold's selected target sets the direction, and its range 2 constrains that selected target. “Units behind it” means all enemy Units farther along the same axial ray until board edge or the first Wall obstruction; those victims need not themselves be within the selected target's use range.

## Verification

**Commands:**
- `./node_modules/.bin/mocha -t 1000 test/unit/sdk/game/active_abilities.js test/unit/sdk/game/hex_attack_geometry.js test/unit/sdk/game/card_eligibility.js test/unit/sdk/cards/phobies_factory.js` -- expected: Story 12 behavior, geometry, eligibility, and registration tests pass.
- `./node_modules/.bin/coffeelint app/sdk/cards/factory/phobies/abilities.coffee app/sdk/cards/factory/phobies/neutral.coffee app/sdk/cards/cardsLookup.coffee app/sdk/rulesets/hexAttackGeometry.coffee app/sdk/rulesets/cardEligibility.coffee app/sdk/validators/validatorPlayCard.coffee` -- expected: no CoffeeScript lint errors.
- `./node_modules/.bin/eslint --quiet test/unit/sdk/game/active_abilities.js test/unit/sdk/game/hex_attack_geometry.js test/unit/sdk/game/card_eligibility.js test/unit/sdk/cards/phobies_factory.js` -- expected: no JavaScript lint errors.
