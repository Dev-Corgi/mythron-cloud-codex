- source_spec: `1-8-keep-conflicting-cards-out-of-new-rules-matches-fr17-fr18-fr.md`
  summary: Add an HTTP-level regression test that posts an excluded deck to `/api/me/games/single_player` and asserts the eligibility rejection response.
  evidence: The route now returns HTTP 400 for excluded decks, but current tests exercise only the eligibility helper and do not verify the route response.
- source_spec: `1-8-keep-conflicting-cards-out-of-new-rules-matches-fr17-fr18-fr.md`
  summary: Verify fixed-hand labels have locale fallback or add translations for supported locales.
  evidence: Fixed-hand labels added in earlier work exist only in English, German, and Traditional Chinese.
- source_spec: `1-8-keep-conflicting-cards-out-of-new-rules-matches-fr17-fr18-fr.md`
  summary: Audit direct hand and deck mutation APIs against fixed-hand rules.
  evidence: `applyCardToHand` and `applyCardToDeck` can be called without action validation; this predates Story 1.8 and belongs with fixed-hand action enforcement.
- source_spec: `1-8-keep-conflicting-cards-out-of-new-rules-matches-fr17-fr18-fr.md`
  summary: Add a UI-layer regression test for fixed hand slot rendering and index binding.
  evidence: Existing tests cover slot helpers but do not instantiate `BottomDeckLayer` or assert rendered nodes and bindings.

- source_spec: 1-10-enter-matches-with-valid-decks-and-the-fixed-practice-bot-fr.md
  summary: Preserve cards or confirm conversion on deck-purpose switching and handle incomplete draft saves without losing editor work.
  evidence: Review traced pre-existing model filtering and strict save rejection; not introduced by entry repair.
- source_spec: 1-10-enter-matches-with-valid-decks-and-the-fixed-practice-bot-fr.md
  summary: Fix pre-existing null bestObjective guard ordering in AI positional scoring.
  evidence: getPosition is dereferenced before null fallback; independent reviewers agree.
- source_spec: 1-10-enter-matches-with-valid-decks-and-the-fixed-practice-bot-fr.md
  summary: Verify and refresh hex highlight geometry after resize.
  evidence: Existing redraw closures capture origin/projection from construction.
- source_spec: 1-10-enter-matches-with-valid-decks-and-the-fixed-practice-bot-fr.md
  summary: Evaluate topology diameter caching and add deterministic runtime AI turn coverage.
  evidence: User-owned AI work repeats pairwise distances; roster tests cover setup, not runtime AI scoring/actions.
- source_spec: spec-restore-resource-package-completeness.md
  summary: Normalize Windows separators in the resource generator's factory exclusion filter.
  evidence: The scanner returns native backslash paths but the factory/ exclusion accepts forward slash only; this over-includes SDK resources and does not cause the missing shared packages fixed here.
- source_spec: `_bmad-output/specs/spec-unit-stats-active-abilities/stories/6-wire-unit-and-ability-card-ui-into-the-hand.md`
  summary: Reuse existing hand overlay nodes across repeated usability refreshes.
  evidence: Review found the bounded hand renderer recreates overlay sprites and labels on cache/usability refresh; this is correct but could be optimized if profiling shows hand-update churn.
