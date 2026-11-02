---
title: 'Story 7: Show the ability card in card detail view'
type: 'feature'
created: '2026-11-02'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'f3039192ecfe701f4861ce00fc9946ee58ef9faa'
context:
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/stories/6-wire-unit-and-ability-card-ui-into-the-hand.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Card detail inspection shows a related card only when the inspected card has ordinary referenced-card data. A unit with a v2 active ability, such as Planar Scout, does not expose its effect card in that related-card position.

**Approach:** In Practice/Sandbox ruleset v2, use the existing related-card inspect node to show the effect spell for an inspected unit with active ability data. Preserve standard referenced-card inspection and all other modes.

## Boundaries & Constraints

**Always:** Use the existing inspect and related-card nodes, card factory, owner, and layout behavior. Read the effect card ID from the active ability definition. The active ability card takes precedence when present; otherwise keep the existing `getReferencedCardData()` path. Show the static effect card as a normal detail card; live counters remain a hand-view concern.

**Never:** Change ability rules/data, hand rendering, card inspect geometry, ordinary referenced-card behavior, or presentation outside Practice/Sandbox v2. Do not change Lantern Fox or other unrelated card definitions to simulate this relation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Ability-bearing unit | V2 inspection of Planar Scout with Phoenix Fire definition | Primary unit and Phoenix Fire appear in the existing paired inspect positions | Missing/invalid effect ID leaves related card clear |
| No active ability | V2 unit without ability, or a legacy-mode unit | Existing referenced-card relation is preserved; otherwise no related card | No stale related card from prior inspection |
| Ordinary related card | V2 or legacy card with `getReferencedCardData()` only | Existing related-card behavior remains unchanged | N/A |

</frozen-after-approval>

## Code Map

- `duelyst/app/view/layers/game/GameLayer.js` -- `showInspectCard()` builds and positions `_inspectCardNode` and `_referencedCardNode`; `stopShowingInspectCard()` clears both. Add active-ability effect card selection here while preserving side, owner, and state arguments.
- `duelyst/app/sdk/cards/factory/core/neutral.coffee` -- Planar Scout defines `activeAbility.effectCardId` only for Practice/Sandbox v2; no data change is needed.
- `duelyst/app/sdk/player.coffee` -- active ability hand slots expose live state, but detail inspection needs only the card definition's effect ID.
- `duelyst/test/unit/view/` -- add focused coverage for active-ability selection and fallback to existing referenced-card behavior.
- `duelyst/test/unit/sdk/game/active_abilities.js` -- provides the canonical Planar Scout/Phoenix Fire fixture and confirms mode gating.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/view/layers/game/GameLayer.js` -- resolve a v2 unit's active ability effect card into the existing related inspect node; preserve ordinary reference fallback and cleanup.
- [x] `duelyst/test/unit/view/inspect_card_resolver.js` and `duelyst/test/unit/view/game_layer_active_ability_inspect.js` -- cover v2 ability selection, invalid effect ID, no-ability/legacy behavior, ordinary referenced-card fallback, and secondary-node display.

**Acceptance Criteria:**
- Given a V2 Planar Scout is inspected, when card details open, then Planar Scout and Phoenix Fire appear in the existing paired inspect positions.
- Given an inspected unit has no active ability, when details open, then ordinary related-card behavior remains unchanged and no stale secondary card remains.
- Given a card is inspected outside Practice/Sandbox v2, when it has no ordinary referenced card, then no active ability card is added.

## Implementation Notes

- `GameLayer.showInspectCard()` now resolves the secondary card ID through `InspectCardResolver`, then creates and displays it through the existing inspect node. Active ability IDs are considered only for Practice/Sandbox v2 and take precedence over ordinary referenced-card data.
- The detail view shows the effect spell as a standard inspect card; live lockdown/cooldown counters remain in the hand UI.

## Verification

**Commands:**
- `cd duelyst && ./node_modules/.bin/mocha -t 1000 test/unit/view/inspect_card_resolver.js test/unit/view/game_layer_active_ability_inspect.js` -- 6 passing.
- `cd duelyst && ./node_modules/.bin/eslint --quiet --format compact app/view/layers/game/GameLayer.js app/view/layers/game/InspectCardResolver.js test/unit/view/inspect_card_resolver.js test/unit/view/game_layer_active_ability_inspect.js` -- no errors.
- `cd duelyst && $env:FIREBASE_URL='https://localhost.firebaseio.com/'; npm run build:app` -- passed with the local build URL; Babel cache access was granted.
- `git diff --check` -- no whitespace errors.

**Manual checks:**
- The local client requires a Firebase test account and currently stops at login; the in-game inspect view could not be opened for manual confirmation. Automated tests cover ability-card ID resolution and existing-reference fallback.

## Review Triage Log

| Finding | Verdict | Evidence and route |
|---|---|---|
| Fractional or non-finite positive effect card IDs accepted (blind hunter) | low | Card identifiers are integers; resolver now requires a positive integer and tests fractional, Infinity, and NaN values. Patched. |
| V2 ability must take precedence over ordinary card reference (blind hunter) | false | The existing active-ability test uses the default referenced ID 700 and asserts the ability ID 701, proving precedence. |
| GameLayer display path lacked verification (blind hunter; verification-gap reviewer) | medium | Added `game_layer_active_ability_inspect.js`, which calls `GameLayer.showInspectCard()` and asserts the created effect card, owner, and secondary node call. Patched. |
| Unknown positive ID may fail to create a card and leave the old one (blind hunter) | false | `GameLayer.showInspectCard()` calls `stopShowingInspectCard(currentSdkCard)` before switching cards; that clears both inspect nodes, then the `referencedCard != null` guard safely skips display when the SDK factory returns null. |
| Secondary card may stay visible when no related card is resolved (edge-case hunter) | false | A secondary card is only shown alongside a primary card; switching/ending inspection calls `stopShowingInspectCard()`, which clears both nodes together. The reported state with a stale secondary and no primary is not reachable through this flow. |

