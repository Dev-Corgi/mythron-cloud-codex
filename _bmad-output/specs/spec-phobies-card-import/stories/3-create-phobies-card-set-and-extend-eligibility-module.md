---
title: 'Create the Phobies card set and extend card eligibility'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: 'd1de885a4d78094407152948546bb1648cc84c3b'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/card-roster.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-phobies-card-import-2026-11-02/ARCHITECTURE-SPINE.md'

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repository has no isolated Phobies card set, and Practice/Sandbox eligibility currently represents the previous card roster. New card definitions need stable identities and role-based eligibility without changing legacy card behavior or discarding existing signature, generated-dependency, Wall, and Methron rules.

**Approach:** Reserve IDs 50001–50035 for the 35 imported units, register a Phobies set/factory and symbolic card IDs, centralize the temporary `[PB] ` name prefix, and extend `cardEligibility` with the new v2 deckable and ability-effect roles. Apply one shared Phobies exclusion predicate to generic card-pool caches while keeping full ID lookup available for Practice/Sandbox runtime resolution.

## Boundaries & Constraints

**Always:** Preserve legacy card definitions and v1 Practice/Sandbox legality. Keep existing eligibility entries and provenance checks. Effect legality derives from the owning unit's `effectCardId`; it must not be a duplicate allowlist. Only Practice/Sandbox v2 uses the new deckable roster. Prefix is display-only and applied at one name-display point.

**Never:** Do not define the 35 card stats or active-effect cards in this story; those belong to later stories. Do not make Phobies cards available through legacy collection, shop, crafting, draft, reward, or random pools. Do not break ID lookup of registered Phobies cards in Practice/Sandbox.

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| V2 deck choice | v2 Practice/Sandbox with the Phobies roster registered | Only registered Phobies unit IDs and generals are deck choices; signatures remain governed by their existing checks | Reject non-deckable IDs |
| Effect provenance | Ability use references its source unit's `effectCardId` and owner | Effect is allowed only through that owning unit's ability action | Reject unrelated or wrong-owner effect cards |
| Legacy pool | Generic card-pool cache includes Phobies definitions | Shared exclusion removes Phobies from pool lists while root ID lookup still resolves them | No fallback to name matching |
| Legacy ruleset | v1 Practice/Sandbox or other mode | Existing roster, signature, generated-dependency, Wall, and Methron behavior remains unchanged | Existing validation behavior |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/cards/cardSetLookup.coffee`, `cardSetFactory.coffee`, `cardsLookup.coffee`, `cardFactory.coffee` -- register the new set, symbolic IDs, and factory chain alongside existing sets.
- `duelyst/app/sdk/cards/factory/` -- follow existing set factory patterns; Story 3 registers a factory shell, with card definitions added in Story 4.
- `duelyst/app/sdk/cards/card.coffee` -- `getName()` is the shared name presentation point; keep the prefix there conditional on Phobies card-set identity.
- `duelyst/app/sdk/gameSession.coffee` -- `_buildCachesIfNeeded` builds all-card dimension caches. Filter pool cache membership with a shared predicate, while retaining a complete ID index for direct resolution.
- `duelyst/app/sdk/rulesets/cardEligibility.coffee` -- extend existing roster/role checks; retain signature IDs, generated dependencies and setup/runtime validation. Gate the new deck roster to v2 only.
- `duelyst/test/unit/sdk/game/card_eligibility.js` and card/cache test suites -- extend coverage for v2 roles, legacy preservation, pool exclusion, and ID lookup.
- `duelyst/app/sdk/cards/cardsLookup.coffee` has no IDs in 50001–50035; reserve that contiguous range for the roster order in `card-roster.md`.

## Tasks & Acceptance

**Execution:**
- [x] Register `CardSet.Phobies` in `cardSetLookup.coffee` and metadata in `cardSetFactory.coffee`; it must not be enabled for legacy progression or orb pools.
- [x] Add symbolic IDs `Phobies.*` for the 35 roster rows using 50001–50035, and register a Phobies factory module in `cardFactory.coffee` that returns no card until Story 4 supplies definitions.
- [x] Add one shared `isExcludedFromLegacyCardPools(card)` predicate and use it when constructing generic pool cache lists; keep root `getCardById` backed by the complete card index.
- [x] Add the removable `[PB] ` display prefix at `Card.getName()` for Phobies-set cards only.
- [x] Extend `cardEligibility.coffee` with a v2-only Phobies deckable role and `abilityEffect` validation derived from source-unit `effectCardId`; retain the current roster entries until Story 14 performs the exclusive allowlist replacement, and preserve all v1 behavior.
- [x] Add and run focused tests for set/ID/factory registration, prefix scope, pool filtering versus ID resolution, v2 eligibility, effect provenance, and legacy behavior.

**Acceptance Criteria:**
- Given a Phobies card definition is registered, when it is requested by ID in Practice/Sandbox, then the factory chain and full card ID lookup resolve it with Phobies set identity.
- Given generic card-pool caches are built, when a card belongs to the Phobies set, then it is absent from legacy pool lists while direct ID lookup still resolves the card.
- Given a Phobies card name is displayed, when `getName()` is called, then `[PB] ` appears exactly once; other sets' names remain unchanged.
- Given a v2 deck or ability action is validated, when its IDs meet the deckable or owning-unit effect role, then it passes; otherwise it is rejected.
- Given v1 or legacy rules are used, when eligibility is checked, then all prior signature, generated-dependency, Wall, Methron, and deck legality behavior remains intact.

## Implementation Notes

- Registered card set 9 and the 35 symbolic card IDs in the unused contiguous range 50001–50035, in `card-roster.md` order. The factory chain includes a neutral shell; Story 4 adds the actual definitions.
- The generic cache pool builder excludes Phobies-set cards using a shared set-ID predicate, while root `getCardById` uses the complete card index. `Card.getName()` adds `[PB] ` once for Phobies-set cards.
- Eligibility retains v1 entries and adds exact `practice-sandbox-hex:2` checks for Phobies deck IDs and ability effects derived from the source unit's `effectCardId`. The existing eight-card Practice bot roster remains temporarily accepted in v2 until Story 14 updates the bot and presets; the Planar Scout placeholder is rejected in v2.
- The Practice/Sandbox deck editor, Sandbox launch, server deck POST/PUT, Practice entry, and SinglePlayer authorization now pass the exact v2 ruleset context where those current flows launch v2.

## Spec Change Log

## Review Triage Log

- `false` — `validateSetupData` gates on `isNewRules`, but that predicate checks the shared `practice-sandbox-hex` ruleset ID, which is used by both v1 and v2; v2 setup validation therefore does not bypass the roster checks.
- `false` — `DeckModel` passes the exact v2 context in the Practice/Sandbox deck editor, whose current deck purpose launches the v2 ruleset; no v1 deck-selection path is exposed by this UI.
- `false` — The effect-action v2 gate is present in the reviewed source, so v1 matching source effects are not rejected by this change.
- `false` — The Phobies factory intentionally returns null until Story 4 registers definitions; this story's factory registration is tested without prematurely defining cards.
- `false` — The cache change preserves the explicit root `getCardById` lookup required by the spec; grouped cache views are pool lists and remain filtered.
- `false` — Existing eligibility tests continue to cover signature pairing, generated dependencies, Wall/Methron rules and legacy legality; the focused suite passed with the added cases.
- `false` — The edge-case claim that v1 ability effects are rejected is disproved by the current implementation: it applies the exact v2 check only when the ruleset is `practice-sandbox-hex:2`, while v1 has no such check.
- `medium` — `DeckModel`'s v2-context integration needed direct consumer coverage because helper tests alone would pass if the editor stopped passing its v2 context; route: `patch`; fixed by a consumer-level add-card test.
- `medium` — Practice/Sandbox server deck save and Practice launch validation called `validateDeck`/`validateSavedDeck` without v2 context, so new Phobies decks were rejected as non-deckable; route: `patch`; fixed by passing the exact v2 context and adding route/entry regression tests.
- `medium` — Replacing the existing roster in Story 3 makes the current Practice bot's fixed legacy roster fail v2 setup before Story 14 can replace the bot deck; route: `patch`; fixed by temporarily accepting the eight current bot IDs in v2.

## Verification

**Commands:**
- From `duelyst`, run `node_modules/.bin/mocha -t 1000 test/unit/sdk/game/card_eligibility.js test/unit/ui/models/deck_phobies_eligibility.js` -- expected: 13 passing.
- From `duelyst`, run `node_modules/.bin/mocha --exit -t 1000 --grep "Phobies" test/unit/server/api/decks_routes.js test/unit/server/api/practice_entry.js` -- expected: 3 passing.
- From `duelyst`, run `node_modules/.bin/mocha --exit -t 1000 --grep "fixed Practice bot at every difficulty" test/unit/server/api/practice_entry.js` -- expected: 29 passing.
- Run changed-file CoffeeLint, ESLint, and `git diff --check` -- expected: clean.

## Design Notes

`cardEligibility.isNewRules()` identifies the Practice/Sandbox ruleset family, which includes both v1 and v2. Preserve that method for existing callers and add an exact v2 check for Phobies eligibility. Keep general IDs and signatures under their existing special validation: a general occupies the first deck slot, while its matching signature is governed by `GENERAL_SIGNATURE_IDS`.

Story 3 stages the new v2 Phobies eligibility without breaking the existing fixed Practice bot roster. Preserve the old roster temporarily in v2 as well; Story 14 is the planned point that replaces it atomically with the Phobies roster and updates bot/preset decks.

The cache builder serves two distinct needs. Its grouped card arrays feed legacy pools, while root card-ID lookup also resolves cards submitted to a Practice/Sandbox game. The shared exclusion policy must therefore be applied to pool arrays without removing Phobies definitions from the complete root ID index. Preserve the existing semantics of more specific grouped lookups and exercise both sides in tests.
