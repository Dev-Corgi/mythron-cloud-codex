---
title: 'Repair implementation regressions across the Phobies import'
type: 'bugfix'
created: '2026-11-04'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '9719a7c9e81682d418d305da1e442532a2bde08f'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/phobies-import-audit-2026-11-04.md'
---

<frozen-after-approval reason="User authorized necessary repairs, automatic approval, and local commits">

## Intent

**Problem:** The Phobies import's completed stories contain incorrect effects, unusable General abilities, invalid target selection, missing presentation wiring, and tests that accept some of those errors.

**Approach:** Repair the concrete defects documented in the audit companion, using the original import contract and real engine integrations as authority. Preserve working features and prove corrected behavior through integrated tests and a client build.

## Boundaries & Constraints

**Always:** Work in this cardimplement worktree. Preserve legacy and hex-v1 behavior. Keep all 35 imported cards and their source stats, 16 ability definitions, fixed-hand rules and source attribution. Scope General magnitude changes to actual v2 General ability execution; preserve durations, counts, spawned-token base stats and normal spell uses. Conflicting hand-generation/draw General abilities remain unavailable under the existing contract. Retain explicit PB browsing and Practice/Sandbox deck editing.

**Never:** Alter old frozen story specs, stored user data, new action-model/Rush stories, or the unresolved Raising Hell geometry/Rage interpretations. Do not weaken tests, silently substitute FX/icons, push or deploy. Per the user's subsequent scope correction, do not pursue Husk followup completion, the obsolete Methron test expectation, or the AI capture-versus-combat test outcome as completion blockers; General ability redesign and AI replacement are future work.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected behavior | Error handling |
|---|---|---|---|
| Effects | Raising Hell or Gotcha against a legal enemy General | Raising Hell caster survives; Gotcha affects the General for two affected-owner turns | Invalid allies/range still rejected |
| Last point | Caw Claw, Bull Rush or Smashface with one AP | Embedded attack/movement completes, total AP reaches zero | Untrusted provenance cannot bypass rules |
| Push | Successful Smashface push | Victim data and target node reach the same destination; caster stays put | Blocked push still deals damage |
| Targeting | Ability with range/special geometry | Hand highlights and AI choose only SDK-valid positions | Invalid best-scoring option cannot suppress legal alternatives |
| Generals | Each accepted v2 General | Canonical signature regenerates and completed supported effects resolve with scoped dependencies and 100x magnitudes; Husk followup completion is deferred by the user | Incompatible draw/hand-generation abilities remain unusable without spending state |
| Presentation | Every roster ability | Correct skill art, actual caster/target FX resolution and correct coordinates | No missing resource silently replaced |
| Isolation | Legacy crafting, v1, or combined tests | No PB crafting entries, unchanged legacy rules, no mocked module leakage | Foreign-owner/generated-card attempts rejected |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/cards/factory/phobies/{abilities,neutral}.coffee` -- effect hooks, metadata and source assets.
- `duelyst/app/sdk/{actions/phobiesPushAction,actions/useActiveAbilityAction,validators/validatorEntityAction,player,rulesets/cardEligibility}.coffee` -- movement snapshots, provenance, target validation and General dependencies.
- `duelyst/app/sdk/spells/` -- existing Bloodbound damage/heal/buff/Warbird/Kinetic Surge resolution; reuse config and existing spell kinds.
- `duelyst/app/data/fx.js`, `duelyst/app/view/{Player.js,layers/game/GameLayer.js}` -- real FX leaves and playback positions; hand targeting source is the ability slot's living unit.
- `duelyst/app/ui/views2/collection/{PhobiesCollectionCardVisual,cards_collection}.js` and shared SDK pool policy -- real atlas frames and crafting source filtering.
- `duelyst/server/ai/starter_ai.js` -- filter ability candidates through authoritative legality before scoring/queuing.
- Existing SDK game/card/AI, UI deck and view tests -- audit companion records failures and wrong expectations.

## Tasks & Acceptance

**Execution:**
- [x] Correct effect semantics, last-point validation, Bull Rush Lockdown and all ability metadata/art assertions.
- [x] Repair completed v2 canonical General signature eligibility, scoped dependencies, incompatible-ability gating, numeric scaling and axial Warbird delivery; leave Husk completion deferred per user.
- [x] Capture and replay push target movement, and capture pre-effect caster origin for presentation.
- [x] Wire roster FX from actual event leaves, correct icon atlases, and verify DATA resolution plus GameLayer coordinates.
- [x] Share source-aware legal ability targets between hand UI and AI; exclude PB from legacy crafting via shared pool policy.
- [x] Repair stale deployment fixtures and test module isolation; run matrix coverage with the user's explicitly deferred failures reported rather than hidden.

**Acceptance Criteria:**
- Given every imported ability, when its corrected execution runs, then damage/healing/buffs, counters, source ownership, mana and AP satisfy the roster and existing rules.
- Given an accepted General in v2, when its signature is generated and used, then only that General's supported effect/dependencies enter play; the same legacy/v1 effects keep original values.
- Given the full affected suites run together, when all assertions finish, then no stale fixture or mock-cache failure remains and no test is skipped to conceal a defect.

## Implementation Notes

- The user previously authorized necessary auto-approvals and local commits. Investigation found no new product choice or irreversible step; continue with the documented repairs.
- See the audit companion for the complete story coverage, causal evidence and unchanged ambiguous requirements.
- User narrowed the scope after reviewing the last three failures: Husk followup, stale Methron expectation, and AI capture/combat outcome are not required for this repair. Preserve evidence and report these limits; do not keep extending General or AI work to make those tests green.
- Root combined verification after the scope correction: 396 passing, two visible failures (Husk followup and AI capture/combat), neither skipped. The obsolete Methron damage assertion now expects the correct 400 damage. Root genuine game_setup verification with an isolated ephemeral localhost Redis: 41 passing; the temporary container was removed after verification.
- Real event aliases resolve the roster's existing FX leaves. War Surge has no native SpellAppliedFX in the exported data; preserve its native caster effect without inventing an extra target effect. Ability step loading explicitly loads aliased assets independently of the original spell art package. Caster leaves are copied with atSource so NodeFactory places them at the captured origin.
- All 16 icon atlas frames and texture dimensions are checked against their actual plist files, including the 512x256 Greater Good atlas. Combined view tests no longer leak the mocked EntityNode module into TileNode tests.
- Live interactive visual/audio playback was not observed. Automated tests cover actual DATA lookup, asset loading, NodeFactory placement, GameLayer push playback and selected-hand highlighting; do not claim manual game verification.
- Final review patches passed 32 focused General/presentation tests (the user-deferred General 355 case was excluded from this additional focused check, but remains visible in the combined suite). They cover prismatic dependencies/Blink, unrelated-signature rejection, secondary-spell scaling isolation, Warbird minion filtering and executed push serialization/playback. Root reran changed-file ESLint successfully. Changed CoffeeScript compilation, the legacy FX parser check and diff checks passed.
- Final `npm run build:app` completed with exit 0 after replacing unsupported FX helper arrow syntax. The Windows desktop notification command failed only after successful bundling; build output is in `.tmp/phobies-final-build.log` (ignored).

## Spec Change Log

## Review Triage Log

- Blind Hunter 1 — medium / patch: new generated dependencies accepted a played signature without its actual ability ancestry. Tighten the new policy to its causal General ability; retain Egg's recorded origin.
- Blind Hunter 2 — medium / patch: new parent ID comparisons used raw IDs while signatures support prismatic IDs; normalize new v2 dependency checks consistently.
- Blind Hunter 3 — medium / patch: Blink's new axial followup pattern used a raw root ID; normalize it for supported prismatic signatures.
- Blind Hunter 4 — medium / patch: scaling every descendant spell of a General ability could rescale unrelated triggered spells; bind the multiplier to the actual effect card ID.
- Blind Hunter 5 — low / rejected: candidate enumeration constructs cards per target, but no user-visible latency or resource leak was demonstrated on the bounded board; caching introduces invalidation complexity and is not required for this repair.
- Blind Hunter 6 — low / user-deferred: broader General spawn count/location coverage is useful, but the user explicitly stopped further General-ability work after the remaining Husk failure.
- Blind Hunter 7 — low / patched: added the bounded Warbird column regression (enemy on-column 200, enemy off-column 0, ally on-column 0) alongside the existing focused patch checks.
- Blind Hunter 8 — medium / patch: manually populated push tests did not prove new movement coordinates survive serialization. Add an executed-action round-trip and victim-node playback assertion.
- Blind Hunter 9 — low / rejected: alias loading compares resources to the resolver, while separate DATA event identity checks and real NodeFactory positioning tests independently validate source leaves. Further exhaustive asset enumeration would add maintenance without a demonstrated omitted asset.
- Blind Hunter 10 — low / rejected: the hand integration test covers Terrorform and SDK tests cover Behold legality and readiness; a full cross-product of presentation tests duplicates authoritative validation without a new failing path.
- Edge Case Hunter — no additional confirmed behavioral finding. Root independently reproduced the new FX arrow syntax failing the actual client data parser; medium / patch, use supported function syntax.
- Verification Gap Reviewer — low / patched: duplicate of Blind Hunter 7; the executed minion-column regression now covers all included/excluded teams and positions.

## Verification

- Run complete `active_abilities`, `phobies_passives`, `phobies_lifegain`, `phobies_factory`, `card_eligibility`, relevant `game_setup`/General, AI, UI deck and combined `test/unit/view` suites; expect all affected cases passing, including every matrix row.
- Run changed-file ESLint/CoffeeScript compilation and `git diff --check`; expect clean results.
- Run `npm run build:app` from `duelyst`; expect the corrected client bundle and resource aliases to build. Report actual limits on live visual/sound observation.
