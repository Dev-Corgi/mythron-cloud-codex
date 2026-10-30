---
title: 'Enter matches with valid decks and the fixed Practice bot'
type: 'feature'
created: '2026-10-30'
status: 'draft'
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
- [ ] `server/routes/api/me/games.coffee` and shared deck validation -- Fetch selected saved Practice deck and validate purpose, count, general, and eligibility before any bypass or session setup.
- [ ] `app/ui/views/composite/deck_select_single_player.js` and `app/application.coffee` -- Send saved deck identity; preserve AI difficulty controls.
- [ ] `app/sdk/challenges/sandbox.coffee` and Sandbox selection -- Validate both saved Sandbox decks before new-rules setup; leave Developer Sandbox legacy.
- [ ] `server/ai/decks/usable_decks.js` or a Practice roster provider -- Use exact fixed cards at all difficulties with one selected general; fail closed if any roster card is ineligible.
- [ ] Focused route, SDK setup, Sandbox, and bot tests -- Cover valid/invalid purposes, bypass, exact roster at difficulties, and legacy paths.

**Acceptance Criteria:**
- Given a selected Practice deck, when the server validates entry, then only purpose `practice`, one general, eight eligible cards, and the shared policy are accepted before `allCardsAvailable` can bypass other checks.
- Given a selected Sandbox deck, when concrete local Sandbox validates entry, then only purpose `sandbox` with one general and eight eligible cards is accepted before setup.
- Given any Practice general and difficulty, when the bot deck is built, then it contains exactly the specified eight cards once each and setup fails if an ID is excluded.
- Given a legacy or Developer Sandbox entry, when deck and bot setup run, then existing validation and card behavior remain unchanged.

## Implementation Notes


## Spec Change Log


## Review Triage Log


## Design Notes

Validate stored deck purpose by database lookup rather than trusting the request's `purpose` or ID array. This keeps saved records, purpose, and cards as one authoritative choice while preserving the current API's anti-cheat checks.

## Verification

**Commands:**
- Run focused server deck validation, game setup, Sandbox, and Practice bot tests -- expected: all pass.
- Compile changed CoffeeScript files, run CoffeeLint with the repository line-ending rule ignored, and run `git diff --check` -- expected: clean.
