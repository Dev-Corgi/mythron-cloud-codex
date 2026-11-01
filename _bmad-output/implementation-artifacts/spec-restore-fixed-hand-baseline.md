---
title: 'Restore a verifiable fixed-hand rules baseline'
type: 'bugfix'
created: '2026-11-01'
status: 'done'
route: 'dispatch'
baseline_commit: '1bf87ed8fc9bf46f99cae556acb8fb65bcc0154b'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent">
## Intent

**Problem:** Existing baseline tests use obsolete new-rules fixtures, and direct internal hand/deck mutation APIs can bypass fixed-hand restrictions after initialization.
**Approach:** Repair fixtures without weakening gameplay policy, restrict additions to legitimate initial setup/reconstruction, and verify fixed slots and legacy compatibility.

## Boundaries & Constraints

**Always:** Preserve existing user changes, coordinate formats, current committed geometry/start positions, exact allowlist, fixed bot roster, and legacy behavior. New-rules hands initialize with eight cards; later gameplay may only clear played slots, never add/return/refill cards. Legitimate full snapshot restoration and replay setup remain supported.
**Never:** Enable excluded cards to make tests pass; remove assertions; change expected damage to zero; restore an obsolete board layout; use broad game-status checks as a setup permission; serialize initialization permission; contact production services.

## I/O & Edge-Case Matrix

| Scenario | Input | Expected behavior | Handling |
| --- | --- | --- | --- |
| Mana tests | Valid audited nine-card decks | Existing reserve/mana assertions execute and pass | Fix fixture, not deck validator |
| Attacks | Audited 2-attack unit against durable audited enemy | Normal damage, no automatic counterattack; implicit-path and replay checks remain | Test-only modifier may exercise implicit predicate |
| Runtime hand/deck additions | Session and raw Deck methods, including a spent slot | No mutation, indexing, relocation, or events | Reject before side effects |
| Setup/reconstruction | Initial deck and replay starting state | Eight stable slots restored | Scoped private permission, reset even after exception |
| Legacy | Existing hand/deck additions | Existing behavior | No new restriction |

</frozen-after-approval>

## Code Map

- test/unit/sdk/game/mana.js: General-only hex fixture and excluded-card spend test; use fixed roster and play an existing card with expected index.
- test/unit/sdk/game/basic.js: excluded WindbladeAdept/Pyromancer fixture; use audited GolemMetallurgist and durable Drybone Golem. Attach test-only ModifierBlastAttack to exercise implicit path without expanding allowlist.
- test/unit/sdk/game/game_setup.js: obsolete version-1 start expectations. Current committed starts are (-1,2)/(7,2); retain current geometry, update stale fixture expectations. Artificial post-setup draw-pile fixtures must not demand production mutation bypass.
- app/sdk/gameSession.coffee: applyCardToHand/applyCardToDeck must reject before card data/index/location changes.
- app/sdk/cards/deck.coffee: putCardIndexInHand, putCardIndexInHandAtIndex, putCardIndexIntoDeck need matching runtime restrictions.
- app/sdk/gameSetup.coffee: addCardsToDeck/addCardsToDeckFromData are legitimate initialization boundaries; use scoped nonserialized private permission with try/finally. Deck.deserialize restores arrays directly.
- test/unit/sdk/game/actions_hand.js and game_setup.js: add direct/session mutation regressions and initialization permission exception coverage.

## Tasks & Acceptance

**Execution:**
- [x] Repair mana/basic/setup fixtures against current contracts and preserve substantive assertions.
- [x] Guard GameSession and raw Deck mutation APIs; scope initialization permission to setup/reconstruction.
- [x] Cover zero-side-effect rejection, spent slots, both hand/deck methods, initialization failure cleanup, setup/replay restore, and legacy additions.
- [x] Run focused baseline suites and compile/lint changed files.

**Acceptance Criteria:**
- Given valid audited fixtures, when reserve/no-counterattack checks execute, then normal gameplay assertions pass.
- Given a new-rules session after setup, when raw or session insertion methods are called, then hand/draw pile/card index and location state remain unchanged with no insertion events.
- Given setup/replay restoration, when eight-slot state is built, then legitimate cards and null positions are restored and private permission never survives an exception or serialization.
- Given legacy sessions, when the same addition methods run, then existing supported mutations work.

## Implementation Notes

User approved fixing the audited baseline gaps and proceeding without further per-story approvals. Use existing checkout while preserving unrelated dirty UI/AI/card-art work. No migration or external data change is needed. Environment Redis is a temporary local container duelyst-codex-test-redis; host-network tests need unrestricted execution. Firebase import warnings are not a need for production credentials: stub boundaries for unit tests.

## Spec Change Log

## Review Triage Log

## Verification

node node_modules/mocha/bin/_mocha --no-config --require coffeescript/register --timeout 10000 --exit --reporter dot test/unit/sdk/game/board.js test/unit/sdk/game/actions_validators.js test/unit/sdk/game/mana.js test/unit/sdk/game/game_setup.js test/unit/sdk/game/hand_slots.js test/unit/sdk/game/actions_hand.js test/unit/sdk/game/card_eligibility.js test/unit/sdk/game/basic.js test/unit/sdk/game/game_active.js test/unit/misc/hex_view.js

Compile changed CoffeeScript and run ESLint on changed test files; retain legacy controls.


### Final integrated verification (2026-11-01)

- 224 tests passed in one server/UI/SDK run, including 49 saved-deck/roster cases, five fixed-hand mutation cases, and twelve UI caller/lifecycle cases.
- Ten changed CoffeeScript files compile. CoffeeLint reports zero errors (CRLF rule ignored), with only two pre-existing application.coffee fat-arrow warnings. Changed JavaScript files pass ESLint.
- Initial setup and reconstruction use a try/finally private insertion permission; post-setup session/raw Deck insertion rejects before card data, indexing, relocation, or events. Legacy insertion and null-slot snapshot/replay reconstruction pass.
- Original 12 baseline failures plus the newly observable stale start-position assertion are resolved without relaxing eligibility, changing current geometry, or removing damage assertions.
- Local Redis is an isolated temporary container on loopback; unit tests stub database/Firebase boundaries and need no production credentials. A full deployed browser/Firebase environment was not exercised.
- Three independent review layers completed; introduced caller/selection gaps were fixed and tested. Pre-existing editor/AI/resize findings are recorded individually in the review log and deferred-work.md. No unrelated UI/AI/art work was overwritten.


Local implementation commit: e942ea338b402b6c8349b01f1b8bcffae34b1d7c. No remote push.
