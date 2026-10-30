---
title: 'Finish matches without hand refills or fatigue'
type: 'feature'
created: '2026-10-30'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: []
baseline_commit: '1ab4ead72034deb49af06d8552e59a1535323c8c'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Practice and Sandbox matches use eight fixed hand slots, but turn-end draws and card effects can refill those slots, add or return cards, and deal fatigue when a draw is attempted from an empty deck. These mutations violate the match rules and make hand state unpredictable.

**Approach:** Enforce the no-draw/no-hand-mutation rule across automatic and action-driven SDK paths for `practice-sandbox-hex`, and preserve normal draw, fatigue, and hand behavior in legacy sessions. Keep setup and replay reconstruction available so the original eight cards and saved slot positions remain reproducible.

## Boundaries & Constraints

**Always:** After initial setup, hex matches must not draw, refill, replace, return, add cards to hand, shift slots, or cause draw-exhaustion fatigue. Played slots remain null. Turn-end reserve-funded mana transfer and legal non-card actions continue. Preserve deterministic snapshots/replays and legacy behavior.

**Never:** Do not block initial setup/restoration, alter the fixed eight-slot structure, suppress hex mana transfer, infer ruleset from mode type, or change legacy draw/fatigue rules.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Turn end with spent slots | Hex hand contains null slots; deck may contain cards | Turn proceeds and mana rules apply; hand and draw pile stay unchanged | No draw actions are queued |
| Draw with cards available | Hex match receives a direct or effect-driven draw/refill request | Hand and draw pile stay unchanged | Request is rejected or safely ignored before mutation |
| Draw with empty deck | Hex match has empty deck and any hand state | General health is unchanged; action/non-card turn progression continues | No fatigue damage |
| Add, return, or replace | Hex match receives a hand-add, return, or replacement action | No card enters hand; spent slots remain null | Reject before related deck/hand mutation |
| Legacy control | Legacy match ends turn or draws with empty/nonempty deck | Existing draw, fatigue, and hand behavior remains | Existing action behavior |

</frozen-after-approval>

## Code Map

- `app/sdk/gameSession.coffee` -- end-turn queue drains in `p_startTurn()` after the ended player's action queue; skip only the automatic card draw for the hex ruleset and retain the end-turn phase and mana transfer. `validateAction()` rejects hand/deck mutation actions before action-resolution events.
- `app/sdk/cards/deck.coffee` -- `actionsDrawNewCards()` and `actionsDrawCardsToRefillHand()` create turn-end and effect-driven draw actions; guard these generators as well as execution so callers cannot refill through helper paths.
- `app/sdk/actions/drawCardAction.coffee` -- authoritative empty-deck fatigue occurs before parent hand insertion; stop hex draws before this point.
- `app/sdk/actions/putCardInHandAction.coffee`, `putCardInDeckAction.coffee`, and `replaceCardFromHandAction.coffee` -- shared card addition, card return, and replacement execution; prevent hex changes before touching hand or deck.
- `app/sdk/gameSetup.coffee` and `GameSession.applyCardToHand()` -- initial setup and saved-state reconstruction rely on direct hand application; leave these pathways available.
- `test/unit/sdk/game/actions_hand.js`, `hand_slots.js`, `game_active.js`, and `game_setup.js` -- cover prevented draw/add/replace, end-turn state, persistence, and legacy controls.

## Tasks & Acceptance

**Execution:**
- [x] `app/sdk/gameSession.coffee`, `app/sdk/cards/deck.coffee` -- suppress hex automatic/refill draw generation at turn end and helper entry points while preserving turn progression.
- [x] `app/sdk/actions/drawCardAction.coffee`, `putCardInHandAction.coffee`, `putCardInDeckAction.coffee`, `replaceCardFromHandAction.coffee` -- reject/ignore hex draw, fatigue, addition, return, and replacement before mutation; keep legacy execution unchanged.
- [x] `test/unit/sdk/game/actions_hand.js`, `hand_slots.js`, `game_active.js`, `game_setup.js` -- cover every matrix row, setup/restoration, deterministic fixed slots, and legacy controls.

**Acceptance Criteria:**
- Given a hex match after setup, when a turn ends or any supported draw/add/return/replace path executes, then no draw or hand/deck mutation occurs and spent slots stay null.
- Given a hex player with all slots spent and no deck cards, when a turn ends or another action resolves, then no fatigue damage occurs and legal non-card actions continue.
- Given Practice, Sandbox, and a representative legacy match, when each is played and saved/restored, then the first two preserve deterministic eight-slot state while legacy retains its existing draw behavior.

## Implementation Notes

- Turn-end draw generation and both deck draw helpers now return no draw actions for the hex ruleset; end-turn progression, reserve-funded mana transfer, setup, and snapshot restoration remain intact.
- Draw actions stop before empty-deck fatigue; hand-add, deck-return, and replacement actions stop before mutation. Tests exercise direct and forced paths, empty-deck state, legacy fatigue, and verify blocked actions do not emit action lifecycle events.
## Spec Change Log

## Review Triage Log

| Verdict | Route | Evidence |
|---------|-------|----------|
| medium | patch | CONTENT: PutCardInHandAction no-op could emit action events and trigger listeners; `validateAction()` now rejects it before it enters resolution. |
| medium | patch | CONTENT: DrawCardAction no-op could trigger draw-watch listeners; its PutCardInHandAction base is rejected before action events, including empty-deck draws. |
| medium | patch | CONTENT: PutCardInDeckAction no-op could trigger return listeners; validation rejects it before action resolution. |
| medium | patch | CONTENT: tests omitted action-listener behavior; regression now asserts draw/add/return/replace attempts emit neither action nor after-action events. |
| medium | patch | VERIFICATION: draw-watch effects could react to blocked draws; shared validation rejects draw actions before action-resolution events, and the regression checks no lifecycle event was emitted. |
## Verification

**Commands:**
- `npx mocha test/unit/sdk/game/actions_hand.js test/unit/sdk/game/hand_slots.js test/unit/sdk/game/game_active.js test/unit/sdk/game/game_setup.js --exit` -- expected: all focused suites pass.







