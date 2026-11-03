---
title: 'Load source sprite packages for imported Phobies cards'
type: 'bugfix'
created: '2026-11-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="user-requested bug fix">

## Intent

**Problem:** Imported Phobies cards reuse animation resources from mapped Duelyst cards while retaining their own Phobies IDs. Runtime card-package loaders request packages using the Phobies IDs, so the hand, battlefield, reveal animation, and hover card sprites are missing.

**Approach:** Resolve a card's source resource ID from `originalCardId` for card game and inspect package lookups, falling back to the card's own ID. Apply this consistently to initial game loads, card nodes, and action resource loading while preserving Phobies IDs for gameplay and display.

</frozen-after-approval>

## Implementation Notes

Added a shared resource-ID resolver to `scripts/generate_packages.js`, which emits it in `app/data/packages.js`; card game and inspect package identifiers now accept card objects and resolve imported cards through `originalCardId`, while numeric/string IDs continue to work unchanged. Updated initial hand/board preloads, Cocos card and entity nodes, action source/target preloads, artifact/signature/deck/log inspect nodes, and watch-game key-card preloads. Gameplay identity, display names, stats, and the Phobies card frame continue to use the Phobies ID.

Package generation, ESLint, and `git diff --check` passed. The JavaScript bundle built successfully. In a fresh local Practice match using the final bundle, Phobies-derived unit sprites appeared in the player's hand and on the battlefield, and the AI's played units displayed on the opponent's side.

## Review Triage Log

- **medium — patch:** The initial review found this spec's implementation notes empty while code changes were present. Added the resource-ID resolution behavior, affected loading paths, and verification state.
- **medium — defer:** Story 19 retains a Rush-uniqueness question that conflicts with the settled Phobies-only scope in the active-ability SPEC and memlog. Added it to deferred work for a focused story-document update.
- **low — defer:** Story 10 relies on CAP-6 for the move/attack contract. The detailed sequence exists in the main spec; direct story wording can be improved independently. Added it to deferred work.
- **medium — defer:** Story 18 leaves historical action-point snapshot/replay handling open. This is a persistence compatibility decision outside the sprite-loading fix. Added it to deferred work.
- **maybe-false — defer:** The collection spec does not say whether Phobies set visibility should be limited by gameplay deck eligibility. The intended distinction needs product clarification. Added it to deferred work.
