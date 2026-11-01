---
date: 2026-11-01
status: passed-after-baseline-repair
epic: 2
documentChecks: passed
openReadinessChecks: 0
---

# Epic 1 baseline audit and Epic 2 final validation

Final result after the authorized baseline repair: all four original readiness checks are closed. The earlier audit below is retained as historical evidence; the remediation section records the current outcome. Epic 2 is a validated implementation plan, not implemented gameplay.

## Document validation

| Check | Result and evidence |
| --- | --- |
| Functional coverage | Pass: FR1-FR19 mapped to Epic 2 and concrete stories/acceptance criteria. |
| Quality and UX coverage | Pass: NFR1-NFR5 and UX-DR1-UX-DR7 mapped. |
| Story structure | Pass: 12 sequential stories (2.1-2.12), 56 Given/When/Then/And acceptance scenarios, requirements and dependency references, no template placeholders. |
| Dependencies | Pass within Epic 2: only preceding stories are required; Epic 1 baseline dependencies are explicit. Incremental map work is not released before complete integration. |
| Story scope | Pass as planning decomposition: version compatibility, geometry, rendering, hole movement, Walls, shared occupancy, obstruction, capture, deficit damage, legal AI, Wall tactics, balanced control tactics are bounded separately. This is a planning assessment, not measured implementation duration. |
| Architecture | Pass with explicit user-authorized overrides: same shared SDK/services/storage and coordinate formats, ruleset version 2 for new matches, preserved version 1 replay path. No new starter template/service/datastore or upfront unrelated entities. Wall entities are introduced in 2.5; point state in 2.8. |
| Epic value and file overlap | Pass: one complete player-facing outcome; shared board/action/view/AI changes are consolidated rather than split into technical-layer epics. |
| Latest decisions | Pass: six normal-to-edge ranged axes; circular hex-distance area radii; explosion-center direct transmission; only Wall interior intersections block; target-supporting-Wall exception; enemy-first direct target priority; no direct friendly attacks or allied area damage; both enemy occupant and Wall can take area damage; balanced AI. |
| Existing coordinates | Pass: no coordinate-system replacement/migration is requested. Only map-specific layout, neighbors, and starts change. |
| Baseline readiness | Pass after repair: see remediation below. R1-R4 are closed; separate pre-existing review findings remain deferred. |

The previous Epic 1 plan is preserved as epics-duelyst-rules-overhaul.md. Existing core architecture/context documents describe version 1 and remain historical baseline references; Epic 2's explicit version-2 overrides govern this feature.

## Epic 1 status reconciliation

Individual story files mark 1.1-1.9 and 1.11-1.12 done; 1.10 is draft with five unchecked execution tasks and no implementation/verification results. In contrast, sprint-status.yaml marks 1.4 done, ten other stories review, and 1.10 backlog. Therefore the tracker is stale or at least inconsistent with story records. A done frontmatter value is not sufficient evidence of an integrated, passing baseline. This audit does not automatically change statuses.

| Story | Individual document | Sprint tracker |
| --- | --- | --- |
| 1.1 | done | review |
| 1.2 | done | review |
| 1.3 | done | review |
| 1.4 | done | done |
| 1.5 | done | review |
| 1.6 | done | review |
| 1.7 | done | review |
| 1.8 | done | review |
| 1.9 | done | review |
| 1.10 | draft | backlog |
| 1.11 | done | review |
| 1.12 | done | review |

## Initial readiness checks (subsequently closed)

### R1 — Complete and verify saved-deck entry integration (Story 1.10)

Confirmed partial implementation, not wholly absent:
- server/lib/create_single_player_game.coffee already replaces Practice AI cards with CardEligibility.getPracticeBotRoster(), so the fixed roster has code support.
- app/sdk/rulesets/cardEligibility.coffee validates exactly nine cards, an audited General, exact card IDs, and copy limits.

Confirmed gaps:
- server/routes/api/me/games.coffee /single_player still reads result.value.deck, normalizes submitted card IDs, and validates their contents. It does not fetch a selected saved deck and validate its stored purpose/ownership as required by Story 1.10.
- app/application.coffee _startSinglePlayerGame submits a card array; it does not submit saved-deck identity.
- app/ui/views/composite/deck_select_sandbox.js passes only cards to the challenge; app/sdk/challenges/sandbox.coffee has no saved-purpose validation. Content validation alone does not establish that the selected saved deck is sandbox-purpose.
- The existing game_setup test invokes createSinglePlayerGame directly and stubs saving. It is not an HTTP-route test or a saved-deck identity/purpose test across difficulties.

Closure: finish Story 1.10's stored-deck entry checks and focused valid/invalid Practice/Sandbox/legacy tests, and verify the exact roster at every existing difficulty without changing the roster.

### R2 — Restore a passing baseline for mana and no-counterattack tests

The server-independent focused run finished with 105 passing and 12 failing.
- Ten failures in test/unit/sdk/game/mana.js occur in setup, before mana assertions: its fixtures contain only a General, while current CardEligibility.validateDeck requires a General plus eight cards.
- Two failures in test/unit/sdk/game/basic.js expect 2 damage but receive 0 in the hex explicit/forced-attack and implicit blast cases. The fixtures use Windblade Adept/Pyromancer while the current new-rules allowlist is restricted; fixture/policy interaction needs investigation. This audit does not assert that the no-counterattack mechanic itself is broken or that changing the expected damage is a valid fix.

Closure: reconcile fixtures with current contracts, investigate both attack failures, and rerun the relevant baseline checks without weakening the acceptance criteria.

### R3 — Resolve the deferred direct hand/deck mutation audit

The earlier deferred-work.md item remains relevant:
- GameSession.applyCardToHand and applyCardToDeck still perform direct mutation.
- Deck.putCardIndexInHand, putCardIndexInHandAtIndex, and putCardIndexIntoDeck do not themselves enforce the post-setup fixed-hand restriction.
- PutCardInHandAction and PutCardInDeckAction contain ruleset guards, so guarded action paths and raw mutation methods must not be conflated.
- No direct-method regression coverage was found in the inspected actions_hand test.

This is a confirmed unguarded internal API surface and an open reachability/setup-replay audit, not proof that a player can currently exploit it. Closure: classify setup/reconstruction versus runtime callers, enforce the no-later-mutation invariant where necessary, and verify legitimate initial setup/replay remains functional.

### R4 — Run server-backed verification with working dependencies

After the user started Docker:
- A Docker query outside the restricted runner succeeded. Only duelyst-db-1 (PostgreSQL) was running, with container port 5432 and no published host port shown. No Redis container was running.
- The restricted runner first reported EACCES for Docker/localhost Redis. This alone did not prove Redis was down.
- A server-test retry outside that restriction then reported ECONNREFUSED at 127.0.0.1:6379, confirming Redis was unavailable at the endpoint used by these tests.
- The same retry also logged FIREBASE_PROJECT_ID must be set. Further Firebase dependencies may remain after Redis is available; this run cannot certify them.
- docker-compose.yaml defines redis without a host ports mapping. Merely enabling that service would not automatically make host-run tests reach localhost:6379.

Closure: provide the required local Redis endpoint and appropriate test configuration, then rerun the server-including tests. No containers were started/stopped and no server/environment settings were changed by this audit.

## Deferred-work cross-check

- Locale fallback: configuration evidence exists in app/localization/index.coffee (fallbackLng: en). Missing translations are therefore not automatically missing fallback, although actual browser rendering was not exercised.
- Fixed hand UI: hand_slots.js exercises the production binding helper using fake nodes with a null gap. It does not instantiate the full BottomDeckLayer; that broader UI verification remains unproven.
- Deck size/copy limits and purpose-aware model work have implementation evidence, so the older deferred notes must not be treated as an up-to-date list of entirely absent code.
- The HTTP Practice rejection test remains unverified; test/unit/server/api/decks_routes.js covers the deck-management route, not /api/me/games/single_player.

## Commands and limits

Server-independent run (executed from C:/Working/duelyst/duelyst):

node node_modules/mocha/bin/_mocha --no-config --require coffeescript/register --timeout 10000 --exit --reporter dot test/unit/sdk/game/board.js test/unit/sdk/game/actions_validators.js test/unit/sdk/game/mana.js test/unit/sdk/game/hand_slots.js test/unit/sdk/game/actions_hand.js test/unit/sdk/game/card_eligibility.js test/unit/sdk/game/basic.js test/unit/sdk/game/game_active.js test/unit/misc/hex_view.js

Result: 105 passing, 12 failing, exit 1.

Server-including retry after Docker startup, outside the restricted runner:

node node_modules/mocha/bin/_mocha --no-config --require coffeescript/register --timeout 10000 --exit --reporter dot test/unit/sdk/game/game_setup.js test/unit/server/api/decks_routes.js

Result: aborted with Redis ECONNREFUSED and Firebase project configuration error; no passing server-test count claimed.

The tests concern the existing Epic 1 baseline. Epic 2 is a plan, and its unimplemented gameplay has not been tested. Readiness findings are recorded for subsequent implementation/repair; this validation request did not authorize changing gameplay code.

## Remediation and final result (2026-11-01)

| Original check | Closure evidence |
| --- | --- |
| R1 saved-deck entry | Authenticated saved lookup/purpose/content validation before bypass; UI ID flow; both Sandbox descriptors; Developer legacy preserved; fixed roster for nine audited generals at three difficulty samples. HTTP/SDK/UI cases pass. |
| R2 baseline failures | Valid audited nine-card mana fixtures; real fixed-slot card spending; audited no-counterattack fixtures with original damage/replay assertions; obsolete General positions aligned with current committed baseline. All original failures closed. |
| R3 direct mutations | Session and raw Deck insertion guards reject post-setup changes before side effects. Private try/finally setup permission supports initial eight cards and replay restoration, clears after exceptions, and is not serialized. Five targeted tests pass. |
| R4 execution environment | Isolated temporary Redis container duelyst-codex-test-redis provides localhost:6379. Server suites execute using stubbed Firebase/database boundaries; production Firebase credentials are not required for these unit tests. |

Final integrated command adds fixed_hand_mutations.js, practice_ui_paths.js, and practice_entry.js to the baseline suites listed above. Result: **224 passing, zero failing**. All ten changed CoffeeScript files compile; CoffeeLint has zero errors and two unchanged application warnings. Changed JavaScript passes ESLint and the task diff passes whitespace checks.

Three independent review layers ran. Saved-ID caller propagation, automatic hand confirmation lifecycle, Sandbox cached-purpose filtering, all audited opponent choices, and purpose-specific empty-state navigation now have executable caller tests. Existing editor conversion/draft-save, AI null-objective/diameter/runtime coverage, and resize findings are recorded in deferred-work.md; they are not claimed fixed by this baseline repair.

Sprint records now match eleven pre-existing done story files. Story 1.10's implementation spec is done and its sprint entry is review, per the build workflow's handoff convention; Epic 1 stays in-progress until that review is accepted. This does not reopen the four resolved implementation-readiness checks. No Epic 2 stories are marked implemented.

No live browser rendering or production Firebase integration test was run. The UI tests execute actual production methods with controlled dependencies, not a full graphical session. Existing user-owned UI, AI, and art changes remain intact.

Baseline repair local commit: e942ea338b402b6c8349b01f1b8bcffae34b1d7c. No remote push. Existing user UI/AI/card-art changes remain outside this commit.
