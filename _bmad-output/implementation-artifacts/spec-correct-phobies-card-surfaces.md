---
title: 'Complete Phobies card visuals and Planar Scout ability detail'
type: 'bugfix'
created: '2026-11-02'
status: 'done'
route: 'dispatch'
baseline_commit: '57e8000271f622eecfd6e899f80e0ebe7a6e0afd'
submodule_baseline_commit: '031f8b19918b8f08c0834cbbf0089bb2cf9db25f'
review_loop_iteration: 0
context:
  - '{project-root}/CARD_UI_HANDOFF.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-fix-card-frame-target.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The approved Phobies unit frame is not used in the in-game inspect card. In collection cards the frame covers the existing animated unit sprite, unit effects are missing, and the movement/attack icons and values are positioned opposite the approved preview. Planar Scout's Phoenix Fire assignment is gated to a live v2 session, so the collection detail shown by the user has no visible active-ability entry. The related game inspect card also keeps the old spell frame and is positioned beside the unit instead of beneath it.

**Approach:** Apply the approved unit face to v2 in-game inspect cards only, restore the animated sprite above the collection frame, render unit effects, and position each stat icon at the ring's left edge with its numeric value inside the ring as shown in `preview_astral_crusader_geometry_v4.png`. Keep Planar Scout's Phoenix Fire definition available as card metadata in every context, while retaining v2-only active state and gameplay; show the ability as its own ability-framed card beneath the unit in collection details and v2 game inspection.

## Boundaries & Constraints

**Always:** Use the approved layered assets and card layout JSON files; preserve the original animated unit sprite and interactions; use live SDK stats and render card effects; show Planar Scout's Phoenix Fire (Lockdown 1, Cooldown 1) in an ability-framed card beneath the unit in collection details and v2 game inspection; keep ability state/use and paired in-game ability inspection restricted to Practice/Sandbox v2; retain ordinary references and legacy visuals.

**Never:** Change the sprite-only game hand, board unit presentation, fixed slots, deck/crafting views, gameplay rules, other card assignments, or unrelated collection behavior. Do not flatten previews into runtime assets.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Collection unit | Any unit card in list or selected-card view | Approved frame, animated sprite, effect text, icons left of rings, values centered inside rings | Missing optional icon falls back to existing stat mapping |
| Collection detail | Planar Scout selected | Phoenix Fire ability card using the approved ability frame appears below the unit; detail shows its name, effect, and 1/1 counters | Invalid/missing effect definition omits only the ability card |
| V2 game inspect | Unit inspected in Practice/Sandbox v2 | Approved unit frame and live unit art/stats; Phoenix Fire ability frame appears below its assigned unit; hand and board renderers remain unchanged | Non-unit inspect keeps its current view |
| Planar Scout detail | Collection detail or v2 inspect | Phoenix Fire is identified as the active ability with its 1/1 counters; v2 inspect retains the paired effect card | Invalid/missing effect definition omits only the ability detail |
| Legacy session | Card inspected or deployed outside v2 | Existing legacy card face and no active ability state/use | No state is initialized from card metadata |

</frozen-after-approval>

## Code Map

- `duelyst/app/ui/views2/collection/PhobiesCollectionCardVisual.js` -- collection frame composition; it currently adds the frame but does not place the existing `.card-sprite` inside that opaque face. It also centers stat icons and puts values 48 layout units below.
- `duelyst/app/ui/styles/common/cards.scss` -- collection-only frame and sprite stacking; keep changes scoped to `.card.collection-card.phobies-unit`.
- `duelyst/app/view/nodes/cards/CardNode.js` -- Cocos inspect card background, animated art, labels, and live stats. Add the unit face only when explicitly enabled by its inspect caller; leave normal CardNode users untouched.
- `duelyst/app/view/layers/game/GameLayer.js` -- owns the dedicated primary and related inspect nodes; enable the new unit face only for the v2 inspect nodes.
- `duelyst/app/sdk/cards/factory/core/neutral.coffee` -- Planar Scout definition; keep its effect metadata on the card, while `Unit.initializeActiveAbility()` and player/inspect ruleset gates keep behavior v2-only.
- `duelyst/app/ui/views2/collection/selected_card.js` and `templates/selected_card.hbs` -- build the selected-card information panel; expose the card's effect name and counters here.
- `duelyst/test/unit/view/phobies_collection_card_visual.js`, `test/unit/view/inspect_card_resolver.js`, and `test/unit/sdk/game/active_abilities.js` -- existing coverage points for layout mapping and v2-only runtime state.

## Tasks & Acceptance

**Execution:**
- [x] `PhobiesCollectionCardVisual.js` and `cards.scss` -- put the live sprite above the new frame, render unit effects, and reproduce the approved icon/value positions.
- [x] `CardNode.js` and `GameLayer.js` -- use the approved unit face only in v2 inspect nodes; show live unit art/stats and the related ability-framed card below the unit.
- [x] `neutral.coffee`, `selected_card.js`, and `selected_card.hbs` -- retain Phoenix Fire as Planar Scout metadata, keep state/use restricted to v2, and show its ability-framed card below the unit in collection details.
- [x] Existing focused coverage -- update assertions for the new metadata contract and verify legacy active state remains disabled.

**Acceptance Criteria:**
- Given a unit in collection or selected detail, when its card is rendered, then its effect text and animation are visible above the new frame and each stat icon overlaps the ring's left edge while the value is centered inside the ring, matching the approved preview.
- Given a unit is inspected in Practice/Sandbox v2, when the inspect card opens, then it uses the approved frame and live unit art/stats, and its related active ability appears below it in the ability frame without changing the game hand or board sprite.
- Given Planar Scout is opened in collection details, when its information is shown, then Phoenix Fire and Lockdown 1/Cooldown 1 are visible; in a v2 match, the existing related inspect card still resolves to Phoenix Fire.
- Given the same card is deployed in a legacy ruleset, when it initializes, then no active ability state is created and it cannot be used.

## Implementation Notes

- Collection cards keep the original animated `.card-sprite` inside the layered face, between the frame and the name/stat overlays. Stat values use the JSON ring centers; icons use each ring's left edge. Unit effects are rendered in the approved lower text area.
- V2 inspect nodes opt into the approved unit frame, live sprite and stats through `GameLayer`; other `CardNode` uses retain their current visual path. In V2, the related active ability card uses the approved ability frame and appears below the unit card.
- Planar Scout carries Phoenix Fire metadata in every context. Existing entity, player, and related-card gates still restrict active state, ability use, and paired gameplay inspection to Practice/Sandbox v2. Collection detail and V2 inspect stack the Phoenix Fire ability card below the unit and show Lockdown 1 / Cooldown 1 counters.
- The active-ability assertion for the legacy ruleset now checks that metadata remains present while instance state stays null. No test suite was run per the active workflow instruction.

## Verification

**Commands:**
- Targeted ESLint for changed JavaScript files -- passed.
- English, German, and Traditional Chinese collection locale JSON files parse successfully.
- CoffeeScript compile check for `neutral.coffee` -- passed. Coffeelint was also attempted but reports the file's existing CRLF line endings on every line (it requires Unix endings).
- `gulp css` -- stylesheet generated successfully; the tool reported existing Sass deprecation/autoprefixer warnings and a non-fatal Windows notification error.
- `npm run build` -- passed, generating CSS, locale bundles, JavaScript, and copied resources.
- Final `npm run build:app` after the inspect layout correction -- passed.
- Focused test suites were not run per the active workflow instruction.

**Manual checks:**
- Visually inspected `preview_astral_crusader_geometry_v4.png` and confirmed the approved stat-ring geometry. The user will manually verify collection list/detail and in-game Practice/Sandbox inspection; sprite-only hand and legacy visual preservation are not manually verified here.

## Design Notes

`card-layout.json` stores the four circular stat centers at `(77,136)`, `(77,214)`, `(77,292)`, and `(77,370)` in 2x top-left coordinates. The approved preview places each icon center at the ring's left edge offset and the number at the ring center; it does not place the icon in the ring center or the number below the ring. The sprite is a separate live animation layer above the frame fill and below card labels/stat overlays.

## Review Triage Log

- **high — patch (reviewed and superseded by user direction):** The first V2 inspect implementation omitted a visible Phoenix Fire assignment. Following the user's clarification, `GameLayer` now renders the related Phoenix Fire spell in its own approved ability frame below the unit, with its live card description and Lockdown/Cooldown counters.
- **medium — patch:** Collection unit faces omitted card effect text, and the Planar Scout detail only showed ability metadata as prose. The collection face now renders each unit's effect, while the selected detail stacks a separate ability-framed Phoenix Fire card beneath Planar Scout.
- **medium — patch:** The related V2 inspect card used the legacy spell face and sat beside the unit; a tall two-card stack could also extend past the lower screen edge. V2 active abilities now use the ability-specific face below the unit, and `GameLayer` adjusts both cards together to keep the pair in view.
- **medium — patch (reviewed and fixed):** `GameLayer.showInspectCard` now invokes `SDK.Unit` and the inspect node's opt-in method, but its focused test stub supplied neither; the existing related-card test would throw before its assertions. The stub now models a unit and the new opt-in method.
- **medium — defer (verification gap):** The collection DOM composition and V2 face's new skill slot still lack assertions for the rendered sprite/stat/icon/counter output. Existing visual-helper tests check classification and stat mappings only; checking the browser/client output would settle these behaviors. Defer a focused rendering-test pass to avoid expanding this requested visual correction into a new test harness.
- **low — patch (reviewed and fixed):** The selected-card template initially hardcoded Active Ability, Lockdown, and Cooldown while neighboring labels use localization keys. The three labels now use locale entries for English, German, and Traditional Chinese.
- **false:** The attack/movement fallback maps omit valid types. SDK's validated types are covered by the explicit maps, including `lobbed` and `phase`.
- **false:** The level label is stale after `updateStats`. Unit level is fixed card-definition data and is initialized whenever the inspected SDK card changes; `updateStats` only refreshes mutable battle stats.
- **false:** Hiding the card type label removes required type text. The approved unit-face design replaces it with the unit name and level and contains no type label.

## User-Directed Follow-up

The user clarified that the active skill must appear as a separate ability-framed card beneath its unit, matching the stacked game inspection reference. They also reported missing collection unit effects, broken active ability labels, and unavailable gameplay card inspection. The implementation now renders collection effects, stacks the Phoenix Fire ability card below the unit in selected collection details and V2 inspection, uses localized labels, and positions the pair within the game viewport.

Follow-up verification: full `npm run build` and final `npm run build:app` completed successfully; CSS and locale-copy tasks completed; targeted ESLint passed. The user will manually inspect collection and gameplay screens. Test suites were not run.
