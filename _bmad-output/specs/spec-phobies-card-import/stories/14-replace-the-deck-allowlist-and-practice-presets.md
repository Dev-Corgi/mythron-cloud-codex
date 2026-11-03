---
title: 'Story 14: Replace the Deck Allowlist and Practice Presets'
type: 'feature'
created: '2026-11-03'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '076d447e7ee3d900e9c1705b35c9315b57516076'
context:
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/practice-bot-deck.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-phobies-card-import-2026-11-02/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Practice and Sandbox v2 still permit the former neutral roster and Planar Scout, and their starter presets still use legacy faction cards. Saved mode decks containing cards removed from the v2 allowlist also remain selectable or fail only at entry.

**Approach:** Make the shared v2 `deckable` role exactly the 35 imported Phobies units plus Generals, replace the Practice bot roster with the eight cards in `practice-bot-deck.md`, and use that same SDK roster for Practice/Sandbox primary-General presets. Remove invalid saved Practice/Sandbox decks on owner-scoped deck load and entry checks.

## Boundaries & Constraints

**Always:** Follow AD-12. Keep v1 and legacy eligibility unchanged; keep signatures and generated dependencies in their existing runtime-only paths. Use one SDK-owned eight-card roster, validate it against v2 `deckable`, and preserve the legacy 40-card faction starter decks outside Practice/Sandbox. Delete only the authenticated user's saved `practice` or `sandbox` decks that fail v2 saved-deck validation; retain valid mode decks and all legacy-purpose decks. Keep Developer Sandbox on the legacy path.

**Never:** Add imported effect cards to deckable, change the imported roster/stats/effects, delete other users' decks, migrate ongoing matches, or alter legacy card-pool behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| v2 deck choice | Imported unit, General, old neutral, Planar Scout, or ability effect | Only the 35 imported units and valid General are deckable; legacy runtime-only rules remain separate | Reject invalid deck submissions |
| Saved deck load | Owned Practice/Sandbox deck with any non-deckable ID | Purge the invalid record and omit it from loaded decks | Owner-scoped deletion; leave legacy and valid mode decks intact |
| Mode entry | Stale/invalid owned Practice/Sandbox deck | Reject entry and purge the record | Do not create a game/session |
| Starter preset | Practice/Sandbox selection for each faction | Primary General plus exactly the shared eight-card roster | Developer Sandbox and all other modes keep their legacy presets |

</frozen-after-approval>

## Code Map

- `app/sdk/rulesets/cardEligibility.coffee` -- central deckability authority and `getPracticeBotRoster`; replace temporary neutral roster allowances only for v2 while preserving signature/generated runtime exceptions and v1 behavior.
- `server/lib/create_single_player_game.coffee` -- constructs the Practice AI deck from the shared roster; validate with explicit `practice-sandbox-hex` v2 context after changing the IDs.
- `server/lib/data_access/decks.coffee` -- owner-scoped user-deck reads; centralize invalid Practice/Sandbox purge here so list and entry reads share one deletion rule.
- `server/routes/api/me/decks.coffee` and `server/routes/api/me/games.coffee` -- list/detail load and Practice entry call sites; use the shared purge behavior, never a submitted user id.
- `app/ui/views/composite/deck_select.js`, `app/sdk/cards/factionFactory.coffee` -- mode selector creates faction starter models; use each faction's primary General and the SDK roster only for Practice/Sandbox, preserving `starterDeckForFactionLevel` elsewhere.
- `test/unit/sdk/game/card_eligibility.js`, `test/unit/server/api/decks_routes.js`, `test/unit/server/api/practice_entry.js`, and `test/unit/misc/practice_ui_paths.js` -- existing allowlist, persistence/entry, and selection coverage to extend.

## Tasks & Acceptance

**Execution:**
- [x] `app/sdk/rulesets/cardEligibility.coffee` -- make v2 deckability exact, replace the shared bot roster, and keep v1/runtime exceptions intact.
- [x] `server/lib/data_access/decks.coffee` and deck API routes -- purge only invalid owned Practice/Sandbox records on load and entry validation.
- [x] `server/lib/create_single_player_game.coffee` -- use and v2-validate the exact eight-card bot roster for all difficulties and Generals.
- [x] `app/ui/views/composite/deck_select.js` -- show primary-General plus roster presets only in Practice/Sandbox; preserve Developer Sandbox and legacy starters.
- [x] Relevant unit tests -- cover allowlist boundaries, owner-scoped purge, exact bot roster, presets for every faction, and legacy/v1 behavior.

**Acceptance Criteria:**
- Given a v2 deck choice, when validation runs, then only the 35 imported cards and Generals are accepted; old neutral cards, Planar Scout, and effect cards are rejected while v1 rules remain unchanged.
- Given an owned saved Practice/Sandbox deck containing an excluded card, when its deck list is loaded or it is used for entry, then the record is deleted and no match/session starts; valid and legacy-purpose decks remain.
- Given Practice AI at any difficulty or a Practice/Sandbox starter preset for any faction, when the deck is built, then it is that General plus exactly the eight shared roster cards, validated as deckable.
- Given Developer Sandbox or another mode, when starter decks are offered, then the existing legacy faction starter behavior remains.

## Implementation Notes

Purge is an explicit requested data cleanup. The implementation must constrain every deletion by the authenticated owner and the invalid row's id, and must treat `purpose` values outside `practice`/`sandbox` as untouchable.

## Spec Change Log

## Review Triage Log

- `blind-hunter` — `duelyst/server/routes/api/me/decks.coffee` — **medium / patch**: an invalid detail lookup purges to `undefined`, and the route dereferenced `deckData.cards`; return 404 and cover that route response.
- `blind-hunter` — `duelyst/app/sdk/rulesets/cardEligibility.coffee` — **medium / patch**: Practice opponent choices omitted nine v2 General IDs because the getter returned only signature-mapped Generals; return the complete v2 General list, as the companion deck note says the bot deck works “for each general.”
- `blind-hunter` — Practice General list verification — **medium / patch**: no assertion pinned the complete opponent list; added a UI expectation for all 18 IDs and an SDK count assertion.
- `blind-hunter` — `duelyst/test/unit/server/api/decks_routes.js` — **medium / patch**: no route-level test covered an empty detail lookup after purge; added a 404 regression case.
- `blind-hunter` — `duelyst/server/lib/data_access/decks.coffee` — **medium / patch**: a valid concurrent edit could be removed after the original invalid read; the delete now also matches the validated card array.
- `blind-hunter` — `duelyst/test/unit/misc/practice_ui_paths.js` — **false**: the UI test stubs the preset helper, but `duelyst/test/unit/sdk/game/card_eligibility.js` separately calls the real `FactionFactory.practiceStarterDeckForFaction` for every faction and validates each result.
- `blind-hunter` — `duelyst/test/unit/server/api/decks_purge.js` — **false**: saved player decks may select any eight deckable Phobies; the exact eight-card roster is required for bot and starter presets, which are tested separately.
- `edge-case-hunter` — `duelyst/server/routes/api/me/decks.coffee` — **medium / patch**: same post-purge undefined dereference as the blind-hunter route finding; handled by the 404 guard and regression test above.
- `edge-case-hunter` — `duelyst/server/lib/data_access/decks.coffee` — **medium / patch**: same validation-to-delete race as the blind-hunter finding; the delete now predicates on the validated cards.
- `edge-case-hunter` — `duelyst/app/sdk/rulesets/cardEligibility.coffee` — **medium / patch**: because General IDs are deckable, a second General could occupy a unit slot; v2 validation now rejects Generals after slot zero and has a regression assertion.
- `verification-gap` — `duelyst/test/unit/server/api/decks_purge.js` — **medium / patch**: the previous fake did not assert the delete purpose predicate; the test now checks `whereIn('purpose', ['practice', 'sandbox'])` and the validated card-array predicate.
- `verification-gap` — `duelyst/server/routes/api/me/decks.coffee` — **medium / patch**: same detail-route dereference finding; handled and covered as above.

## Verification

**Commands:**
- `./node_modules/.bin/mocha --exit -t 10000 test/unit/sdk/game/card_eligibility.js`
- `./node_modules/.bin/mocha --exit -t 10000 test/unit/server/api/decks_routes.js test/unit/server/api/practice_entry.js`
- `./node_modules/.bin/mocha --exit -t 10000 test/unit/misc/practice_ui_paths.js test/unit/ui/models/deck_phobies_eligibility.js`
- `./node_modules/.bin/mocha --exit -t 10000 test/unit/server/api/decks_purge.js` -- expected: invalid records are deleted only for the owner while valid/legacy records remain.
