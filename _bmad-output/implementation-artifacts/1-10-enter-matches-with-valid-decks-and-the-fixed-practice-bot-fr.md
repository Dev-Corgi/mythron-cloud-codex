---
title: 'Enter matches with valid decks and the fixed Practice bot'
type: 'feature'
created: '2026-10-30'
status: 'done'
route: 'dispatch'
baseline_commit: '9c1f7c5751bd9da3c806ca9a604dd01621111f18'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/1-8-keep-conflicting-cards-out-of-new-rules-matches-fr17-fr18-fr.md'
  - '{project-root}/_bmad-output/implementation-artifacts/1-9-create-separate-nine-card-decks-fr12-fr18.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Practice and Sandbox entry accept ordinary card arrays, and Practice uses difficulty-tiered AI decks. This can admit the wrong format or cards that break new-rules matches.

**Approach:** Validate saved deck purpose, exact count, and shared eligibility before constructing new-rules matches. Use the documented fixed Practice roster at every difficulty and preserve legacy entry rules.

## Boundaries & Constraints

**Always:** Practice accepts only saved `practice` decks and local Sandbox only `sandbox`; both require one general and eight eligible cards. Validate stored data before `allCardsAvailable` or setup bypasses using Story 1.8's shared policy: the documented Practice roster, compatible canonical general/signature pairs, and audited generated dependencies only. Variants and other IDs remain excluded. The Practice bot uses exactly one each of Maw (10979), Bloodtear Alchemist (19052), Golem Metallurgist (19038), Bloodshard Golem (10205), Dragonlark (10001), Flameblood Warlock (19051), Sworn Avenger (10954), and Drybone Golem (10206), plus the selected general, at every difficulty. Preserve legacy and Developer Sandbox paths. Do not expose rollout before the full experience is ready.

**Never:** Trust a client-supplied purpose or card list instead of the saved deck; allow invalid decks past the global availability bypass; substitute, randomize, or partially omit the bot roster; or apply new-rules validation to legacy modes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Practice selection | Saved practice deck with one general and eight eligible cards | Start Practice after server validation | Reject before session setup |
| Wrong purpose/format | Legacy, Sandbox-purpose, incomplete, or excluded card in Practice request | No new-rules session is created | Existing invalid-deck response |
| Sandbox selection | Saved sandbox deck(s), each valid for purpose and contents | Start concrete local Sandbox | Reject before session construction |
| Fixed bot | Any supported AI difficulty and general | Exact documented eight cards, once each, plus that general | Fail setup if roster is incomplete or ineligible |
| Legacy entry | Existing valid legacy deck | Existing behavior remains | Existing validation path |

</frozen-after-approval>

## Code Map

- `server/routes/api/me/games.coffee:/single_player` -- maps client IDs, derives the general, calls `UsersModule.isAllowedToUseDeck`, then creates Practice; accept a saved deck identifier and validate purpose/content before that call.
- `server/lib/data_access/users.coffee:isAllowedToUseDeck` -- currently has an `allCardsAvailable` early return; do not let it bypass new-rules format/eligibility checks.
- `server/lib/create_single_player_game.coffee` -- server binds the ruleset before `GameSetup`; choose the fixed bot roster here or in a dedicated Practice deck provider.
- `server/ai/decks/usable_decks.js` and `faction1.js`–`faction6.js` -- current AI deck varies by difficulty. Keep this legacy path; route Practice to the fixed roster while retaining difficulty for AI behavior.
- `app/ui/views/composite/deck_select_single_player.js` and `app/application.coffee:_startSinglePlayerGame` -- Practice currently submits card IDs; pass selected saved-deck identity so server can verify purpose.
- `app/ui/views/composite/deck_select_sandbox.js`, `app/sdk/challenges/sandbox.coffee`, and `app/sdk/challenges/challenge.coffee` -- selected cards reach local setup; validate both saved purposes before `GameSetup`. `sandboxDeveloper.coffee` overrides to legacy and must stay exempt.
- `app/sdk/gameSetup.coffee` -- builds player/deck state after ruleset assignment; preserve defensive checks at this authoritative setup boundary.
- `_bmad-output/specs/spec-duelyst-rules-overhaul/practice-bot-deck.md` -- fixed roster and Maw ID; `test/unit/sdk/game/game_setup.js`, server deck validation tests, and bot setup tests are extension points.

## Tasks & Acceptance

**Execution:**
- [x] `server/routes/api/me/games.coffee` and shared deck validation -- Fetch selected saved Practice deck and validate purpose, count, general, and eligibility before any bypass or session setup.
- [x] `app/ui/views/composite/deck_select_single_player.js` and `app/application.coffee` -- Send saved deck identity; preserve AI difficulty controls.
- [x] `app/sdk/challenges/sandbox.coffee` and Sandbox selection -- Validate both saved Sandbox decks before new-rules setup; leave Developer Sandbox legacy.
- [x] `server/ai/decks/usable_decks.js` or a Practice roster provider -- Use exact fixed cards at all difficulties with one selected general; fail closed if any roster card is ineligible.
- [x] Focused route, SDK setup, Sandbox, and bot tests -- Cover valid/invalid purposes, bypass, exact roster at difficulties, and legacy paths.

**Acceptance Criteria:**
- Given a selected Practice deck, when the server validates entry, then only purpose `practice`, one general, eight eligible cards, and the shared policy are accepted before `allCardsAvailable` can bypass other checks.
- Given a selected Sandbox deck, when concrete local Sandbox validates entry, then only purpose `sandbox` with one general and eight eligible cards is accepted before setup.
- Given any Practice general and difficulty, when the bot deck is built, then it contains exactly the specified eight cards once each and setup fails if an ID is excluded.
- Given a legacy or Developer Sandbox entry, when deck and bot setup run, then existing validation and card behavior remain unchanged.

## Implementation Notes

- User authorized completing the audited Epic 1 gaps and verification in this session. Preserve the frozen requirements; no new user-facing intent gaps remain.
- Existing dirty UI/card art/AI work is user-owned and must be retained. Do not reset/stage/overwrite unrelated changes; inspect any shared file before editing.
- Practice fixed roster construction already exists in create_single_player_game.coffee; retain it and add focused verification rather than replacing working behavior.
- Stored deck access must use authenticated user identity plus selected deck ID; existing numeric saved-card arrays must be normalized without trusting submitted cards/purpose.
- Extend server/validators/index.js, server/lib/data_access/decks.coffee (owned lookup), games.coffee, selection/application event flow, and Sandbox descriptor validation. Preserve existing legacy/Developer Sandbox paths.
- No production credentials are needed for unit tests: stub Firebase/database access at the test boundary. Do not fabricate credentials or contact production Firebase.
- Reuse test/unit/server/api/decks_routes.js patterns and add an HTTP Practice entry suite. Avoid importing a new framework.
- Local temporary Redis for these tests is duelyst-codex-test-redis on localhost:6379; host network tests require the unrestricted runner.


### Implementation evidence (2026-11-01)

- Practice submits `deck_id`; the server looks up authenticated owner plus deck ID and validates saved purpose/cards before availability checks or session creation. Submitted cards/purpose cannot override the record.
- Shared `CardEligibility.validateSavedDeck` validates saved descriptors; `UsersModule.isAllowedToUseDeck` enforces Practice format before `allCardsAvailable` and accepts valid nine-card decks when inventory checks run.
- Concrete Sandbox validates both saved descriptors before setup. Developer Sandbox retains raw legacy arrays and ruleset.
- Preserved the exact fixed Practice roster and difficulty behavior, bypassed legacy deck construction for Practice, and prevented setup options from replacing its roster.
- Removed unsaved synthetic Practice starter choices; new-rules selectors default to saved custom decks. Practice opponents are audited generals.
- Added `duelyst/test/unit/server/api/practice_entry.js`: 49 cases covering HTTP identity/invalid inputs, bypass ordering, inventory-enabled entry, Sandbox descriptors, Developer compatibility, all nine audited generals at difficulties 0/0.5/1, and incomplete/ineligible bot rosters.

### Verification evidence (2026-11-01)

- Focused Practice entry, deck routes, card eligibility, and game setup: 95 passing, one pre-existing failure. The stale general-start fixture expects (-2,4)/(2,4), while the current committed board uses (-1,2)/(7,2); root is repairing that baseline separately.
- All seven changed CoffeeScript files compile. CoffeeLint has no errors with line endings ignored; two existing unnecessary-fat-arrow warnings remain in app/application.coffee at lines 670 and 3245.
- `git diff --check` passes. Tests used the local temporary Redis with authorized unrestricted localhost access; no production Firebase credentials or Firebase access were used.
- Status remains in-progress pending root integrated verification and independent review.

## Spec Change Log


## Review Triage Log


## Design Notes

Validate stored deck purpose by database lookup rather than trusting the request's `purpose` or ID array. This keeps saved records, purpose, and cards as one authoritative choice while preserving the current API's anti-cheat checks.

## Verification

**Commands:**
- Run focused server deck validation, game setup, Sandbox, and Practice bot tests -- expected: all pass.
- Compile changed CoffeeScript files, run CoffeeLint with the repository line-ending rule ignored, and run `git diff --check` -- expected: clean.


### Integrated review triage (2026-11-01)

| Reviewer / finding | Verdict / route | Evidence |
| --- | --- | --- |
| Blind: purpose switching removes cards | medium / defer | Pre-existing DeckModel conversion filtering is unchanged; preserve/confirm conversion separately. |
| Blind: cached Sandbox selections bypass filter | medium / patch | Restoration searches full collection; reuse purpose/validity filter and clear incompatible cached choices. |
| Blind: only primary audited opponents visible | medium / patch | Secondary generals were AI-tools-only; derive choices from audited IDs. |
| Blind: incomplete drafts rejected on save | medium / defer | Prior deck-management contract rejects incomplete decks; separate editor/save treatment is needed, without weakening entry validation. |
| Blind: null bestObjective dereference | medium / defer | Committed positional scoring accesses getPosition before null fallback; untouched by this repair. |
| Blind: resize retains old origin | medium / defer | Existing utils_hex_view redraw closure captures origin/projection; untouched here. |
| Blind: repeated board diameter computation | low / defer | User-owned untracked AI geometry predates task; pairwise work exists but latency is unmeasured. |
| Blind: generic empty-state instructions | medium / patch | Saved-only entry needs purpose-specific nine-card deck guidance, preserving legacy views. |
| Blind: runtime AI sequence untested | medium (unverified) / defer | Existing user AI work is not tested by setup/roster assertions; deterministic runtime turns would settle legality/scoring. |
| Blind: hand confirmation lifecycle untested | medium / patch | New caller tests execute production chooser/submission with successful reveal and destroyed/replaced/session-changed guards. |
| Edges: null objective access before guard | medium / defer | Same pre-existing baseline issue; logged individually. |
| Edges: resize captures origin | medium / defer | Same pre-existing display concern; logged individually. |
| Verification: saved ID UI caller untested | medium / patch | New production-method test executes selection event through application request builder and asserts serialized deck_id. |
| Verification: hand confirmation untested | medium / patch | Successful/stale scenarios now execute real source functions with controlled dependencies. |

Review diff includes historical commits and user-owned dirty UI/AI/art. These are not attributed to this repair. Existing user work is preserved.

### Final integrated verification (2026-11-01)

- 224 tests passed in one server/UI/SDK run, including 49 saved-deck/roster cases, five fixed-hand mutation cases, and twelve UI caller/lifecycle cases.
- Ten changed CoffeeScript files compile. CoffeeLint reports zero errors (CRLF rule ignored), with only two pre-existing application.coffee fat-arrow warnings. Changed JavaScript files pass ESLint.
- Initial setup and reconstruction use a try/finally private insertion permission; post-setup session/raw Deck insertion rejects before card data, indexing, relocation, or events. Legacy insertion and null-slot snapshot/replay reconstruction pass.
- Original 12 baseline failures plus the newly observable stale start-position assertion are resolved without relaxing eligibility, changing current geometry, or removing damage assertions.
- Local Redis is an isolated temporary container on loopback; unit tests stub database/Firebase boundaries and need no production credentials. A full deployed browser/Firebase environment was not exercised.
- Three independent review layers completed; introduced caller/selection gaps were fixed and tested. Pre-existing editor/AI/resize findings are recorded individually in the review log and deferred-work.md. No unrelated UI/AI/art work was overwritten.


Local implementation commit: e942ea338b402b6c8349b01f1b8bcffae34b1d7c. No remote push.
