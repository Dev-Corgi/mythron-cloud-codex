---
title: 'Story 2: Rework Rock Pulverizer with Rush'
type: 'feature'
created: '2026-11-04'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'a5f1cd79e6285bbccb184bc0e57c0adf4d251eaa'
context:
  - '../../specs/spec-duelyst-action-model-rush/SPEC.md'
  - '../../planning-artifacts/architecture/architecture-action-model-rush-2026-11-03/ARCHITECTURE-SPINE.md'
  - '../../specs/spec-duelyst-action-model-rush/stories/1-restore-the-duelyst-move-then-attack-action-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Rock Pulverizer (Cassowary) currently has the `move_and_strike` active ability. That ability does not fit the restored move-then-attack action model.

**Approach:** Remove the ability from Rock Pulverizer and grant its card data the existing `ModifierFirstBlood` Rush passive. Remove effect 51012 only after confirming its other references are cleaned up and no other Phobies card uses it.

## Boundaries & Constraints

**Always:** Preserve Rock Pulverizer's cost, health, attack, movement, attack type/range and Lifegain. Rush only clears default summon exhaustion when the unit has not acted; it must not clear stun or override copied transform state. No other Phobies card receives Rush. Preserve original Duelyst cards that use `ModifierFirstBlood`. The action model and ruleset from Story 1 remain the prerequisite behavior.

**Never:** Add a new Rush modifier, grant extra slots/effects, change any other card's data, or alter original-card Rush. Retire effect 51012 and its implementation only after sweeping all references and tests.

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/cards/factory/phobies/neutral.coffee` -- `ROSTER`, `ACTIVE_ABILITY_BY_CARD_ID`, `LIFEGAIN_CARD_IDS`, and inherent modifier construction. Preserve the roster row and Lifegain membership; remove card 50004's ability mapping and attach `ModifierFirstBlood` only to 50004.
- `duelyst/app/sdk/modifiers/modifierFirstBlood.coffee` -- existing Rush behavior; reuse as-is. It refreshes exhaustion only on the summon turn if `getHasActedThisTurn()` is false.
- `duelyst/app/sdk/cards/factory/phobies/abilities.coffee`, `cardsLookup.coffee`, and `validatorEntityAction.coffee` -- remove CawClaw/51012 factory and lookup mapping and retire it from the special movement-attack validator list; retain IDs 51013/51014.
- `duelyst/server/ai/card_intent/phobies_abilities.js` -- remove CawClaw intent and position scoring; other movement ability intents stay.
- `duelyst/app/ui/views2/collection/PhobiesCollectionCardVisual.js` and `duelyst/test/unit/view/phobies_collection_card_visual.js` -- remove effect 51012 art/detail data; the unit's existing modifier UI supplies Rush text.
- `duelyst/test/unit/sdk/cards/phobies_factory.js` and `duelyst/test/unit/sdk/game/` -- verify only Rock Pulverizer has Rush among Phobies, stats/Lifegain unchanged, summon move→attack works, ordinary summons stay exhausted, and stun/copied transform state is not overridden. Remove old CawClaw behavior tests and effect references.
- `duelyst/test/unit/sdk/game/unit_stats.js` -- Story 1 transform/building tests use Cassowary as a replacement; avoid asserting fresh building behavior with the newly Rush-enabled card where it would exercise Rush instead of the intended transform invariant.
- `duelyst/app/data/fx.js` contains a generic original Duelyst Knucklestorm animation resource; leave original Duelyst card resources and data untouched.

## Tasks & Acceptance

**Execution:**
- [x] Update Phobies card 50004 to use existing Rush and remove its active ability while preserving its stats and Lifegain.
- [x] Retire CawClaw/51012 runtime effect, lookup, validator, AI, visual, and test references after repository-wide search confirms no other Phobies use.
- [x] Add tests for summon-turn move then attack, action exhaustion, other Phobies Rush absence, ordinary summon exhaustion, and Rush interaction with stun and transformed state.
- [x] Run focused Story 2 tests, full available test suite, lints, and search every `51012`, `CawClaw`, and `move_and_strike` reference.

**Acceptance Criteria:**
- Given Rock Pulverizer's card data, then its active ability is absent and cost, attack, health, movement, reach, attack type and Lifegain match the existing values.
- Given Rock Pulverizer is summoned in v2, then it is ready and may move then attack on that turn, after which Story 1 rejects extra actions.
- Given another Phobies unit is summoned, then it remains exhausted until its owner's next turn start.
- Given the Phobies roster, then Rock Pulverizer is the sole card with `ModifierFirstBlood`; original Duelyst Rush cards are unchanged.
- Given Rush is removed or the unit is stunned, then it cannot gain readiness by clearing a non-default exhaustion source.
- Given transform state is copied to Rock Pulverizer, then Rush does not overwrite that state.
- Given effect 51012 is no longer used, then the factory entry, active ability, validator exception, AI intent/scoring, collection visual mapping, lookup name, and tests no longer reference it.
- Given Rock Pulverizer appears in the game or collection detail, then its Rush keyword is shown and no removed ability is shown.

## Implementation Notes

- Focused Story 2 verification passed: 28 tests across Phobies factory, move/attack slots, unit stats, and collection ability details. This includes real summon-action Rush activation, move→attack, exhausted ordinary summons, stun, copied transform state, zero-distance movement, Rush removal after spent actions, and the existing ability-detail checks.
- Full `npm test` fails during setup under Node 22 in legacy `require-dir` (`module.parent.filename` is undefined in `test/index.js`), before tests load.
- CoffeeLint reports whole-file line-ending violations (`Expected unix`) on the touched CoffeeScript files. ESLint over the changed JS implementation and tests exits nonzero due existing repository style/import errors, including pre-existing errors in the collection view test.
- Runtime/test search found no `51012`, `CawClaw`, or `move_and_strike` references under `duelyst/app`, `duelyst/server`, or `duelyst/test`. Historical specifications and architecture review documents retain those names as rationale and source history.


## Spec Change Log

## Review Triage Log

- patch — The original summon-turn test bypassed Rush activation through direct exhaustion refresh; it now executes `ApplyCardToBoardAction` and verifies that Rush leaves Rock Pulverizer ready before move→attack.
- patch — Move/attack coverage omitted a legal zero-distance movement; the focused suite now verifies it does not consume the move slot.
- patch — Rush removal had no spent-state regression; the test now removes Rush after both turn slots are spent and verifies removal leaves the unit exhausted and unable to move.
- false — Review questioned whether copied transformed exhaustion survives Rush activation; `applyCardData` applies inherent Rush before the copied `ModifierTransformed` context, and the regression test confirms the copied exhausted state and counters persist.
- false — Review questioned whether the replacement card exposes Rush in its detail; the factory provides the keyworded `ModifierFirstBlood` context, and `Card.getDescription` includes inherent keyworded modifier names/definitions in the collection's existing unit-description path.
- defer — Review could not verify unchanged Lockdown/Cooldown behavior because the legacy active-ability test fixture fails the Practice/Sandbox card audit and the full runner aborts before loading tests; recorded in `deferred-work.md` pending an audited fixture and runnable environment.
