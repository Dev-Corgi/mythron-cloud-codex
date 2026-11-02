---
title: 'Story 6: Wire unit and ability card UI into the hand'
type: 'feature'
created: '2026-11-02'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '1bec122fec0c6000aedf9f339dd45213c89fdb27'
context:
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
  - '{project-root}/CARD_UI_HANDOFF.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Practice/Sandbox v2 hand still renders the existing card presentation and does not expose the new movement, attack, level, or active-ability counters. The approved layered `phobies_unit` and `phobies_ability` assets remain disconnected from the game's resource loader and hand renderer.

**Approach:** Wire the layered card assets and their layout data into the hand rendering path. Show unit movement and attack icons, numeric values, level, and the live ability card/counter in the granting unit's fixed slot, while preserving normal card interactions and legacy presentation.

## Boundaries & Constraints

**Always:** Use the layered assets and layout JSON in `duelyst/app/resources/card_ui/phobies_unit/` and `phobies_ability/`; never use flattened preview PNGs as runtime assets. Use the approved geometry and LEVEL styling documented in `CARD_UI_HANDOFF.md`. Include the lobbed `attack_arc` icon. Movement icons: walk/fly/phase; attack icons: melee/ranged/lobbed/area. Render a nonzero Lockdown with its violet ring and padlock, or a nonzero Cooldown with its cyan ring and hourglass; show only the active counter. Replace movement/attack keyword text with the corresponding icons. Source counters and stats from the live SDK card state. Scope presentation to Practice/Sandbox v2 and preserve existing hand behavior elsewhere. Verify in the running game.

**Never:** Render preview images in-game, change approved asset geometry or asset source artwork, shift fixed hand slots, alter Story 7's inspect/detail view, change gameplay rules or card data, or regress card targeting, highlighting, affordability, selection, card-back, flipping, or summon presentation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Unit in v2 hand | Unit with each movement/attack type and stats | Card shows correct icons, numeric values, LEVEL N, and current attack/health | Missing optional stat values use SDK defaults |
| Ability-bearing unit on board | Living unit has hand slot N and nonzero Lockdown or Cooldown | Slot N shows effect card, name/level, and only the matching live counter overlay | Stale or absent unit state leaves the hand slot empty |
| Counter changes or silence | Ability counter decrements or ability becomes silenced | Existing slot display refreshes from current SDK state without moving the slot | Stale async resource callbacks do not overwrite a newer card |
| Legacy or other card | Match outside Practice/Sandbox v2 or non-unit card | Existing presentation and interactions remain unchanged | N/A |

</frozen-after-approval>

## Code Map

- `duelyst/app/data/resources.js` and `duelyst/app/data/packages.js` -- register and load layered frame/icon assets for the game package; keep previews out of runtime resources.
- `duelyst/app/view/nodes/cards/BottomDeckCardNode.js` -- renders individual hand cards and owns card sprite resource lifecycle, hand index, and affordability presentation; integrate v2 visuals while preserving selection and interaction layers.
- `duelyst/app/view/layers/game/BottomDeckLayer.js` -- binds SDK hand slots and refreshes nodes; preserve fixed slot index and refresh visuals when card/state changes.
- `duelyst/app/view/nodes/cards/CardNode.js` -- full-size card composition and existing keyword/stat presentation; reuse only if it fits hand rendering without altering Story 7's inspect layout.
- `duelyst/app/sdk/entities/entity.coffee`, `unit.coffee`, `player.coffee` -- authoritative stat getters, active ability state, hand-slot association, silence state, and effect card data from Story 5.
- `duelyst/app/resources/card_ui/phobies_unit/card-layout.json`, `phobies_ability/ability-layout.json` -- layout source; frame PNGs, individual icons, rarity assets and counter components are runtime layers. Do not use `preview_*.png`.
- `CARD_UI_HANDOFF.md` -- approved asset/design constraints and current reference previews for visual comparison only.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/data/resources.js`, `duelyst/app/data/packages.js` -- register and request only the layered frame/icon assets required by the hand UI.
- [x] `duelyst/app/view/nodes/cards/BottomDeckCardNode.js` and related card UI renderer -- compose unit and ability card layers from SDK state and layout JSON; preserve existing hand interactions and legacy rendering.
- [x] `duelyst/app/view/layers/game/BottomDeckLayer.js` and relevant view update path -- refresh live ability counter/silence presentation in its original slot without stale resource callbacks.
- [ ] `duelyst/test/` and running Practice/Sandbox v2 client -- automated mapping/state checks pass; visual match check is pending because the local client stops at login without a configured Firebase test account.

**Acceptance Criteria:**
- Given a Practice/Sandbox v2 unit card in hand, when its card is rendered, then its movement and attack icons/values and LEVEL N follow the approved layered layout, including the arc icon for lobbed, with no movement/attack keyword text.
- Given a granting unit is alive on the board, when its fixed hand slot is rendered, then the associated effect card and live Lockdown or Cooldown counter appear in the matching layered design; counter changes update in place.
- Given the unit dies or its state is absent, when the hand updates, then its ability display is removed and the fixed slot stays in place.
- Given a legacy match or non-unit hand card, when rendered, then its existing appearance and interaction behavior are unchanged.
- Given runtime assets are loaded, when the running Practice/Sandbox v2 game is inspected, then layers align with the approved geometry and no preview image is used.

## Implementation Notes

- The hand renderer overlays the approved unit/ability frame layers on the existing live card art and preserves the normal mana card path outside Practice/Sandbox v2. Active ability state is rebound into its original hand index on cache updates.

## Verification

**Commands:**
- `cd duelyst && ./node_modules/.bin/mocha -t 1000 test/unit/view/phobies_hand_card_visual.js` -- 5 passing.
- `cd duelyst && ./node_modules/.bin/eslint --quiet --format compact app/view/nodes/cards/BottomDeckCardNode.js app/view/nodes/cards/PhobiesHandCardVisual.js app/view/layers/game/BottomDeckLayer.js scripts/generate_packages.js test/unit/view/phobies_hand_card_visual.js` -- no errors.
- `cd duelyst && $env:FIREBASE_URL='https://localhost.firebaseio.com/'; npm run build:app` -- passed; required Babel cache access was granted, and a local placeholder URL satisfied the build's Firebase URL validation.
- `cd duelyst && node -e "const fs=require('fs'),path=require('path'),r=require('./app/data/resources'); const keys=Object.keys(r).filter(k=>k.startsWith('card_ui_')); if(keys.some(k=>!fs.existsSync(path.join('app',r[k].img)))) process.exit(1); console.log(keys.length+' layered RSX paths resolve')"` -- 22 layered RSX paths resolve.
- `git diff --check` -- passed.

**Manual checks:**
- Started the built local client and single-player game server. The client reached its login screen, but no local Firebase test account/configuration is available, so the real Practice/Sandbox v2 hand could not be opened for visual verification.

## Review Triage Log

| Finding | Verdict | Evidence and route |
|---|---|---|
| Unit health used maximum instead of current health (blind hunter; also edge-case claim) | medium | `Entity.getHP()` subtracts current damage from max HP; the hand card now renders `getHP()` and the focused test asserts the current value. Patched. |
| Ability card level was hardcoded (blind hunter) | low | The SDK entity exposes `getLevel()`; the ability overlay now reads it, with a level-2 renderer assertion. Patched. |
| Unit mana cost removed (blind hunter) | false | `createUnit()` explicitly adds `card.getManaCost()` at the approved `positions.cost`, while the old token/label are hidden to prevent duplicates. |
| Attack type fallback may mislabel unsupported attacks (blind hunter) | false | The renderer maps every SDK-allowed value (`melee`, `ranged`, `lobbed`, `area`) and SDK defaults to melee; the test exercises all four. |
| Overlay recreation churns on usability refresh (blind hunter) | low | Refresh recreates a bounded set of hand-card overlay nodes on cache/usability changes. It has no correctness effect and no measurable user-facing impact in the current fixed hand size; deferred. |
| Silenced ability may look ready (blind hunter) | false | `updateUsability()` calls `showUnusable()` when silenced, which dims the full live card visual; slot binding also carries the current silence state. |
| Cache event handler lacks direct coverage (verification-gap reviewer) | medium | Added a focused test that registers `_startListeningToEvents`, emits both cache events, and asserts each rebinds and updates usability in the same slot. Patched. |



