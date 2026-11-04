---
title: 'Remove duplicate Phobies cards from the collection'
type: 'bugfix'
created: '2026-11-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

<frozen-after-approval reason="User authorized auto-approval and continuation">

## Intent

**Problem:** The collection can display duplicate Phobies cards when card definitions from multiple sources reach its display list.

**Approach:** Ensure collection display lists contain at most one model per card ID while retaining the canonical Phobies model and existing filters, sorting, inventory, and skin behavior. Add focused regression coverage for duplicate source entries.

</frozen-after-approval>

## Implementation Notes

- User explicitly authorized auto-approval and asked for the fix to proceed.
- Runtime investigation found the SDK pool excludes Phobies, the collection explicitly adds 35 unique Phobies IDs, and Backbone reset deduplicates models. The original report was not reproduced from this data path. Added a defensive uniqueness check at `CardsCollectionCompositeView._showCards`, the point where models become the visible page list.
- Distinct skin/prismatic models have distinct IDs and remain separate. No changes to user inventory, deck data, or external state.
- Added a pure helper regression for first-occurrence ordering, repeated IDs, missing IDs, and distinct variant IDs. Focused tests (including collection visuals): 8 passing; targeted ESLint, diff check, and `npm run build:app` passed. Manual in-game reproduction remains unavailable, so the reported trigger is not confirmed.

## Review Triage Log

- maybe-false / deferred: review noted the helper test does not instantiate the full Marionette `_showCards` view. The call site directly assigns `uniqueCardModels(cards)` to `_currentShowingCards`; initializing this view in the current Node test harness requires browser globals. A running collection view would settle whether another DOM path creates duplicates.
- No irreversible actions or external effects. Expected footprint: collection model assembly and a focused unit test. Preserve distinct skin/prismatic card IDs; only identical card IDs are duplicates.
