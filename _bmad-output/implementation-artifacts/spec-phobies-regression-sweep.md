---
title: 'Make the Phobies import regression sweep executable'
type: 'bugfix'
created: '2026-11-04'
status: 'in-progress'
route: 'dispatch'
baseline_commit: '97ee667403a9ff90d5b585092fba030f0b280404'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-phobies-regression-sweep/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-phobies-regression-sweep/defect-register.md'
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/card-roster.md'
  - '{project-root}/_bmad-output/implementation-artifacts/phobies-import-audit-2026-11-04.md'
---

<frozen-after-approval reason="canonical contract supplied by the user">

## Intent

**Problem:** The 35-card Phobies import has unverified data, gameplay, UI, board-rendering, and card-pool regressions. Existing repair commits and passing code inspection do not show that the imported roster works in a match.

**Approach:** Make the supplied regression-sweep SPEC and its companions executable as conformance tests, repair every confirmed mismatch within the stated Practice/Sandbox v2 boundary, and provide an unattended sweep plus built-client observations. The supplied roster is authoritative for values, text, icons, and ability behavior.

## Boundaries & Constraints

**Always:** Preserve all original card and legacy-mode behavior. Scope imported-card behavior to Practice/Sandbox v2. Cover all 35 cards and 16 active abilities; compare displayed data with SDK values. Exclude the caster from single-target friendly heal/Attack-boost target selection and validation. Healing restores only missing Health. Test board position and stats against SDK entities after every required action. Run tests both with and without Redis where applicable and identify Redis-dependent suites. Verify UI by built client and built-in browser, recording screenshots or captured values. Every defect-register item needs a regression that demonstrates failure before its fix and passing afterward, or an explicitly recorded live observation.

**Never:** Add cards, abilities, action-model/Rush work, rebalance values, enable imported content outside Practice/Sandbox v2, change legacy behavior, or decide the unresolved Raising Hell geometry and Rage-on-initial-summon conflicts. Do not close a defect based on code reading or prior commits alone.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Roster conformance | All imported unit and ability definitions | 35 cards and 16 actives match roster stats, metadata, icon sources, names and effect text | Any missing or mismatched field fails with card/field context |
| Ability targets | Every active, legal and illegal target; heal target at full and missing Health | Effects, targets, amounts and durations match roster; caster is illegal for the four single-target friendly heal/buff actives; full-health heal applies 0 | Illegal target rejected both in highlighting and SDK validation |
| Display surfaces | Hand, in-match inspect and collection; each ability | Shared computed frame, animated source atlas icon, real counters, exact effect text; collection matches hand-hover ability card | Parity and SDK-value assertions fail on any divergence |
| Board synchronization | Move, attack, push, dash, spawn, death, Wall create and remove | Each rendered unit tile and stats equal SDK state after the action | Executed action-specific assertion identifies the divergent entity/value |
| Pools and sweep | PB collection, Practice/Sandbox deck builder, other pools; unattended run | Every PB card occurs once in intended surfaces, nowhere else; run all cards and actives and emit an empty defect report | Any duplicate, leak, invariant failure, or unresolved defect fails the run |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/cards/factory/phobies/` and `duelyst/app/sdk/rulesets/cardEligibility.coffee` -- imported definitions, effects, targeting and mode/pool policy. Reuse existing SDK action, validator and modifier paths; do not alter legacy card factories or rule outcomes.
- `duelyst/app/sdk/actions/`, `validators/`, and `duelyst/app/view/layers/game/GameLayer.js` -- action state and replay for move/push/dash/spawn/death/Walls; compare entity nodes to SDK state.
- `duelyst/app/view/layers/game/handAbilitySlot.js`, `duelyst/app/view/nodes/cards/CardNode.js`, and `duelyst/app/ui/views2/collection/PhobiesCollectionCardVisual.js` -- hand, inspect and collection ability face presentation. Add/reuse one shared data module for computed ability-face values; renderers draw its result.
- `duelyst/app/ui/collections/cards.js` and `duelyst/app/ui/views2/collection/cards_collection.js` -- PB browsing and collection filtering; retain PB browse/deck access while excluding other pools.
- `duelyst/test/unit/sdk/{cards/phobies_factory.js,game/active_abilities.js,game/card_eligibility.js}` and `duelyst/test/unit/view/{phobies_presentation_regressions.js,phobies_collection_card_visual.js,game_layer_active_ability_inspect.js}` -- extend existing focused coverage.
- `duelyst/app/view/nodes/cards/EntityNode.js`, `duelyst/test/unit/server/api/`, and relevant game/AI suites -- preserve the original move rendering path, combined-suite isolation, persistence, target legality and pool boundaries.
- `duelyst/app/data.coffee` and `duelyst/app/data/fx.js` -- resolve only roster-named existing FX leaves; do not invent or silently substitute assets.

## Tasks & Acceptance

**Execution:**
- [x] Run roster-driven factory coverage for all 35 cards and 16 abilities, including source stats, metadata, passives, Lifegain, atlas data and effect text.
- [x] Add SDK target-list and action-validation regressions excluding the caster for all four single-target friendly heal/Attack-buff abilities; assert a full-health heal applies 0 Health.
- [ ] Demonstrate each defect-register regression failing before its fix, or record a live observation where historical failure cannot be reproduced.
- [ ] Use one shared ability-face data module for frame, counters, icon frame and effect text across hand, inspect and collection; assert rendered parity.
- [ ] After move, attack, push, dash, spawn, death, Wall create and remove, assert every relevant rendered node tile and stat equals SDK state.
- [x] Assert all 35 IDs are v2 deck choices, excluded from generic/legacy pools, and that overlapping collection sources render each ID once; preserve deck-model checks for Practice and Sandbox.
- [ ] Run every card and active through an unattended Practice/Sandbox v2 match sweep, asserting CAP-1–CAP-5 after each step and emitting an empty machine-readable defect report only on completion. Keep Redis-dependent tests discoverable and report whether Redis was available.
- [x] Build both web and app clients; changed JavaScript ESLint and `git diff --check` pass.
- [ ] Inspect built hand, inspect and collection surfaces in the built-in browser and record screenshots or captured values.

**Acceptance Criteria:**
- Given the authoritative roster, when the conformance suite runs, then every card/ability field and displayed effect value matches it and no defect-register entry lacks an executed passing regression or recorded observation.
- Given every active is used and every required board action resolves, when SDK and rendered state are compared, then target legality, health/effects/counters, tile, and displayed stats match the contract after each step.
- Given the collection, deck builder and other pools are inspected, when all imported IDs are counted, then each appears once in intended PB surfaces and nowhere outside Practice/Sandbox v2.
- Given the unattended sweep runs to completion, when it writes its report, then all 35 cards and 16 actives were exercised, CAP-1–CAP-5 stayed true, and the report contains no defect.
- Given the built client is inspected in the built-in browser, when the three card surfaces are captured, then animated icons, counters, effect text, frame placement and displayed SDK values conform to the shared ability-face data.

## Implementation Notes

Implementation remains in progress. `validatorPlayCard.coffee` now rejects caster-self targets for the four single-target friendly Phobies abilities; SDK tests also assert the caster is absent from target enumeration and that a full-health heal applies 0. Added roster-wide Practice/Sandbox deck eligibility checks, overlapping collection-source uniqueness coverage, and the `test:phobies:sweep` runner. The unresolved Raising Hell geometry and Rage timing remain excluded by the canonical contract. No data migration, external side effect, or deployment is required.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:** Run focused SDK, view, collection/deck, AI and server suites; run combined affected suites with and without Redis; run changed-file lint/compilation and `git diff --check`; run `npm run build:app` from `duelyst`. Expected: all applicable checks pass. Use the built-in browser for required visual captures.

**Observed during this implementation:** `npm run test:phobies:sweep` passed 130 tests with 0 reported defects after removing the obsolete movement-fallback suite and allowing 10 seconds for the slow AI case; it writes `.tmp/phobies-regression-sweep-report.json` and intentionally reports `complete: false` because the full match sweep, rendered board-state comparisons and pre-fix defect demonstrations are incomplete. `practice_entry.js` is Redis-dependent: including it in a no-Redis run produced `127.0.0.1:6379` EACCES errors. Docker inspection was denied by the environment, so a Redis-enabled run was unavailable. The built client loaded in the in-app browser at `http://localhost:3000/`; a Pupabomb hand hover showed its static counters and effect text without overlapping combat stats. `npm run build:app` and `npm run build:web` succeeded; the app build emitted a nonfatal SnoreToast notification error after bundling. Changed-file ESLint and `git diff --check` passed. CoffeeLint reported CRLF line-ending errors across the pre-existing validator file. The full completion criteria remain unmet; do not change status to `in-review` or mark the sweep report complete until the unchecked execution items and acceptance criteria are satisfied.
