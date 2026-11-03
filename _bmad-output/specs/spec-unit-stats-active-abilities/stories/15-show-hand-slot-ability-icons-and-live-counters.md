---
title: 'Story 15: Show hand-slot ability icons and live counters'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: 'ffff2dbf'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-fix-card-frame-target.md'
  - '{project-root}/CARD_UI_HANDOFF.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** In Practice/Sandbox v2 a deployed unit's ability should appear in the unit's emptied hand slot and be usable from there, but no view code does that (nothing calls `Player.getActiveAbilityForHandSlot`), so units' abilities are invisible and unusable. The earlier hand work was reverted because it put a whole card frame in the hand; the correction was to show the ability as an icon like a spell in a normal Duelyst hand, not to remove ability display. In addition the ability card face shows base counters in both rings instead of the live nonzero counter, and a General's Bloodbound ability has no ability face or counters.

**Approach:** Show an ability in its fixed hand slot exactly as a spell is shown in a normal Duelyst hand (the spell's icon in the existing circular slot, no card frame, no Phobies frame), with the live Lockdown or Cooldown counter badge from the approved `phobies_ability` ring assets. Selecting it targets and uses it through `Player.actionUseActiveAbility`. The detail views use the ability face with live nonzero counters, including the General's Bloodbound card.

## Boundaries & Constraints

**Always:** Version 2 only; legacy and version 1 hand rendering and interaction are unchanged. The hand stays sprite/icon based with fixed slots; the ability occupies the granting unit's own slot (`activeAbilityState.handSlotIndex`) and the hand array and slot positions never change. Slot shows: the effect spell's normal in-hand icon; no mana cost (use costs no mana); a counter badge showing only the nonzero counter (Lockdown violet ring with padlock, number `#e8b9ff`; otherwise Cooldown cyan ring with hourglass, number `#7be6f5`; none when ready), using `phobies_ability/components` assets scaled from `ability-layout.json` sizes. Unusable look (dimmed like an unaffordable spell) when a counter is above 0, the unit is silenced, the unit has no action point, or it is not my turn; usable looks like a playable spell. The slot refreshes when the unit enters or leaves the board, counters change, silence changes, action points change, and after use, without redrawing unrelated slots. Selection highlights the effect card's valid target positions like a spell, and clicking a target creates `actionUseActiveAbility(unit.getIndex(), position)`. Hovering the slot shows the inspect view with the ability face and live nonzero counter. In inspect views of a deployed unit and of a General's Bloodbound (signature) card, the ability face shows the live nonzero counter; in collection and no-session contexts it keeps showing the ability definition's base counters as today. Put pure decision logic (slot display model, usability, counter selection, signature face data) in a small testable module with mocha tests; keep edits to cocos nodes minimal.

**Never:** Put a card frame or Phobies frame in the hand; change unit sprite slots, hand layout, or any legacy hand behavior; change gameplay rules or SDK behavior (use existing `getActiveAbilityForHandSlot`, `getActiveAbilityState`, `actionUseActiveAbility`); change the board unit presentation; add the counter display to legacy cards.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| DEPLOYED | Unit with an ability is played from slot N | Slot N shows the effect spell icon and a Lockdown badge with its live value | Unit without an ability leaves the slot empty |
| READY | Both counters 0, unit has a point, my turn | Icon looks playable and no badge | N/A |
| COOLDOWN | After use, Cooldown above 0 | Dimmed icon and a cyan badge with the live value | N/A |
| TURN_END | Owner ends turn and counters drop | Badge value updates, a zero counter removes the badge | N/A |
| SILENCED | Unit silenced | Dimmed, counters shown unchanged | N/A |
| DEATH | Unit leaves the board | Slot empties | N/A |
| USE | Select the slot, click a valid target | `UseActiveAbilityAction` is executed; slot updates to Cooldown | Invalid target is ignored like a spell |
| HOVER | Hover the slot | Inspect shows the ability face with the live counter | N/A |
| BLOODBOUND | Inspect the General's signature card | Ability face with the General's live counter | Legacy matches show the existing card |
| LEGACY | Legacy or version 1 match | Unchanged hand | N/A |

</frozen-after-approval>

## Code Map

- `duelyst/app/view/layers/game/BottomDeckLayer.js` -- binds hand slots (`bindHand`, `bindCardNodeAtIndex`) and listens for game events; add per-slot ability refresh.
- `duelyst/app/view/layers/game/handSlotUtils.js` -- hand slot helpers (`HEX_HAND_SIZE`); a natural home or neighbor for the testable slot-model module.
- `duelyst/app/view/nodes/cards/BottomDeckCardNode.js` -- hand slot node: `setSdkCardFromHandIndex`, `setSdkCard`, `updateUsability`, mana label, icon sprite; add the ability slot rendering, badge, and usability.
- `duelyst/app/view/layers/game/GameLayer.js` -- `_actionSelectedCardFromHand` (~l.6700), hand selection and target highlighting, inspect (`_inspectCardNode`, `_referencedCardNode`, ~l.5290-5330), `_setPhobiesFacesForShownCard`.
- `duelyst/app/view/nodes/cards/CardNode.js` -- `setPhobiesAbilityFaceEnabled`, `_setupPhobiesAbilityFace` (shows `lockdown || 0` and `cooldown || 1` in both rings today); needs live nonzero counter mode.
- `duelyst/app/sdk/player.coffee` -- `getActiveAbilityForHandSlot(slot)` returns `{unit, definition, state, silenced}`; `actionUseActiveAbility(unitIndex, position)`; `getSignatureCardData`.
- `duelyst/app/sdk/entities/entity.coffee` -- `getActiveAbilityState`, General ability definition (`getGeneralActiveAbilityDefinition`).
- `duelyst/app/resources/card_ui/phobies_ability/ability-layout.json` and `components/` -- ring and icon sizes; RSX keys `collection_card_ability_lockdown_ring|icon`, `collection_card_ability_cooldown_ring|icon`.
- Tests to extend: `duelyst/test/unit/view/inspect_card_resolver.js`, `game_layer_active_ability_inspect.js`.

## Tasks & Acceptance

**Execution:**
- [ ] `duelyst/app/view/layers/game/handAbilitySlot.js` (new, pure) and `duelyst/test/unit/view/hand_ability_slot.js` -- slot display model: effect card id, counter badge (type and live value or none), usable flag, signature face data; mocha tests for every matrix row -- decision logic is verifiable without cocos.
- [ ] `duelyst/app/view/nodes/cards/BottomDeckCardNode.js`, `duelyst/app/view/layers/game/BottomDeckLayer.js` -- render and refresh the ability slot, badge, and usability -- slot shows the ability.
- [ ] `duelyst/app/view/layers/game/GameLayer.js` -- selection executes `actionUseActiveAbility`; inspect passes live counters for deployed units and the Bloodbound card -- slot is usable and details are accurate.
- [ ] `duelyst/app/view/nodes/cards/CardNode.js` -- ability face live mode showing only the nonzero counter -- matches the counter rules.

**Acceptance Criteria:**
- Given a version 2 match with a unit that has an ability on the board, when the hand is shown, then its slot shows the effect spell icon with the live counter badge and the other slots are unchanged.
- Given that slot is ready and it is my turn, when I select it and click a valid target, then a `UseActiveAbilityAction` is executed and the slot shows Cooldown.
- Given legacy or version 1 matches, when the hand is shown, then rendering and interaction are identical to before.
- Given the unit tests for the slot model and the existing view tests, when run, then they pass; `node --check` passes for every edited view file.

## Implementation Notes

- A pure module `app/view/layers/game/handAbilitySlot.js` holds the slot model, counter selection, usability, and ability-face data (31 mocha tests). `BottomDeckCardNode` shows an emptied slot's ability as the effect spell's normal in-hand icon with the mana token replaced by a live counter badge; `BottomDeckLayer.refreshAbilitySlots` keeps slots current (skipping slots whose animation is running); `GameLayer` selects the slot and executes `actionUseActiveAbility`, and drops a stale selection when the slot has emptied.
- `CardNode` ability faces have a live mode that draws only the nonzero counter; the General's Bloodbound card and deployed units use it, while collection and no-session views keep the base counters.
- Verified by code reading and unit tests only; the manual Practice check in Verification is still open. Known unknowns: badge position at the slot's lower edge, the badge not dimming with an unusable slot, stale target highlights if the board changes during selection, and the icon appearing before the play animation ends.
- Review: edge-case and blind reviewers read the diff; confirmed fixes were applied (animation guard, stale selection, distance clamp), claims about Phasing speed and Flying construction timing were refuted by the code.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `cd duelyst && npx mocha --exit -t 3000 test/unit/view/hand_ability_slot.js test/unit/view/inspect_card_resolver.js test/unit/view/game_layer_active_ability_inspect.js` -- expected: all passing
- `cd duelyst && node --check app/view/nodes/cards/BottomDeckCardNode.js && node --check app/view/layers/game/BottomDeckLayer.js && node --check app/view/layers/game/GameLayer.js && node --check app/view/nodes/cards/CardNode.js` -- expected: no output

**Manual checks (no CLI):**
- Practice match with a deck containing Planar Scout: play it, confirm the slot shows the Phoenix Fire icon with a Lockdown badge, counts down at turn end, then use it on an enemy and see Cooldown. Hover the slot and the General's Bloodbound card and confirm the live counter on the ability face.
