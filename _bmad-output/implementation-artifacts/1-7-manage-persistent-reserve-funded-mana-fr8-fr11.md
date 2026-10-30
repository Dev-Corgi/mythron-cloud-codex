---
title: 'Manage persistent reserve-funded mana'
type: 'feature'
created: '2026-10-30'
status: 'done'
route: 'dispatch'
baseline_commit: 'fe5be84c96ea5f29d95d551c9d28f6a356d7aaed'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/1-6-attack-without-an-automatic-counterattack-fr7.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** New-rules matches still use the legacy per-turn mana refresh and nine-core cap, with no finite reserve to fund future turns. That prevents the intended mana curve and discards unspent mana.

**Approach:** Give each player a 20-point mana pool, allocate 3 spendable mana plus 17 reserve to the first player and 4 plus 16 to the second. Transfer up to 3 reserve into spendable mana at that player's turn end, preserve all unspent mana, and keep legacy mana behavior unchanged.

## Boundaries & Constraints

**Always:** Apply the economy only to `practice-sandbox-hex`. Initialize both players before play from their seat/starting-player order; preserve reserve and spendable values in snapshots, replay, and client state. At each player's own end turn, transfer `min(3, reserve)` exactly once before `end_turn` observers run. Card costs subtract from spendable mana. Spendable mana and its maximum grow by the transferred amount without the legacy nine-mana cap or start-turn refresh. Reserve never becomes negative or replenishes. Bonus, bonus-core, and restore-mana effects do not create mana in this ruleset. Legacy progression, caps, card effects, and challenge overrides remain unchanged.

**Never:** Grant the reserve transfer at turn start, grant it on an opponent's end turn, discard unspent mana, exceed the finite 20-point total through turn progression, or change mana behavior in legacy rulesets.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Opening allocation | New-rules setup; first and second seats | First has 3 spendable/17 reserve; second has 4/16; each total is 20 | Invalid ruleset follows existing setup rejection |
| Own turn end | Reserve is at least 3; observe `end_turn` | Exactly 3 moves to spendable mana, reserve drops by 3 before the event | N/A |
| Exhausted reserve | Reserve is 1–2 or 0 | Transfer only what remains; later turns transfer 0 | N/A |
| Persistent spendable mana | Player spends cards, then either player's turn changes | Unspent mana remains; only the active player's own end turn adds reserve mana | N/A |
| Other mana action | Bonus, bonus-core, or restore action in hex ruleset | It grants no mana; ordinary card cost payment still works | Existing action validation applies |
| Legacy progression | Legacy setup and end turns | Existing increment, refresh, cap, and overrides remain unchanged | N/A |

</frozen-after-approval>

## Code Map

- `app/sdk/player.coffee` -- owns serialized mana fields, `setStartingMana`, current/max getters, and client action-state capture. Add a persistent reserve field and include it in state recording; keep legacy max clamping.
- `app/sdk/gameSetup.coffee` -- `setupPlayerBasics` applies player data overrides; ruleset is already bound before setup/reconstruction. Initialize fixed hex allocations by seat, and preserve reserve in setup/replay data without changing legacy overrides.
- `app/sdk/gameSession.coffee` -- `p_endTurn` publishes `EVENTS.end_turn`; transfer reserve before that event. `p_startTurn` currently increments, refreshes, and caps mana; keep that branch for legacy only. The action executor already deducts card cost from `remainingMana`.
- `app/sdk/actions/bonusManaAction.coffee`, `bonusManaCoreAction.coffee`, and `restoreManaAction.coffee` -- all can grant spendable mana or future mana capacity; suppress their grant behavior in hex while retaining legacy behavior.
- `app/sdk/rulesets/rulesetsLookup.coffee` -- identifies `practice-sandbox-hex` version 1; use the session ruleset rather than game type to select the economy.
- `app/ui/views/layouts/game_player.js` -- current and maximum mana labels read SDK state; preserve those bindings so the uncapped numeric totals remain visible.
- `test/unit/sdk/game/basic.js` and `test/unit/sdk/game/game_setup.js` -- legacy turn progression and setup/replay coverage. Add focused mana tests for hex allocation, end-turn ordering, persistence, reserve exhaustion, blocked grants, replay state, card spending, and legacy parity.

## Tasks & Acceptance

**Execution:**
- [x] `app/sdk/player.coffee` -- Add serialized reserve accessors and client state recording; make the new-rules maximum uncapped while retaining legacy behavior.
- [x] `app/sdk/gameSetup.coffee` -- Initialize first/second hex allocations and carry reserve through setup reconstruction; preserve challenge overrides in legacy.
- [x] `app/sdk/gameSession.coffee` -- Transfer up to 3 reserve at the owner's end turn before event publication and skip legacy refresh logic for hex matches.
- [x] `app/sdk/actions/bonusManaAction.coffee`, `bonusManaCoreAction.coffee`, `restoreManaAction.coffee` -- Prevent other effects from granting mana in hex without changing legacy effects.
- [x] `test/unit/sdk/game/mana.js` -- Verify opening allocations, ordering/exactly-once transfer, persistence/spending, reserve exhaustion, other grant actions, replay, and legacy compatibility.
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- Mark Story 1.7 in progress during implementation and review when complete.

**Acceptance Criteria:**
- Given a new-rules match, when setup completes, then the first and second players have 3/17 and 4/16 spendable/reserve mana respectively.
- Given a player's turn ends, when `end_turn` is published, then at most 3 of that player's reserve has moved into spendable mana exactly once, and the other player's reserve is unchanged.
- Given spendable mana is unspent across turn changes, when either player starts or ends a turn, then it remains available and never exceeds the total 20-point allocation through the reserve system.
- Given a card is played or a bonus/restore action is attempted, when mana resolves, then card cost is paid and no effect outside the reserve transfer grants extra mana in hex matches.
- Given a legacy match or challenge override, when setup and turns resolve, then existing mana behavior remains unchanged.
- Given a session is serialized and replayed, when the same turn sequence runs, then reserve, maximum mana, spendable mana, and action history match.

## Implementation Notes

- Added `reserveMana` to player state and client action-state recording. Hex setup initializes the fixed seat allocations and includes reserve in game setup data for reconstruction.
- `p_endTurn` moves the bounded reserve amount into both spendable and maximum mana before publishing `end_turn`. Hex `p_startTurn` preserves both values; legacy retains its existing refresh and cap.
- Bonus mana, bonus-core, and restore actions execute as no-ops for hex matches; their legacy behavior is unchanged.
- Added mana-specific tests for opening state, event ordering, exact-once and exhausted transfers, card-cost deduction, persistence, grant blocking, snapshots/replay, and legacy progression.

## Spec Change Log

## Review Triage Log

- `medium` / `patch` — Edge hunter: fractional finite reserve values could create fractional mana; `setReserveMana` now floors them, and the 4.8-to-4 assertion covers the boundary.
- `medium` / `patch` — Blind hunter: `setReserveMana` accepted fractional values; the same floor-and-test patch resolves this duplicate claim.
- `low` / `patch` — Blind hunter: fractional reserve values lacked a test; the new fractional assertion now pins normalization.
- `medium` / `patch` — Verification-gap reviewer: legacy max-cap behavior had no over-cap assertion; the test now verifies a legacy player above `CONFIG.MAX_MANA` still observes the cap.
- `false` — Blind hunter: missing direct reserve UI rendering does not hide the reserve state; client action state includes reserve and the visible maximum increases as reserve transfers, making remaining reserve derivable from the fixed pool.
- `false` — Blind hunter: other mana grants were not audited; code search traced the bonus modifier source to `BonusManaAction`, and bonus, core, and restore actions are gated in hex.
- `false` — Blind hunter: later mana maximum changes could make the pool exceed 20; each reserve transfer reduces reserve by exactly the amount added to maximum, while hex bonus-core grants are disabled.
- `medium` / `patch` — Blind hunter: deserialization bypassed reserve normalization and old snapshots omitted reserve; hex deserialization now derives missing reserve from `20 - maximumMana` and normalizes all restored values through the setter.
- `false` — Blind hunter: legacy action-grant regression coverage was absent; legacy code remains behind the non-hex path, and existing card tests exercise legacy mana grants.
- `false` — Blind hunter: replay coverage did not re-execute the sequence; the test executes an end-turn action, serializes the full session, restores it, and compares mana, reserve, and turn history.
- `false` — Blind hunter: custom hex setup values lacked a test; the frozen rule specifies fixed seat allocations and setup unconditionally applies 3/17 or 4/16 after input overrides.
- `false` — Edge hunter: positive bonus-mana modifiers could raise the hex maximum beyond the pool; the only modifier creation path is `BonusManaAction`, which returns before creating it in hex.
- `false` — Blind hunter: a mana-core removal can reduce the combined maximum-plus-reserve total; this is a mana-destruction effect, does not exceed the 20-point limit, and returning the core to reserve would replenish reserve contrary to the frozen rule.
- `false` — Blind hunter: missing mana-core-removal coverage does not establish a broken outcome; the rules require the pool never exceed 20 and prohibit reserve replenishment, both compatible with a destructive maximum reduction.
- `false` — Blind hunter: the pool size is repeated as 20; all current sites agree, and the report identifies no present behavior that diverges.
- `false` — Blind hunter: action-state rollback lacks a direct reserve assertion; reserve is part of the existing player action-state record, and the reviewer supplied no failing consumer path.
- `false` — Blind hunter: the hex `p_startTurn` branch is empty; it intentionally preserves mana, with reserve transfer performed by the owner's end-turn path and documented at the branch.
- `false` — Blind hunter: a future unknown ruleset would take the legacy path; this is the existing safe default and does not violate the frozen scope, which selects only `practice-sandbox-hex`.
- `false` — Blind hunter: P2 payout coverage was missing; the multi-turn mana test now verifies both players' transfers.
- `false` — Blind hunter: repeated and partial payouts lacked coverage; the multi-turn test now verifies complete three-point transfers and final partial payouts.
- `false` — Blind hunter: non-finite and oversized reserve assignments were unbounded; the setter now normalizes them and focused assertions cover Infinity, NaN, and pool capacity.
- `false` — Blind hunter: legacy cap changes had no over-cap check; the added legacy assertion directly verifies the unchanged cap.

## Design Notes

The end-turn hook is the single minting point. It must update spendable mana and the displayed maximum before `EVENTS.end_turn`, while `p_startTurn` must not replace accumulated spendable mana in hex matches. Legacy keeps its existing start-turn refresh path. Reserve and mana fields remain ordinary player state so snapshots and replay reconstruct the same economy.

## Verification

**Results:** The mana, basic, and game setup suites pass (74 tests). All six changed CoffeeScript files compile; CoffeeLint reports 0 errors and 0 warnings with the repository's CRLF line-ending rule ignored; `git diff --check` is clean.

**Commands:**
- `node_modules/.bin/mocha --no-config --require coffeescript/register --timeout 10000 --exit test/unit/sdk/game/mana.js test/unit/sdk/game/basic.js test/unit/sdk/game/game_setup.js` -- passed: 74 tests.
- `node_modules/.bin/coffee --compile --print` on each changed CoffeeScript file -- passed: all six compile.
- `node_modules/.bin/coffeelint` on the six changed CoffeeScript files with only the repository's CRLF line-ending rule ignored -- passed: 0 errors and 0 warnings.
- `git diff --check` -- passed: clean diff.
