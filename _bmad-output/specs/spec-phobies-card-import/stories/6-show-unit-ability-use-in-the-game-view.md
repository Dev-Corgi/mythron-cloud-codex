---
title: 'Story 6: Show unit ability use in the game view'
type: 'feature'
created: '2026-11-03'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'cbe9d525dee0c58d128a71619386fc209ef30850'
context:
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-phobies-card-import-2026-11-02/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The view recognizes played cards from hand and General signature actions, but a non-General `UseActiveAbilityAction` is neither. As a result, unit abilities can be omitted from battle-log/card presentation and opponent reveal sequencing.

**Approach:** Add one view-facing action classifier that reuses the existing General signature predicate and also recognizes unit ability actions. Use it across the game layer, battle log, battle-log node, player follow-up selection, and game layout; show the card-back/reveal sequence for opponents and no reveal for the player's own ability use.

## Boundaries & Constraints

**Always:** Keep `SignaturePlay.matches` semantics unchanged because SDK modifiers rely on its signature-only meaning. The new classifier must include hand plays, legacy and General signature plays, and non-General active-ability actions. Preserve replacement-card handling and the existing hand-slot versus signature-slot network selection behavior. Presentation remains client-side and cannot alter action validation or outcomes.

**Never:** Change SDK modifier checks, action resolution, card effect behavior, or ability counters. Do not treat a unit ability as consuming its hand slot or as a General signature play. Do not show an opponent reveal for the player's own unit ability.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Opponent unit ability | Non-General `UseActiveAbilityAction` owned by opponent | Classified as a played card; battle log shows its card and the opponent card-back/reveal sequence runs | N/A |
| Own unit ability | Non-General `UseActiveAbilityAction` owned by viewer | Classified for card/log presentation; no played-card reveal runs | N/A |
| Existing card plays | Hand play, legacy signature play, or General ability | Existing view presentation and slot behavior remain unchanged | N/A |
| Non-card actions | Move, attack, replace, or arbitrary action | Not newly classified as a played card; existing replace behavior remains explicit | N/A |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/actions/signaturePlay.coffee` and `duelyst/app/sdk.coffee` — preserve the signature-only `matches` API used by SDK modifiers; export a separate shared view classifier that delegates to it and adds non-General abilities.
- `duelyst/app/view/layers/game/GameLayer.js` — repeated action classification controls card reveal, sequence grouping, effect FX, follow-up display, cast presentation, and local UI rebinding; keep replacement and hand/signature slot behavior distinct.
- `duelyst/app/view/layers/game/BattleLog.js`, `duelyst/app/view/nodes/cards/BattleLogNode.js` — classify ability actions as card entries and expose the effect card for display and inspection.
- `duelyst/app/view/Player.js` — follow-up selection currently emits hand-index or General-signature events; unit abilities must report the source unit's active-ability hand slot.
- `duelyst/app/ui/views/layouts/game.js` — its signature reminder is General-specific and must retain that meaning while sharing the signature predicate.
- `duelyst/test/unit/view/played_card_action.js` — add classifier and viewer/opponent reveal-policy coverage; preserve existing `active_abilities.js` SDK modifier assertions.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/actions/cardPlayAction.coffee`, `duelyst/app/sdk.coffee` — add and export a shared classifier for hand plays, signature plays, and non-General active abilities without widening `SignaturePlay.matches`.
- [x] `duelyst/app/view/layers/game/GameLayer.js`, `duelyst/app/view/layers/game/BattleLog.js`, `duelyst/app/view/nodes/cards/BattleLogNode.js`, `duelyst/app/view/Player.js`, `duelyst/app/ui/views/layouts/game.js` — use the classifier wherever the view treats an action as a played card; preserve signature-only reminder and slot semantics.
- [x] `duelyst/test/unit/view/played_card_action.js` — verify action classification and opponent-only reveal policy for unit abilities, plus existing hand and General signature cases.

**Acceptance Criteria:**
- Given a unit ability is used, when the game view builds action sequences and battle-log entries, then it handles the effect card as a played card through the shared classifier.
- Given an opponent uses a unit ability, when the action is presented, then the opponent card-back/reveal animation runs before its effects; given the player uses their own, then no reveal runs.
- Given a General ability or legacy signature play is viewed, when it is classified, then existing presentation remains unchanged and SDK modifier signature matching retains its prior meaning.
- Given a unit ability is selected for a follow-up, when player selection is broadcast, then the source unit's ability hand slot is identified without sending a General-signature selection.

## Implementation Notes

- Added `CardPlayAction` as a view-facing classifier with a separate signature-only method; SDK modifier callers of `SignaturePlay.matches` retain their existing behavior.
- The layout module's signature reminder remains General-only. `Player` follow-up selection sends the active ability's original hand slot for unit abilities; hand removal and General signature rebinding remain on their original action paths.

## Spec Change Log

## Review Triage Log

- `medium` — Blind Hunter: the initial tests exercised only the classifier, not the changed GameLayer reveal or battle-log display paths. Added `showNextAction` reveal-path and `BattleLogNode.setStep` assertions; opponent reveal callback resumes the action and the unit's effect card is shown. `patch`.
- `medium` — Blind Hunter: Player follow-up hand-slot selection had no event coverage. Added a `Player.setFollowupCard` test asserting `handIndex` comes from the source ability state and no signature flags are sent; General signature selection is also asserted. `patch`.
- `medium` — Blind Hunter: reveal policy coverage omitted ordinary hand, General ability, and legacy signature plays. Added owner-policy and signature-classifier regression assertions for those cases. `patch`.
- `false` — Blind Hunter: the story spec does not record outcomes under its Verification commands. All listed commands were run and passed in this implementation turn; the actual results are reported in the completion summary. The only proposed change is to this build's spec, which Step 4 requires rejecting.
- `medium` — Blind Hunter: General ability presentation and signature-only reminder behavior lacked a regression assertion. GameLayer reveal coverage now includes a General ability, and `matchesSignature` assertions verify General/legacy plays remain true while unit abilities remain false for the layout reminder predicate. `patch`.
- `medium` — Verification Gap: own/opponent policy helper tests did not execute the GameLayer presentation path. Added a focused `_showPlayedCardIfNeeded` test confirming opponent reveal sequencing and no own reveal. `patch`.
- `medium` — Verification Gap: unit ability hand-slot broadcast was untested. Added a `Player.setFollowupCard` event assertion for the source `handSlotIndex`, without signature-selection fields. `patch`.

## Verification

**Commands:**
- `./node_modules/.bin/mocha -t 1000 test/unit/view/played_card_action.js test/unit/view/game_layer_active_ability_inspect.js` — expected: all classifier, reveal-policy, and existing ability-inspect tests pass.
- `./node_modules/.bin/eslint --quiet app/view/layers/game/GameLayer.js app/view/layers/game/BattleLog.js app/view/nodes/cards/BattleLogNode.js app/view/Player.js app/ui/views/layouts/game.js test/unit/view/played_card_action.js` — expected: no JavaScript lint errors.
- `./node_modules/.bin/coffeelint app/sdk/actions/cardPlayAction.coffee app/sdk.coffee` — expected: no CoffeeScript lint errors.
