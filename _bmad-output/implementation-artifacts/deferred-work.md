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
- source_spec: `spec-correct-phobies-card-surfaces.md`
  summary: Add focused rendering assertions for the collection card face and V2 in-game unit inspect face, including Planar Scout's Phoenix Fire icon and Lockdown/Cooldown counters.
  evidence: Existing collection visual tests cover card classification and stat mappings but do not exercise rendered DOM layering; the GameLayer inspect test verifies the paired effect card but does not assert the new face output.
- source_spec: `_bmad-output/specs/spec-unit-stats-active-abilities/stories/8-move-the-general-s-bloodbound-ability-state-onto-its-entity.md`
  summary: Unify the General's Bloodbound ability under UseActiveAbilityAction and port the AI, server, and UI callers (Story 14).
  evidence: Server AI, single-player tracking, Player.js events, and SignatureCardNode all call PlaySignatureCardAction directly in version 2, so switching the action type together with the state move is a separate shippable change with its own AI and UI risk.

- source_spec: `_bmad-output/specs/spec-phobies-card-import/stories/8-implement-the-five-phobies-passives.md`
  summary: Complete Story 5 ability-origin wiring and verify actual active-ability execution marks embedded actions with the caster source.
  evidence: Review found `setAbilityOriginOn` has no production caller in the diff; Story 8 tests use it directly, so real ability actions may not carry the provenance assumed by the new passives.
- source_spec: `_bmad-output/specs/spec-phobies-card-import/stories/8-implement-the-five-phobies-passives.md`
  summary: Preserve ability-origin provenance when root actions are indexed after marking and when area attacks create child attacks.
  evidence: Review traced `setAbilityOriginOn` only registering a child when the root already has an index, and `AttackAction` creates area children with parent linkage alone; these are pre-existing Story 5 action infrastructure changes.
- source_spec: `_bmad-output/specs/spec-phobies-card-import/stories/8-implement-the-five-phobies-passives.md`
  summary: Make ability-origin movement validation consistently honor immobilize bypass across rulesets and reject inactive units.
  evidence: `getCanMove`'s non-action-point branch still reads ordinary speed and exhaustion/move limits, while the action-point branch lacks an active-state check; reviewers confirmed the existing ability test covers only the action-point sandbox.
- source_spec: `_bmad-output/specs/spec-phobies-card-import/stories/8-implement-the-five-phobies-passives.md`
  summary: Add a poison-state regression once the SDK models poison as a unit status or modifier.
  evidence: Current SDK search finds no poison unit status/modifier; Regatorate only executes `HealAction`, but the current test cannot assert the poison-specific acceptance behavior.
- source_spec: `_bmad-output/specs/spec-phobies-card-import/stories/9-implement-the-damage-heal-buff-and-debuff-actives.md`
  summary: Make ability-origin movement bypass immobilize consistently in non-action-point rulesets.
  evidence: Review traced the non-action-point `Entity.getCanMove` branch to ordinary speed; that branch is part of the pre-existing Story 5 infrastructure diff, not Story 9.
- source_spec: `_bmad-output/specs/spec-phobies-card-import/stories/10-implement-the-self-destruct-and-adjacent-area-actives.md`
  summary: Resolve whether Raising Hell's distance-two area requires direct line alignment or applies to every unit at hex distance two.
  evidence: Review found the current implementation applies distance tiers by hex distance, while the roster text specifies a straight line.
- source_spec: `_bmad-output/specs/spec-phobies-card-import/stories/10-implement-the-self-destruct-and-adjacent-area-actives.md`
  summary: Add multi-target self-destruct coverage for source death during area resolution.
  evidence: Existing Story 10 tests cover one adjacent enemy, not whether all selected targets resolve before the source is destroyed.

- source_spec: `_bmad-output/implementation-artifacts/spec-load-phobies-source-sprite-packages.md`
  summary: Resolve the stale Rush uniqueness question in Story 19 against the settled Phobies-only decision.
  evidence: Story 19 still asks whether uniqueness includes original Duelyst cards, while the active-ability SPEC and memlog explicitly limit the passive to the Phobies roster and preserve original Duelyst Rush cards.
- source_spec: `_bmad-output/implementation-artifacts/spec-load-phobies-source-sprite-packages.md`
  summary: Clarify Story 10's v2 move and attack-action contract directly in its description.
  evidence: Story 10 delegates behavior to CAP-6 without stating the current one-move plus shared attack-or-ability slot sequence, leaving implementers to cross-reference the main spec.
- source_spec: `_bmad-output/implementation-artifacts/spec-load-phobies-source-sprite-packages.md`
  summary: Decide how historical action-point snapshots and replays are handled by the current saved-state format.
  evidence: Story 18 requires reconstructed state consistency within the current format but leaves older action-point state migration behavior open.
- source_spec: `_bmad-output/implementation-artifacts/spec-load-phobies-source-sprite-packages.md`
  summary: State whether the Phobies collection filter shows every imported card or only cards eligible for Practice/Sandbox decks.
  evidence: The visual correction adds a Phobies set filter, while the current collection specification does not distinguish set membership from deck eligibility.

- source_spec: '_bmad-output/implementation-artifacts/spec-1-restore-the-duelyst-move-then-attack-action-model.md'
  summary: Verify unchanged Lockdown/Cooldown behavior with an audited Practice/Sandbox ability fixture and a runnable full test environment.
  evidence: Existing active-ability assertions are present, but the suite's positive action branch fails the card audit; full npm test aborts in legacy require-dir under Node 22 and direct unit/integration execution is blocked by Redis EACCES, so this behavior could not be verified end to end.
- source_spec: '_bmad-output/implementation-artifacts/spec-2-rework-rock-pulverizer-with-rush.md'
  summary: Re-run the unchanged Lockdown/Cooldown assertions with an audited Practice/Sandbox fixture under a working full test environment.
  evidence: The existing positive action branch fails its Practice/Sandbox card audit, and full npm test aborts in legacy require-dir under Node 22 before loading tests; the targeted Story 2 suite does not exercise those unrelated abilities.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-summon-fly-and-phase-units-onto-walls-next-to-general.md`
  summary: Add regression coverage that embedded ability movement and strikes do not consume explicit move or attack slots.
  evidence: Story 1 changed the action accounting, but current new move/attack tests verify explicit actions and do not exercise an ability whose effect embeds a move or strike.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-summon-fly-and-phase-units-onto-walls-next-to-general.md`
  summary: Add a test that an area attack consumes one explicit attack slot while resolving multiple implicit victims.
  evidence: Current area geometry tests cover target selection and damage, while move/attack slot tests do not assert area-action accounting.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-summon-fly-and-phase-units-onto-walls-next-to-general.md`
  summary: Add exhausted-unit rejection coverage for automatically generated moves and attacks.
  evidence: The new slot tests cover rejected explicit moves and active abilities, but not automatic action proposals after the corresponding slot is used.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-summon-fly-and-phase-units-onto-walls-next-to-general.md`
  summary: Add an authoritative hand-action rejection test for flying and phasing Units placed on a non-adjacent Wall.
  evidence: Story 4 tests reject such positions in placement queries but validate only the legal adjacent hand-action case.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-summon-fly-and-phase-units-onto-walls-next-to-general.md`
  summary: Add an explicit regression test that a second Unit cannot use the Wall exemption when a Unit already occupies the same position.
  evidence: The exemption predicate only exempts a Tile Wall obstruction; a Unit-first obstruction remains blocking, but the coexistence tests do not exercise a second summon at that location.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-summon-fly-and-phase-units-onto-walls-next-to-general.md`
  summary: Add ranged-blocking coverage for enemies positioned on a shared-edge intersection of the firing line.
  evidence: Existing Story 3 ranged tests cover direct-axis blockers and geometry cases but no enemy shared-edge blocker case was located in the review.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-summon-fly-and-phase-units-onto-walls-next-to-general.md`
  summary: Add ranged-blocker coverage showing an inactive or removed enemy immediately stops blocking a shot.
  evidence: Existing ranged tests cover active blockers and Walls; no removed/inactive enemy transition case was located in the review.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-summon-fly-and-phase-units-onto-walls-next-to-general.md`
  summary: Keep ability-origin move and attack counter behavior unchanged outside Practice/Sandbox v2.
  evidence: `recordMove` and `recordAttack` now skip counters for ability-origin actions in every ruleset, while the architecture scopes the restored action model to v2; legacy behavior should be checked and covered separately.
