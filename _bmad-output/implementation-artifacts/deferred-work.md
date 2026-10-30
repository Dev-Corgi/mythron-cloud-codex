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
