---
title: 'Story 2: Add the phase movement modifier and complete the lobbed stat value'
type: 'feature'
created: '2026-11-02'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'ed8741e729bdbb4df5be81839b99f2c933fd938a'
context:
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/map-layout.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The stat model has no Phase modifier to express movement through enemy units, and its attack-type stat was missing the requested `lobbed` value. Both capabilities must be present before later stories implement their complete card behavior.

**Approach:** Add a Phasing modifier modeled on Flying, with the same terrain permissions and speed behavior plus passage through enemy units without allowing an occupied endpoint. Add `lobbed` to the attack type's validated stat values and focused tests only; its attack rules remain for Story 3.

## Boundaries & Constraints

**Always:** Preserve Flying's distinction from Phase: Flying can cross and occupy holes and Walls but cannot pass through enemy units. Phase can pass through enemy units, holes, and Walls but cannot stop on any occupied position. Apply phase traversal only to `practice-sandbox-hex` version 2; preserve version 1 and legacy movement behavior. Keep the existing stat accessors, serialization, and modifier factory reconstruction behavior. Lobbed is a valid stat string only and may target any tile within range in the future; do not implement attack targeting now.

**Never:** Implement lobbed targeting, line-of-sight, or attack resolution (Story 3); add card assignments, UI/icons, or unrelated movement changes. Do not alter summon legality or legacy rules.

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/modifiers/modifierFlying.coffee` -- template for keyworded movement modifier and infinite-speed buff; use the same structure for `ModifierPhasing` while exposing a distinct type.
- `duelyst/app/sdk/modifiers/modifierFactory.coffee` and `duelyst/app/sdk.coffee` -- register modifier type so serialized contexts can instantiate it and tests can use `SDK.ModifierPhasing`.
- `duelyst/app/sdk/entities/movementRange.coffee` -- ruleset-specific BFS handles terrain, obstructions, endpoints, and paths. Separate terrain-crossing permission from enemy-unit traversal; leave the legacy branch intact.
- `duelyst/app/sdk/entities/entity.coffee` -- `setAttackType` and `getAttackType` own the allowed value set. Add `lobbed` without assigning attack semantics.
- `duelyst/test/unit/sdk/game/board.js` -- existing versioned movement coverage includes holes, Walls, occupied destinations, and summon exclusion; extend it for Phasing's enemy pass-through and occupied endpoint behavior.
- `duelyst/test/unit/sdk/game/unit_stats.js` -- focused stat tests for allowed/rejected attack types; add `lobbed` validation coverage.
- `duelyst/app/sdk/cards/card.coffee` / `modifierFactory.coffee` -- card modifier contexts are reconstructed through the factory; verify Phase round-trips through the standard context path.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/entities/entity.coffee`, `duelyst/test/unit/sdk/game/unit_stats.js` -- accept `lobbed` in attack type setter/getter and test default, valid value, and invalid value handling without attack-rule changes.
- [x] `duelyst/app/sdk/modifiers/modifierPhasing.coffee`, `duelyst/app/sdk/modifiers/modifierFactory.coffee`, `duelyst/app/sdk.coffee` -- add and register a cloneable Phasing modifier modeled after Flying.
- [x] `duelyst/app/sdk/entities/movementRange.coffee`, `duelyst/test/unit/sdk/game/board.js` -- permit Phase to traverse enemy units and the same holes/Walls as Flying while preventing occupied endpoints; preserve Flying's enemy restriction and v1/legacy behavior.

**Acceptance Criteria:**
- Given a unit with no explicit attack type, when its type is read, then it remains melee; when `lobbed` is set, it is accepted and returned; unsupported values do not replace the current type.
- Given a v2 Phasing unit with sufficient movement, when its path crosses an enemy unit, a hole, or a Wall, then each may be traversed, but the unit cannot end on an occupied unit position.
- Given an enemy occupies a hole or Wall, when a Phasing unit crosses that position, then the enemy is passable but cannot be a movement destination.
- Given a v2 Flying unit attempts to cross an enemy unit, when movement positions are computed, then that path is not offered; Flying retains its existing hole and Wall access.
- Given a version 1 or legacy match, when movement positions are computed, then existing movement behavior is unchanged.
- Given a modifier context is serialized and reconstructed, when the modifier type is resolved, then it reconstructs as `ModifierPhasing`.

## Implementation Notes

Added `ModifierPhasing` as a distinct modifier type with Flying's infinite movement speed, active only in Practice/Sandbox ruleset version 2, and registered for SDK access and modifier-context reconstruction. Version 2 movement treats Phase as terrain-capable like Flying and allows it to traverse enemy Units, but only empty positions or Wall positions can be endpoints. Flying remains blocked from enemy Units; the legacy movement branch is unchanged. Added `lobbed` to the stat validator and getter only; no attack behavior was introduced.

## Verification

**Commands:**
- `./node_modules/.bin/mocha -t 1000 test/unit/sdk/game/unit_stats.js test/unit/sdk/game/board.js` -- 74 passing, including Phase path/end-point and ruleset activation checks, modifier reconstruction, and `lobbed` validation.

## Spec Change Log

## Review Triage Log

- medium — The Phasing modifier's unconditional infinite-speed buff changed movement in version 1 and legacy rulesets. Gated the modifier activation to `practice-sandbox-hex` version 2 and added assertions for legacy, version 1, and version 2 activation.
- false — The Phasing movement test crosses an enemy on the hole at axial `(2,0)`, asserts it cannot end there, and verifies the path continues to `(3,0)`; occupied-hole coverage is already present.
- false — The movement test isolates the BFS permission branch with a class mock, while a separate stat test verifies ModifierFactory reconstruction and a new ruleset test verifies activation. The cited risk is not demonstrated by these independent checks.
- false — The Story 2 spec explicitly leaves lobbed attack behavior for Story 3, and the canonical contract plus Story 3 description specify that lobbed attacks arc over Wall/unit obstruction; there is no contradictory instruction to implement lobbed behavior here.
- false — A Wall is a terrain endpoint explicitly allowed for Phasing. The occupied-endpoint restriction concerns Units; the test's Wall endpoint does not violate it.

