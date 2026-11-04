---
title: 'Fix active ability card counter presentation'
type: 'bugfix'
created: '2026-11-04'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Active ability inspect cards show misaligned counter numerals, omit base lockdown/cooldown badges or replace printed definition values with changing live state. Some ability previews also retain unrelated unit stats, as seen on Flash Reincarnation.

**Approach:** Render ability-face counters from the ability definition with centered values and their matching icons/rings. Keep live availability state out of this card face, and suppress unrelated entity stats while an ability face is enabled.

</frozen-after-approval>

## Implementation Notes

- Relevant paths: `duelyst/app/view/layers/game/handAbilitySlot.js`, `duelyst/app/view/nodes/cards/CardNode.js`, `duelyst/app/resources/card_ui/phobies_ability/ability-layout.json`, and their unit/view tests.
- Preserve live counters in the hand slot itself; only inspect-card face uses static definition values.
- Verify hand ability, related-unit ability, and General signature previews, including zero lockdown and Flash Reincarnation stat visibility.
- Always show both definition counters, including Lockdown 0, with their ring and icon. Center LabelTTF vertically and horizontally. Hide attack, health, and mana overlays on ability faces.
- Verification: 47 focused view tests pass; ESLint passes for all changed JS files. `npm run build:app` stopped emitting output during bundling and its process disappeared; the build result could not be verified.

## Review Triage Log

- patched — A zero Lockdown definition must still show its badge and `0` alongside Cooldown; both static counters now always render.
- patched — LabelTTF had no vertical alignment set, which placed glyphs off the ring center despite centered positions; both text axes now use centered alignment.
- false — `buildAbilityFaceData` still uses `state` to distinguish absent runtime state from an active preview; the reported unused-parameter lint concern does not apply. Changed files pass ESLint.
