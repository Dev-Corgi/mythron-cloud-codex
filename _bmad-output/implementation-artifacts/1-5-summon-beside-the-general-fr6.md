---
title: 'Summon beside the general'
type: 'feature'
created: '2026-10-30'
status: 'done'
route: 'dispatch'
baseline_commit: 'ce932b6fd185e697f9c9d54165382499ab6bae03'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/1-4-see-and-interact-with-the-hex-battlefield-fr2-fr4-fr5.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The new-rules battlefield and axial targeting are in place, but unit deployment still follows the legacy rule that allows spawning beside any allied unit. That permits destinations outside the new general-centered deployment rule and makes client previews disagree with authoritative play.

**Approach:** For `practice-sandbox-hex`, restrict unit summon destinations to unobstructed adjacent cells around the summoning player's own general. Use the same rule for predicted targets and action-backed summons, including effect summons, while leaving setup placement and all legacy summon behavior unchanged.

## Boundaries & Constraints

**Always:** Use the existing axial six-neighbor topology. A valid destination must be on board, adjacent to the card owner's general, and unobstructed for that unit. Client prediction, player action validation, authoritative resolution, and replay must agree. In the new ruleset, special spawn-anywhere or custom-spawn positions do not bypass the general-adjacent rule for units. Setup/reconstruction placement remains able to restore existing board state.

**Never:** Change movement, attack, card eligibility, turn rules, or summon behavior for legacy rulesets. Do not apply the rule to non-unit board cards such as tiles. Do not replace shared topology or convert axial coordinates into square positions.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|-----------------------------|----------------|
| General neighbor | New-rules unit and empty on-board cell adjacent to its owner's general | Target appears in valid positions and the summon is accepted | N/A |
| Allied unit only | Cell adjacent to an allied unit but not the owner's general | Omitted from prediction and rejected for player/effect actions | No unit is created |
| Invalid neighbor | Occupied, off-board, malformed, or otherwise obstructed candidate | Not a legal target | No unit is created |
| Missing general | New-rules summon when the owner's general cannot be resolved | No legal destinations | Reject the action |
| Legacy summon | Legacy ruleset and a cell allowed by the existing allied-unit rule | Existing destinations and action behavior remain unchanged | N/A |

</frozen-after-approval>

## Code Map

- `app/sdk/board.coffee` -- `getValidSpawnPositions` currently unions positions around allied units using square patterns. Add a hex-only branch using the owning player's general, `getHexNeighbors`, and `getObstructionAtPositionForEntity`; retain the full legacy branch.
- `app/sdk/entities/entity.coffee` -- `getValidTargetPositions` honors `canBeAppliedAnywhere` and `ModifierCustomSpawn` before the board's normal spawn list. Make the new-rules unit restriction take precedence so previews cannot bypass it; leave legacy modifier behavior intact.
- `app/sdk/gameSession.coffee` -- `applyCardToBoard` checks board bounds and obstruction but accepts action-backed effect summons outside the general neighborhood. Reuse the board rule here for new-rules unit applications with a source action; keep setup/reconstruction calls without a source action valid.
- `app/sdk/validators/validatorPlayCard.coffee`, `app/sdk/cards/card.coffee`, and `app/view/Player.js` -- existing validation checks `getIsPositionValidTarget`, and the view previews `getValidTargetPositions`; preserve these shared consumers rather than adding separate UI rules.
- `test/unit/sdk/game/board.js`, `test/unit/sdk/game/actions_hand.js`, and `test/unit/sdk/game/actions_validators.js` -- extend current hex and play-action coverage for legal neighbors, allied-unit-only cells, obstruction, effects, and legacy behavior.

## Tasks & Acceptance

**Execution:**
- [x] `app/sdk/board.coffee` -- provide one reusable, ruleset-aware legal spawn-position rule centered on the owning general; preserve legacy allied-unit destinations.
- [x] `app/sdk/entities/entity.coffee` -- route new-rules unit target prediction through the general-only rule even when special spawn modifiers would otherwise broaden targets.
- [x] `app/sdk/gameSession.coffee` -- reject action-backed new-rules unit applications outside legal general-adjacent destinations so effect summons cannot bypass validation; preserve setup/replay reconstruction placement.
- [x] `test/unit/sdk/game/board.js` and `test/unit/sdk/game/actions_validators.js` -- cover legal/illegal hex destinations, blocked and off-board cells, action/effect rejection, prediction agreement, and unchanged legacy behavior.
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- mark Story 1.5 in progress during implementation and review when complete.

**Acceptance Criteria:**
- Given a new-rules match and an empty cell adjacent to the owning general, when a unit is played there, then SDK validation allows it and the UI marks it as a legal destination.
- Given a cell adjacent to an allied unit but not the owning general, when a player or effect tries to summon there, then authoritative resolution rejects it and client prediction does not mark it legal.
- Given an occupied, off-board, malformed, or otherwise obstructed cell beside the general, when a summon is attempted, then existing destination constraints reject it and no unit is created.
- Given a legacy match, when summon destinations are calculated and used, then the existing allied-unit rule and behavior remain unchanged.

## Implementation Notes

Added a hex-only general-adjacent destination list and position predicate on the board. Unit target prediction routes through that list before apply-anywhere or custom-spawn expansion, while action-backed unit applications use the same predicate. The resolution check excludes queued cards while checking occupancy so an action does not obstruct its own destination. Calls without a source action and legacy summon paths retain their prior behavior. Added tests for legal hand play, effect-style applications, occupancy, invalid bounds, no valid general, apply-anywhere overrides, setup restoration, and legacy destinations.

## Spec Change Log

## Review Triage Log

- **false — owner-specific neighbor coverage:** `getValidGeneralAdjacentSpawnPositions` resolves the general with `card.getOwnerId()`, so the cited wrong-owner outcome does not occur in the reviewed code.
- **false — omitted legal neighbors:** the prediction test compares the complete expected in-bounds neighbor list for the edge general and removes only the intentionally occupied neighbor.
- **false — occupied prediction target:** the same exact list assertion excludes the occupied general neighbor, and the action-application test verifies occupancy rejection.
- **false — action-backed application coverage:** the `GameSession.applyCardToBoard` guard applies to every source-action-backed hex unit application, and the test calls it with a `PlayCardAction` source for valid, non-adjacent, and occupied targets.
- Edge-case review: no findings. Verification-gap review: no findings.

## Design Notes

The board's legal spawn list should be the shared source of truth for both prediction and validation. The low-level board setup path is used to seed generals and reconstruct snapshots; the action-backed restriction must not prevent those placements.

## Verification

**Results:** 54 focused tests passed. All three changed CoffeeScript files compiled; CoffeeLint reported 0 errors and 0 warnings with only the checkout's CRLF line-ending rule disabled; ESLint and `git diff --check` passed.

**Commands:**
- `node_modules/.bin/mocha --no-config --require coffeescript/register --timeout 10000 --exit test/unit/sdk/game/board.js test/unit/sdk/game/actions_hand.js test/unit/sdk/game/actions_validators.js` -- expected: all focused summon, validation, and regression tests pass.
- `node_modules/.bin/coffee --compile --print app/sdk/board.coffee app/sdk/entities/entity.coffee app/sdk/gameSession.coffee` -- expected: all changed CoffeeScript files compile.
- `node_modules/.bin/coffeelint` on the changed CoffeeScript files with the repository line-ending rule ignored for the Windows checkout -- expected: no other lint errors.
- `node_modules/.bin/eslint --quiet test/unit/sdk/game/actions_validators.js` -- expected: no lint errors.
- `git diff --check` -- expected: clean diff.
