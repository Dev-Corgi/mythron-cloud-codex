---
title: 'Start with eight fixed hand slots (FR14, FR15, FR19)'
type: 'feature'
created: '2026-10-30'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '9c1f7c5751bd9da3c806ca9a604dd01621111f18'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** New-rules matches must expose the complete eight-card deck immediately, but the shared SDK and game UI currently use legacy hand limits and opening mulligan/replacement flows. Variable or compacted arrays make a played card's former position ambiguous.

**Approach:** Give only `practice-sandbox-hex` matches eight stable hand slots, load all eight non-general deck cards into slots in deck order, and preserve null holes through play, rendering, snapshots, restoration, and replay. Keep the legacy hand size and behavior unchanged. New-rules startup may confirm the already-set hand but cannot redraw or replace its cards.

## Boundaries & Constraints

**Always:** Resolve hand size from the immutable match ruleset. New-rules hand arrays have exactly eight positions; spent slots are `null`; card play must match both the chosen slot and its current card instance. Preserve slots through serialization and UI binding. Legacy behavior remains unchanged.

**Never:** Change global legacy hand constants, compact or shift new-rules slots, draw or mulligan replacements at startup, allow replacement in a new-rules match, or implement later-turn draw/refill/fatigue policy (Story 1.12).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New-rules setup | Valid nine-card deck including general | All eight other cards in slots 0–7, ordered as deck; draw pile empty | Invalid/missing cards do not shift later slot assignments |
| Startup confirmation | New-rules initial hand; empty mulligan indices | Startup completes without changing any slot | Reject non-empty mulligan indices |
| Play / stale slot | Slot and matching card instance; then empty, mismatched, or stale pair | Matching play nulls only that slot; others retain their prior values | Reject invalid pair without moving other cards |
| Persistence and display | Hand containing cards and nulls | Eight positions remain aligned through snapshot, restore, replay, and UI binding | No compaction or shifting |
| Legacy control | Legacy setup, startup, replacement, and play | Existing configured size and behavior remain in effect | Existing validation remains authoritative |

</frozen-after-approval>

## Code Map

- `app/sdk/cards/deck.coffee` -- hand construction, size-based loops, null-slot mutation, replacement eligibility, and deserialization; derive the size per session ruleset while preserving legacy defaults.
- `app/sdk/gameSetup.coffee` -- opening hand and draw-pile construction, plus setup-data reconstruction; new-rules cards must map to original deck positions.
- `app/sdk/actions/drawStartingHandAction.coffee` and `app/sdk/validators/validatorExecuteExplicitAction.coffee` -- startup confirmation and mulligan validation.
- `app/sdk/validators/validatorReplaceCardFromHand.coffee` and `app/sdk/validators/validatorPlayCard.coffee` -- disallow replacement and retain authoritative slot/card checks.
- `app/ui/views/layouts/game.js`, `app/ui/views/layouts/game_player.js`, `app/view/layers/game/BottomDeckLayer.js`, `app/view/layers/game/GameLayer.js`, `app/view/layers/game/handSlotUtils.js`, `app/common/utils/utils_engine.js`, and locale resources -- startup flow, dynamic slot display/counts, hand bounds, and localized confirmation.
- `app/sdk/gameSession.coffee` -- existing hand application/removal and replay/snapshot paths; reuse nulling semantics.
- `server/ai/starter_ai.js`, `server/ai/phase_ii_ai.js`, `server/ai/card_intent/card_intent.js`, scoring helpers, and `server/single_player.coffee` -- Practice bot hand-cap assumptions, slot scans, and animated selection positions.
- `test/unit/sdk/game/game_setup.js`, `test/unit/sdk/game/actions_hand.js`, and `test/unit/sdk/game/hand_slots.js` -- setup, mutation, persistence/replay, UI binding, and legacy compatibility coverage.

## Tasks & Acceptance

**Execution:**
- [x] `app/sdk/cards/deck.coffee` -- make slot count, iteration, and restoration ruleset-aware -- preserve fixed new-rules slots without changing legacy defaults.
- [x] `app/sdk/gameSetup.coffee` -- initialize all eight cards in stable deck order for hex sessions and reconstruct them positionally -- avoid random opening-hand selection and maintain replay identity.
- [x] `app/sdk/actions/drawStartingHandAction.coffee`, `app/sdk/validators/validatorExecuteExplicitAction.coffee`, and `app/sdk/validators/validatorReplaceCardFromHand.coffee` -- permit only no-change startup confirmation and reject new-rules replacement/mulligan -- protect the fixed hand.
- [x] `app/sdk/validators/validatorPlayCard.coffee` and related action tests -- verify slot/card identity and preserve null holes -- prevent stale actions from consuming another card.
- [x] `server/ai/starter_ai.js`, `server/ai/phase_ii_ai.js`, `server/ai/card_intent/card_intent.js`, scoring helpers, and `server/single_player.coffee` -- derive hand capacity from the deck ruleset -- allow the Practice bot to scan, score, and select all eight slots.
- [x] `app/ui/views/layouts/game.js`, `app/ui/views/layouts/game_player.js`, `app/view/layers/game/BottomDeckLayer.js`, `app/view/layers/game/GameLayer.js`, `app/view/layers/game/handSlotUtils.js`, `app/common/utils/utils_engine.js`, and localized fixed-hand labels -- show all eight stable slots and remove new-rules card-changing startup/replacement UI -- keep displayed positions consistent with SDK indices.
- [x] `test/unit/sdk/game/game_setup.js`, `test/unit/sdk/game/actions_hand.js`, and `test/unit/sdk/game/hand_slots.js` -- cover matrix rows and reviewer-found setup edges for excess input, startup, play, invalid slot pairs, persistence, UI slot binding, and legacy control -- prevent regressions.

**Acceptance Criteria:**
- Given a valid new-rules deck for a human or Practice bot, when setup creates the hand, then all eight non-general cards occupy slots 0–7 in a length-eight array, with no card-changing opening draw, mulligan, or replacement.
- Given a new-rules card play that identifies a slot and card instance, when it resolves, then only that slot becomes null; empty, mismatched, or stale slot/card pairs are rejected.
- Given a new-rules hand with empty slots, when rendered, saved, restored, or replayed, then all slot indices remain stable and no serialization or UI mutation shifts cards.
- Given a legacy match, when its hand is created or changed, then its existing size and mutation behavior remain unchanged and it does not receive the fixed eight-slot representation.

## Implementation Notes

- Added ruleset-aware eight-slot hand sizing and positional setup/replay restoration; existing six-slot defaults remain for legacy sessions.
- New-rules startup accepts only an empty confirmation, replacement is blocked including forced actions, and play requests carry a required expected card index to reject stale slot selections.
- The UI binds each hand index independently, including null slots; the production binding helper and ruleset-specific count are tested with fake card nodes. Practice AI hand scans, capacity heuristics, and action-selection positions also derive their limit from the SDK deck. Hand layout bounds, deck/hand counters, and full-hand warnings now use eight for hex sessions and retain legacy constants elsewhere. Fixed-hand labels use locale resources. Excess invalid deck input is retained in the draw pile instead of being dropped; a valid nine-card deck still has no draw pile.

## Spec Change Log


## Review Triage Log

| Verdict | Route | Evidence |
|---------|-------|----------|
| medium | patch | Hex active-hand spacing used legacy six-slot bounds; hand bounds now use eight for hex while legacy retains six. |
| medium | patch | The hand counter displayed six in hex; it now reads the deck's ruleset-specific slot count. |
| medium | patch | Burned-card full-hand feedback compared against six; it now compares against the deck's slot count. |
| low | patch | The fixed-hand dialog labels were English-only; localized keys were added for English, German, and Traditional Chinese. |
| medium | patch | Hex setup discarded cards after the first eight on unvalidated larger inputs; excess cards now remain in the draw pile, while valid nine-card decks still leave it empty. |
| false | rejected | The forced-replacement test sets `forcedReplace = true` and asserts rejection with the hand unchanged, as required by the frozen no-replacement rule. |
| medium | patch | The UI test previously covered only slot projection; the production binding helper now binds test card nodes at each stable index, including a null gap. |
| medium | patch | The stale-slot test previously used an in-memory action; it now serializes a client action, deserializes it through the authoritative path, and verifies rejection. |

## Verification

**Commands:**
- `npx mocha -t 1000 --exit test/unit/sdk/game/game_setup.js test/unit/sdk/game/actions_hand.js test/unit/sdk/game/hand_slots.js --grep "fixed hand|starting hand|hand slot|mulligan and replacement|hex play|hex slot|excess cards"` -- expected: targeted SDK hand and setup tests pass, including legacy controls.
- `npx coffeelint -f coffeelint.json -q app/sdk/cards/deck.coffee app/sdk/gameSetup.coffee app/sdk/actions/drawStartingHandAction.coffee app/sdk/actions/playCardFromHandAction.coffee app/sdk/validators/validatorExecuteExplicitAction.coffee app/sdk/validators/validatorReplaceCardFromHand.coffee app/sdk/validators/validatorPlayCard.coffee server/single_player.coffee` -- expected: success.
- `npx eslint --quiet app/ui/views/layouts/game.js app/ui/views/layouts/game_player.js app/view/layers/game/BottomDeckLayer.js app/view/layers/game/GameLayer.js app/view/layers/game/handSlotUtils.js app/common/utils/utils_engine.js server/ai/starter_ai.js server/ai/phase_ii_ai.js server/ai/card_intent/card_intent.js server/ai/scoring/base/draw_card.js server/ai/scoring/base/handAndUnspentMana.js test/unit/sdk/game/hand_slots.js` -- expected: success.



