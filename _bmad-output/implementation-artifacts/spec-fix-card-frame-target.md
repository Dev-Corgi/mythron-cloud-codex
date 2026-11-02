---
title: 'Correct Phobies Card Frame Target'
type: 'bugfix'
created: '2026-11-02'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/CARD_UI_HANDOFF.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/stories/6-wire-unit-and-ability-card-ui-into-the-hand.md'
---

<frozen-after-approval reason="human-owned intent — explicitly corrected by the user">

## Intent

**Problem:** The approved Phobies card frames were mistakenly added to the sprite-only game hand, while the user asked to replace the existing framed cards shown in the collection screenshots. The collection card list and its selected-card detail are two presentations of the same `CollectionCardCompositeView`.

**Approach:** Remove the mistaken frame overlay from the game hand and apply the approved layered unit and ability frame design to existing collection card faces, including the list and selected-card detail. Preserve the card sprite, collection information panel, interaction, inventory counts, unread state, and legacy non-collection card views.

## Boundaries & Constraints

**Always:** Use approved layered assets and layout JSON from `app/resources/card_ui/phobies_unit/` and `phobies_ability/`; use the existing animation sprite for card art; place the collection frame at its native 226×296 face size; style only `CollectionCardCompositeView` cards.

**Never:** Put the new frames on the sprite-only hand; change hand slot contents or positions; alter deck-building, crafting, gameplay inspect, card animation, collection detail information panel, approved artwork, or layout geometry; use preview PNGs as runtime assets.

</frozen-after-approval>

## Implementation Notes
- Restored the pre-Story-6 hand renderer; no Phobies face layers or UI resource registrations remain in the game hand path.
- Collection mapping is explicit: unit cards use `phobies_unit/unit_card_frame.png`; spell cards use `phobies_ability/ability_card_frame.png`; artifact, tile, and card-back views retain their current frame.
- Both screenshot surfaces use `CollectionCardCompositeView`, so the collection list and selected-card detail receive the same visuals; other `CardCompositeView` subclasses remain unmodified.
- New focused tests cover card-type selection plus every movement and attack icon mapping. Build and lint passed. Manual in-game visual confirmation remains unavailable until a collection session can be opened in the local client.




- Full resource build confirmed the frame, movement/attack/health/range, and rarity layers are copied into `dist/src/resources/card_ui/`.

## Review Triage Log

| Finding | Verdict and evidence |
|---|---|
| Unit versus ability frame mapping was not explicit in the brief | medium, resolved: the renderer maps collection units to the unit frame, spells to the ability frame, and leaves other card types unchanged. |
| Acceptance evidence for both collection surfaces and the unchanged hand was not explicit | medium, resolved: both surfaces share the collection renderer; hand integration from Story 6 was reverted; focused tests cover type routing and stat icons. |
