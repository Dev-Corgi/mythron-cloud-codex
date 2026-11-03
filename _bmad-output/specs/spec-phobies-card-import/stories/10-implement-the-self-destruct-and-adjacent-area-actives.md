---
title: 'Story 10: Implement the self-destruct and adjacent-area actives'
type: 'feature'
created: '2026-11-03'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'ea7a852e301ba2948a5cb9a85e4d136b486a7084'
context:
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/card-roster.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-phobies-card-import-2026-11-02/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-duelyst-2026-10-30/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** BOOM, KABOOM, Rusty, and Fleshcrawler have rostered active abilities that are not yet implemented as Phobies runtime-only effect cards.

**Approach:** Add Pupabomb effects for Special Delivery and Poof!, Flash Freeze for Gotcha, and Holy Immolation for Raising Hell!, linking the effect cards to their units and applying damage, immobilization, and self-destruction through SDK actions.

## Boundaries & Constraints

**Always:** Follow CAP-4 and AD-8, AD-11, AD-15, AD-16, and AD-17. Register unique ability effect ids 51008–51011 and attach exact roster Lockdown, Cooldown, and range. Effects remain zero-cost, runtime-only, and only usable by their owner through `UseActiveAbilityAction`. Use the existing AD-8 area resolver for delivery and Wall obstruction. Damage actions use the casting unit as source. Damage effects target enemy Units including Generals; Gotcha immobilizes an enemy Unit, including a General, for two affected-owner end turns. Self-destruct abilities destroy their caster and affect enemy units in the area, not allies. Raising Hell deals 600 to adjacent enemies and 300 to enemies at distance two when directly deliverable under the shared Wall rule. Use the roster's Duelyst skill names, FX, and apply sounds.

**Never:** Change legacy cards, generic spell results, map geometry, or other modes; add private area/line-of-sight geometry; alter the shared resolver unless required to expose its established area behavior; add new visual assets; or make these effects deckable or normally playable.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Special Delivery / Poof! | BOOM / KABOOM uses ability | Caster is destroyed; adjacent enemy units take 550 / 1400 damage; allies and non-adjacent units are unchanged | Reject invalid owner, unavailable ability, or invalid target |
| Gotcha | Rusty targets an adjacent enemy | Rusty is destroyed; target cannot move through two of its owner's end turns | Reject ally, General, and out-of-range targets |
| Raising Hell | Fleshcrawler uses ability | Adjacent enemy Units take 600; enemy Units at distance two with clear direct delivery take 300; allies and farther units are unchanged | Walls block only targets hidden under AD-8; reject invalid owner/range |
| Card registration | Each effect id resolved or offered as a normal card | Correct owner metadata, zero-cost AbilityEffect, named skill presentation; absent from deck choices and hand play | Unowned/ordinary use is rejected |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/cards/factory/phobies/abilities.coffee` — extend the Story 9 factory with Phobies-specific effect behavior; reuse `Spell`, `DamageAction`, source lookup, existing FX and sound setup. Use `KillAction` for caster death and an existing immobilize modifier if it matches two affected-owner turns.
- `duelyst/app/sdk/cards/factory/phobies/neutral.coffee` — link BOOM 50001, Rusty 50009, KABOOM 50013, and Fleshcrawler 50030 to effect ids 51008–51011 with roster metadata.
- `duelyst/app/sdk/cards/cardsLookup.coffee` — continue the reserved Phobies ability range after 51007.
- `duelyst/app/sdk/rulesets/hexAttackGeometry.coffee` and `duelyst/app/sdk/spells/spell.coffee` — reuse `filterAreaPositions` and radius candidate generation, which already apply AD-8 line-of-sight Wall filtering in v2. Do not duplicate geometry.
- `duelyst/app/sdk/actions/damageAction.coffee`, `killAction.coffee`, and immobilize modifier classes — preserve normal damage/death hooks and existing duration semantics.
- `duelyst/test/unit/sdk/game/active_abilities.js` and `duelyst/test/unit/sdk/cards/phobies_factory.js` — extend Story 9 coverage for damage, deaths, immobilization, range, metadata, eligibility, and presentation.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/cards/factory/phobies/abilities.coffee`, `cardsLookup.coffee`, `neutral.coffee` — register four effect cards and owner links, reusing existing effect/action patterns and roster presentation resources.
- [x] `duelyst/test/unit/sdk/game/active_abilities.js`, `phobies_factory.js` — cover area filtering, source attribution, self-destruction, immobilize duration, target restrictions, metadata, and runtime-only eligibility.

**Acceptance Criteria:**
- Given the four units are deployed in v2, when their ability is used legally, then each resolves its roster damage or immobilize effect, with self-destruct casters removed and damage sourced to the caster.
- Given allies, General targets for Gotcha, invalid ranges, or ordinary card play are attempted, when validated, then the effect is rejected or excluded from the area without applying effects.
- Given Raising Hell has targets in range with and without intervening Walls, when resolved, then only enemy Units directly reachable under AD-8 take the distance-appropriate damage.
- Given each ability card is resolved, when inspected, then it has the roster's name, text, FX, and sound and remains runtime-only.

## Implementation Notes

Reused `SpellDamage`/`DamageAction`, `KillAction`, `ModifierCannotMove`, spell radius candidate generation, and the AD-8 shared Wall filter. `ModifierCannotMove` supports `durationEndTurnPlayerId`, matching Gotcha's two affected-owner turns. No new geometry or visual assets were added.

## Spec Change Log

## Review Triage Log

## Design Notes

Self-destruct abilities resolve their area around the caster, independent of the selected ability target position. Damage and immobilization can affect enemy Generals where present; healing-only restrictions do not apply. Raising Hell's two damage tiers are based on hex distance from the caster; the shared area resolver decides whether a Wall obstructs direct delivery to each target.

## Verification

**Commands:**
- `./node_modules/.bin/mocha -t 1000 test/unit/sdk/game/active_abilities.js test/unit/sdk/cards/phobies_factory.js` — expected: new Story 10 runtime and factory cases pass; report any unrelated pre-existing failures separately.
- `./node_modules/.bin/coffeelint app/sdk/cards/factory/phobies/abilities.coffee app/sdk/cards/factory/phobies/neutral.coffee app/sdk/cards/cardsLookup.coffee` — expected: no CoffeeScript lint errors.
- `./node_modules/.bin/eslint --quiet test/unit/sdk/game/active_abilities.js test/unit/sdk/cards/phobies_factory.js` — expected: no JavaScript lint errors.
