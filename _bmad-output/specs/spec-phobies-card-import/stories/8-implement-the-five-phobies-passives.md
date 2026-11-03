---
title: 'Story 8: Implement the five Phobies passives'
type: 'feature'
created: '2026-11-03'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '677cdd584eb733d33bc472f477d5a58b68ef28f1'
context:
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/card-roster.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-phobies-card-import-2026-11-02/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Five passives in the Phobies roster are not implemented on their imported Duelyst cards, so those cards do not yet behave or describe their Phobies variants.

**Approach:** Implement Body Count, Counter Attack, Regatorate, Rage, and Heart Attack as modifiers using existing SDK event hooks. Attach them only to imported IDs 50018, 50027, 50028, 50033, and 50034, with the roster's Duelyst-terminology effect text and the General as the Heart.

## Boundaries & Constraints

**Always:** Body Count permanently adds 200 Attack when this minion directly kills an enemy, including damage sourced by its ability. Counter Attack reflects `floor(0.35 × actual damage received)` to the damage source, after defenses and capped by the damage actually applied; reflected Counter Attack damage never triggers another Counter Attack. Regatorate heals 400 Health at the start of this minion owner's turn without curing poison. Rage permanently adds 300 Attack once its owner's General reaches 3000 Health or less. Heart Attack adds 400 damage when this minion damages the enemy General. These effects use existing DamageAction sources so abilities count when the minion is the source. Preserve existing card behavior and v2 numeric rules from AD-13; no passive attaches to a legacy card.

**Never:** Do not change the ruleset config, generic damage/heal actions, existing modifiers' default behavior, or original Duelyst card definitions. Do not add a second copy of a suitable modifier hook; extend an existing base or add a Phobies-specific modifier where no exact behavior exists.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Counter Attack | Imported Thorn Needler takes 10 applied damage | Its source takes 3 damage; zero applied damage reflects zero | Ignore reflected Counter Attack damage to prevent recursion |
| Regatorate | Damaged Kolossus owner's turn begins | It heals up to 400 missing Health, with poison unchanged | Full-health unit gains no Health |
| Rage | Rogue Warden's General drops to 3000 Health | Rogue Warden gains exactly +300 Attack once, retained after healing | Damage above threshold does not trigger; later damage crossing it does |
| Heart Attack | Hamon Bladeseeker damages enemy General | Add 400 to that damage; other targets receive no bonus | N/A |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/modifiers/modifierKillWatch.coffee` -- credits a kill only when its source is the watched unit; use as Body Count's base. No matching kill-to-Attack modifier was found.
- `duelyst/app/sdk/modifiers/modifierTakeDamageWatch.coffee` and `modifierTakeDamageWatchDamageAttacker.coffee` -- existing damage-taken and reflection patterns. The latter uses fixed damage and no recursion guard; retain its source fallback semantics while implementing the Phobies ratio and reflected-action guard.
- `duelyst/app/sdk/modifiers/modifierStartTurnWatch.coffee` -- owner-turn timing for Regatorate; no start-turn self-heal subclass exists. `modifierEndTurnWatchHealSelf.coffee` is the wrong timing.
- `duelyst/app/sdk/modifiers/modifierMyGeneralDamagedWatch.coffee` and `modifierMyGeneralDamagedWatchBuffSelfAttackForSame.coffee` -- own-General damage hook for Rage; the existing subclass adds damage-sized Attack on every hit and cannot implement the one-time threshold.
- `duelyst/app/sdk/modifiers/modifierDoubleDamageToGenerals.coffee` -- source/General target filtering for Heart Attack; its multiplier behavior differs from the required flat +400.
- `duelyst/app/sdk/modifiers/modifierFactory.coffee` -- imports and resolves modifier types. `duelyst/app/sdk/cards/factory/phobies/neutral.coffee` -- shared factory where the five specified IDs and inherent modifier contexts are defined; preserve Story 7 Lifegain attachment.
- `duelyst/test/unit/sdk/cards/phobies_factory.js` and new `duelyst/test/unit/sdk/game/phobies_passives.js` -- assert exact card attachments/text and behavior, including ability-sourced damage, turn ownership, threshold crossing, reflection recursion, and target filtering.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/modifiers/modifierPhobies*.coffee`, `modifierFactory.coffee` -- add/register modifiers reusing the existing kill, take-damage, start-turn, General-damaged, and General-target hooks.
- [x] `duelyst/app/sdk/cards/factory/phobies/neutral.coffee` -- attach the five passive modifiers only to the roster IDs and expose the exact passive descriptions.
- [x] `duelyst/test/unit/sdk/cards/phobies_factory.js`, `duelyst/test/unit/sdk/game/phobies_passives.js` -- verify mappings, text, and the I/O edge cases.

**Acceptance Criteria:**
- Given imported Dioltas kills an enemy directly, when the kill resolves, then it gains +200 Attack permanently; a non-kill does not buff it.
- Given imported Thorn Needler takes damage, when defenses and HP limits are applied, then it reflects 35% rounded down of applied damage to the source, and reflected damage cannot chain Counter Attack.
- Given imported Kolossus begins its owner's turn while damaged, when its passive resolves, then it restores up to 400 Health and leaves poison unaffected.
- Given imported Rogue Warden's General reaches 3000 Health or less, when the threshold is reached, then Rogue Warden gains +300 Attack exactly once for the rest of the game.
- Given imported Hamon Bladeseeker damages the enemy General, when damage resolves, then that damage is increased by 400; damage to other targets is unchanged.
- Given any passive-bearing Phobies unit deals damage through an ability, when the DamageAction source is that unit, then relevant source-based passives see the same unit source. Given any original Duelyst card, when its modifiers resolve, then no Story 8 behavior is added.
- Given each passive-bearing imported card is shown, when its effect text is read, then it matches the card-roster wording in Duelyst terms.

## Implementation Notes

- Reuse before create (AD-15): reviewed the five existing hook families above. Extend the hooks with new Phobies-specific subclasses only where no existing concrete modifier matches the required semantics. AD-13 is unchanged: this story adds no numeric ruleset constants.

## Spec Change Log

## Review Triage Log

- **false — Counter Attack shield handling:** `DamageAction._execute` applies damage through `target.applyDamage(dmg)`, and the modifier measures the resulting HP decrease, so the amount reflected is damage that actually affected Health; no separate shield absorption path exists in the SDK.
- **false — Counter Attack chain guard:** every Counter Attack copy shares the registered modifier type, and `Action.getCreatedByTriggeringModifier()` follows resolve-parent provenance, so reflected actions are ignored by all copies, including chained/copied instances.
- **defer — Regatorate poison assertion (Blind Hunter):** the repository has no unit poison status or poison modifier to assert; the implementation invokes only `HealAction`, which does not cure status. The remaining integration assertion depends on poison support being introduced.
- **false — Rage threshold event:** the changed test now covers remaining above threshold at 3,500 Health, then crossing at 3,000; the handler checks the General's current Health `<= 3000` on each General-damage event, including damage received while already below the threshold.
- **defer — active ability integration coverage (Blind Hunter):** no production caller of `setAbilityOriginOn` appears in the baseline-to-current diff, and Story 8 tests call it directly; this concerns pre-existing Story 5 ability-origin wiring. See deferred work.
- **defer — action-tree indexing order (Blind Hunter):** `setAbilityOriginOn` registers an embedded action only when the root already has an index; this is in pre-existing Story 5 code. See deferred work.
- **defer — area-attack child provenance (Blind Hunter):** `AttackAction` creates area child attacks using parent linkage without explicitly marking ability origin; this is in pre-existing Story 5 code. See deferred work.
- **defer — non-action-point movement rules (Blind Hunter, Edge Case Hunter, Verification Gap):** the non-action-point `getCanMove` branch still checks ordinary speed and movement limits; the behavior is in pre-existing Story 5 changes. See deferred work.
- **defer — inactive-unit movement guard (Blind Hunter):** `getCanMove` lacks an active-state check for ability-origin movement; this is in pre-existing Story 5 changes. See deferred work.

## Design Notes

Counter Attack must distinguish its own reflected DamageAction from ordinary damage using the existing triggering-modifier provenance; this avoids adding a global damage-action flag. Its reflected amount is derived from damage actually applied, rather than raw overkill, because the roster describes the portion of damage the unit received.

## Verification

**Commands:**
- `./node_modules/.bin/mocha -t 1000 test/unit/sdk/cards/phobies_factory.js test/unit/sdk/game/phobies_passives.js` -- expected: all attachment, text, and passive behavior tests pass.
- `./node_modules/.bin/coffeelint app/sdk/modifiers/modifierPhobies*.coffee app/sdk/modifiers/modifierFactory.coffee app/sdk/cards/factory/phobies/neutral.coffee` -- expected: no CoffeeScript lint errors.
- `./node_modules/.bin/eslint --quiet test/unit/sdk/cards/phobies_factory.js test/unit/sdk/game/phobies_passives.js` -- expected: no JavaScript lint errors.
