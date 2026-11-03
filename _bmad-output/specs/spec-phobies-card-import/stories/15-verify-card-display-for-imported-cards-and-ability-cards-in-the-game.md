---
title: 'Story 15: Verify Card Display for Imported Cards and Their Ability Cards in the Game'
type: 'feature'
created: '2026-11-03'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'e74c5a514f766039fa284f37529481091845c4cc'
context:
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/card-roster.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-phobies-card-import-2026-11-02/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Phobies card and ability presentation has not been verified as a connected game flow. The selected-card detail currently recognizes only one effect-card ID and shows a fixed Phoenix Fire icon, so most imported abilities are missing or display the wrong skill icon.

**Approach:** Verify the imported card and ability presentation surfaces against the roster, then make every active ability appear in the related-card detail with its Duelyst skill name, icon, Duelyst-worded effect, and correct level/counters. Preserve the opponent-only reveal and existing effect/sound wiring.

## Boundaries & Constraints

**Always:** Follow CAP-1, CAP-4, AD-16 and the card roster. Keep `[PB]` display naming centralized and identity based on card IDs. Reuse existing resources and presentation paths; maintain player-own-use no-reveal and opponent-use reveal behavior. Verify live FX/SFX only through a running match if accessible; record any access boundary.

**Never:** Change imported stats, effect behavior, card IDs, non-Phobies cards, legacy presentation, or add new art/FX. Do not create an account for verification. The human supplied credentials for the existing local test account and explicitly authorized their use; do not record them in files or logs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Ability detail | Any one of the 16 imported ability-bearing units | Related ability card shows roster skill name, matching skill icon, effect text, Lockdown/Cooldown, and level | Missing effect card yields no broken or stale detail |
| No active ability | Imported unit without an ability | No ability card is shown | Preserve normal unit detail |
| Presentation boundaries | Own versus opposing ability action | Own action skips reveal; opponent action uses card-back then reveal; both retain declared FX and SFX | No new animation path or outcome change |

</frozen-after-approval>

## Code Map

- `duelyst/app/ui/views2/collection/PhobiesCollectionCardVisual.js` -- `getAbilityDetail` currently special-cases Phoenix Fire instead of resolving Phobies effect cards; extend it to all registered imported effects and provide correct icon data.
- `duelyst/app/ui/views2/collection/selected_card.js` and `templates/selected_card.hbs` -- selected-card presentation assigns a fixed Phoenix Fire icon and hard-codes `LEVEL 1`; consume detail data instead.
- `duelyst/app/sdk/cards/factory/phobies/abilities.coffee` -- authoritative effect IDs, Duelyst skill names/text, source spell art, FX and SFX; do not alter behavior without a display defect.
- `duelyst/app/sdk/cards/card.coffee` -- `[PB]` name prefix is display-only and centralized.
- `duelyst/app/view/nodes/cards/CardNode.js`, `GameLayer.js`, and `app/sdk/actions/cardPlayAction.coffee` -- ability face and opponent-only reveal plumbing already exist; preserve and inspect their tests before changes.
- `duelyst/test/unit/view/phobies_collection_card_visual.js` and `test/unit/view/game_layer_active_ability_inspect.js` -- extend UI-detail coverage and retain inspect/reveal regression coverage.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/ui/views2/collection/PhobiesCollectionCardVisual.js`, `selected_card.js`, and `templates/selected_card.hbs` -- render all 16 ability detail cards with data-driven icon, Duelyst name/text, and level/counters.
- [x] `duelyst/test/unit/view/phobies_collection_card_visual.js` -- cover every distinct effect/icon mapping, repeated skill icons, missing effects, and non-ability cards.
- [x] Existing view/game tests -- verify own-use/reveal distinction and imported-card inspect selection remain intact; change game-view code only if a traced presentation defect is found.
- [x] Run relevant unit tests and inspect the live game when a non-authenticated route is available; report FX/SFX observations and any runtime access blocker.

**Acceptance Criteria:**
- Given each of the 16 ability-bearing imported cards, when its selected-card details render, then the related card displays the roster's Duelyst skill name and corresponding icon, Duelyst-terminology effect text, level, Lockdown, and Cooldown.
- Given a non-ability imported card, when its details render, then no stale ability preview is present.
- Given a unit ability action, when shown to its owner or opponent, then reveal remains absent for the owner and uses the opponent spell reveal for the opponent, without altering existing effect and sound declarations.

## Implementation Notes

The local game collection route was opened with the existing account after credentials were explicitly supplied by the human. The browser was still serving the pre-change bundle because the app/server image had not been rebuilt, so that view confirms route access only and is not evidence for this implementation. No live match was available; FX/SFX behavior is covered by existing game-view regression tests rather than witnessed in a match.

## Spec Change Log

## Verification

**Commands:**
- `./node_modules/.bin/mocha --exit -t 10000 test/unit/view/phobies_collection_card_visual.js`
- `./node_modules/.bin/mocha --exit -t 10000 test/unit/view/game_layer_active_ability_inspect.js test/unit/view/played_card_action.js`

**Results:** 6 passing in the collection visual suite; 14 passing in the game-view and played-card action suites. No findings were deferred.

**Manual checks:** The stale browser view was not used to verify the changed presentation. Selected-card ability fields and icon crop are exercised through the compiled selected-card template in the view test.

## Review Triage Log

- **false** — The detail-mapping test now uses the real factory definitions for all 16 effect IDs and asserts each roster skill name and effect text, so identical stubs no longer mask name/text regressions.
- **false** — Crop data and the compiled selected-card template are asserted for the Phoenix Fire atlas frame; the test checks the emitted background image, position, and size as well as level, counters, and effect.
- **false** — All 16 effect IDs now have an existing-game icon or attack indicator mapping; the two assets absent from Duelyst's icon atlas use the nearest existing resources, not a source portrait fallback.
- **false** — All 16 registered effect IDs are mapped; unknown/missing effect cards return no detail and are covered by the missing-effect test.
- **false** — Existing `game_layer_active_ability_inspect.js` and `played_card_action.js` assert owner reveal skip and opponent reveal behavior; all 14 tests passed.
- **medium (patch)** — The initial view test did not exercise selected-card template output, so removing its ability fields would not fail verification. Added a compiled-template test asserting icon crop, level, counters, and effect; it passes.
