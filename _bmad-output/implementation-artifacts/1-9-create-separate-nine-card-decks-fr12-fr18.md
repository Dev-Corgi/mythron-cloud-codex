---
title: 'Create separate nine-card decks'
type: 'feature'
created: '2026-10-30'
status: 'done'
route: 'dispatch'
baseline_commit: '9c1f7c5751bd9da3c806ca9a604dd01621111f18'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/1-7-manage-persistent-reserve-funded-mana-fr8-fr11.md'
  - '{project-root}/_bmad-output/implementation-artifacts/1-8-keep-conflicting-cards-out-of-new-rules-matches-fr17-fr18-fr.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Practice and Sandbox currently share ordinary 40-card decks, so players cannot prepare separate decks for the new eight-card hands without affecting their existing modes.

**Approach:** Persist a deck purpose (`legacy`, `practice`, or `sandbox`) and provide purpose-aware deck editing. New-rules decks contain exactly one general plus eight eligible cards; existing decks without a purpose remain legacy and keep their card lists unchanged.

## Boundaries & Constraints

**Always:** Store Practice and Sandbox decks as separate records, preserve their purpose and card IDs across save/load, and show the correct purpose, size, and eligibility in the editor and selectors. New-rules deck validation requires exactly one general and eight non-general cards, all accepted by the shared card-eligibility policy. Missing or unknown purpose resolves to `legacy`; preserve the legacy 40-card size, current card lists, and existing mode selection. Use the same shared eligibility policy established by Story 1.8: the documented eight-card Practice roster, compatible canonical general/signature pairs only, and their audited generated dependencies. Generated dependencies are not deck choices; unaudited variants and other IDs remain excluded.

**Never:** Auto-convert old decks, resize or rewrite their card lists, mix Practice and Sandbox purposes, or change legacy deck behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New-rules deck | Purpose practice or sandbox; one general and eight eligible cards | Save/load same purpose and nine IDs | Reject missing/extra general or wrong count |
| Ineligible card | New-rules deck includes card rejected by shared policy | Editor disallows it and persistence rejects invalid deck | Existing validation response |
| Old deck | Purpose absent; existing 40 card IDs | Resolve to legacy; IDs stay unchanged | N/A |
| Separate purposes | One Practice and one Sandbox deck | Both persist independently and appear only in matching selectors | N/A |
| Legacy edit | Purpose absent or legacy; existing rules | Existing 40-card editing behavior remains | Existing validation behavior |

</frozen-after-approval>

## Code Map

- `app/ui/models/deck.js` -- `changeCardModel` enforces current 40-card cap and duplicate/general rules; `updatePropertiesFromCardModels` derives validity and legacy metadata. Add purpose-aware caps/validation while preserving legacy defaults.
- `app/ui/views2/collection/collection.js`, `deck.js`, `deck_metadata.js`, `deck_cards.js` -- editor creation, metadata, and card list; expose purpose and matching size/eligibility constraints.
- `app/ui/views/composite/deck_select.js`, `deck_select_single_player.js`, `deck_select_sandbox.js` -- filter choices by purpose; keep decks without a purpose in existing legacy paths until new-rules selection is enabled.
- `app/ui/collections/user_decks.js` and `/api/me/decks` in `server/routes/api/me/decks.coffee` -- shared REST persistence; normalize missing purpose to `legacy` and preserve integer card IDs.
- `server/lib/data_access/decks.coffee`, `server/validators/index.js`, `server/validators/types.js` -- persistence and request schema currently lack a purpose field. `user_decks.cards` is an integer array; add a reversible nullable purpose migration without rewriting cards.
- `app/common/config.js` -- `MAX_DECK_SIZE` is 40 and includes the general; use 9 for Practice/Sandbox only.
- `test/integration/data_access/decks.js` and `test/unit/sdk/game/game_setup.js` -- existing persistence and mode coverage; add purpose roundtrip, old-deck fallback, and new-format constraints. No dedicated DeckModel test exists yet.

## Tasks & Acceptance

**Execution:**
- [x] `server/migrations/` and `server/lib/data_access/decks.coffee` -- Persist deck purpose with old rows resolving to legacy and card arrays untouched.
- [x] `server/validators/index.js`, `server/validators/types.js`, and `/api/me/decks` -- Accept valid purposes, preserve them on CRUD, and reject invalid new-rules sizes/cards.
- [x] `app/ui/models/deck.js` -- Add purpose-aware size, general, duplicate, eligibility, and validity rules; retain legacy 40-card behavior.
- [x] Collection editor and Practice/Sandbox selectors -- Create/edit each purpose, display constraints, and show only matching-purpose decks.
- [x] Focused DeckModel, API, persistence, and selector tests -- Cover roundtrip, exact counts, eligibility, old rows, and legacy compatibility.

**Acceptance Criteria:**
- Given a player creates or edits a Practice/Sandbox deck, when saved, then its purpose matches the mode and it has one general plus eight eligible cards.
- Given a deck has no purpose, when loaded or edited, then it resolves to legacy and its existing 40-card list remains intact.
- Given Practice and Sandbox decks are saved and reopened, when the editor and selectors display them, then purpose and card lists remain separate and the correct size/eligibility rules are shown.
- Given a legacy deck is used in an existing mode, when edited or selected, then its legacy validation and card list behavior remain unchanged.

## Implementation Notes

- Added a nullable purpose field, with API and editor fallback for old rows, and applied the shared roster policy at deck editing, persistence, and mode selection.
- Focused unit and API-route tests pass. The DB-backed persistence suite is present but could not connect: local PostgreSQL rejected the configured `duelyst` password, so the migration roundtrip still needs an environment with working DB credentials.

## Spec Change Log


## Review Triage Log

- **false —** The deck preview separator is a valid UTF-8 middle dot (`U+00B7`); the rendered template contains no replacement characters.
- **medium —** Deck validation did not enforce the editor's copy limit, allowing an invalid API submission. Routed as patch: `validateDeck` now rejects any neutral card count above `MAX_DECK_DUPLICATES`; focused validator and route tests pass.
- **false —** The `/single_player` route is the Practice entry and maps to the new ruleset; Boss Battle has its own route and `GameType.BossBattle` path. New-rules validation is therefore expected here.
- **false —** `createSinglePlayerGame` uses the fixed roster only when `gameType` is `SinglePlayer`; RulesetsLookup maps that mode to Practice, while Boss Battle remains separate.
- **false —** Existing rows may remain NULL in storage as specified, but the deck API and DeckModel normalize missing/unknown purposes to `legacy`; no other active deck reader bypasses those adapters.
- **low —** The editor labels were hard-coded and did not expose a localized eligibility description. Routed as patch: purpose and eligibility labels now use the collection translation namespace with English, German, and Traditional Chinese entries.
- **false —** Accepted new-rules decks require exactly nine IDs, so setup cannot receive a shorter deck that contradicts the eight-card starting-hand instruction.
- **false —** Purpose is optional and unknown values normalize to `legacy` by explicit frozen requirements; no contradictory rejection behavior is required.
- **false —** The literal ruleset checks predate this change and there is only one new-rules ruleset in the registry; adding another ruleset is not an input to this story.
- **medium —** Route-level coverage did not prove invalid POST/PUT submissions are stopped before persistence. Routed as patch: new Express tests assert HTTP 400 and that the DAO stubs are not called.
- **false —** The edge review's legacy bot concern is disproved by the `GameType.SinglePlayer` Practice mapping and the separate Boss Battle path.


## Design Notes

Keep purpose distinct from the existing `_isLegacy` card-set marker: the latter describes card metadata, not which match format a saved deck belongs to. Older rows with a missing purpose must not be migrated by changing their cards.

## Verification

**Commands:**
- `node_modules/.bin/mocha --no-config --require coffeescript/register --timeout 10000 --exit test/unit/sdk/game/card_eligibility.js test/unit/sdk/game/game_setup.js test/unit/server/api/decks_routes.js` -- expected: all pass.
- Run `test/integration/data_access/decks.js` with PostgreSQL credentials configured -- expected: purpose roundtrip and existing deck persistence pass.
- Compile changed CoffeeScript, lint with the repository line-ending rule ignored, validate locale JSON, and run `git diff --check` -- expected: clean.
