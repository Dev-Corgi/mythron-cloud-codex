---
title: 'Move v2 General health, Methron damage, and Wall health into one ruleset config'
type: 'feature'
created: '2026-11-03'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '5d622cd4056a8360723f8c35ae48adf646d67796'
context:
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/SPEC.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-phobies-card-import-2026-11-02/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/stories.yaml'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Practice and Sandbox v2 currently take their General, Bloodbound Spell, Methron, and Wall numbers from separate values, which can drift and does not match the Phobies-scale rules.

**Approach:** Define the v2 numeric rules in one config and consume it at match setup, Wall creation, General ability resolution, and Methron control damage. Keep v1 and other modes on their existing values.

## Boundaries & Constraints

**Always:** Use the established `getIsPracticeSandboxV2()` gate. The v2 config supplies General health 6000, a 100x General attack scale, a 100x Bloodbound Spell effect scale, Methron damage 200 per point of control deficit, and Wall health 2000. Apply General health and attack to match entities at v2 setup without changing shared General card definitions. Apply Bloodbound scaling only when a General ability resolves in v2, without editing legacy spell definitions. Keep Methron scoring authorization, count logic, and normal damage resolution intact while reading its per-point value from config. Use the configured Wall health for v2 Walls, including later-created Walls; legacy Walls remain 10 health. The numeric Bloodbound effects currently present in the six BBS definitions are DebuffBBS's -2 Attack modifier and SacrificeBBS's 2 self-damage; record their scaled results in the implementation notes.

**Never:** Change `practice-sandbox-hex` v1, legacy matches, non-BBS spell behavior, Wall visuals, Methron ownership/scoring rules, or persistence formats. Do not introduce a migration or per-match copy of numeric values. Existing v2 saved matches, replays, and snapshots made under the old values are a rollout purge owned by the project owner; this implementation does not mutate stored data.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New v2 match | Any supported General pair | Both Generals start at 6000 Health and have 100x their factory Attack | Use normal setup and entity stat paths |
| Bloodbound effect | General uses DebuffBBS or SacrificeBBS in v2 | The effect amount is 100x; the corresponding legacy spell remains unchanged | Use existing ability and spell resolution |
| Methron deficit | v2 control count difference is N | Disadvantaged General receives 200 × N normal damage | Preserve existing authorization and lethal handling |
| Wall creation | Wall created in v2 or another mode | V2 Wall has 2000 Health; other modes retain 10 | Preserve existing tile factory behavior outside v2 |
| Compatibility | v1 or legacy match is set up and played | Existing General, spell, Methron, and Wall values remain | Existing version gates apply |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/rulesets/rulesetsLookup.coffee` -- owns v1/v2 identities and `isPracticeSandboxV2`; extend this central ruleset definition with the v2 numeric config.
- `duelyst/app/sdk/gameSetup.coffee` -- creates and adds Generals and creates v2 terrain; apply configured General values at v2 setup.
- `duelyst/app/sdk/cards/factory/misc/tiles.coffee` -- shared Wall factory currently sets 10 Health; preserve that default outside v2 and read configured v2 health when created for a v2 session.
- `duelyst/app/sdk/actions/resolveMethronPointControlDamageAction.coffee` -- already v2-gated and authorized; replace the inline per-point multiplier with config while retaining `DamageAction`.
- `duelyst/app/sdk/actions/useActiveAbilityAction.coffee`, `duelyst/app/sdk/cards/factory/core/faction3.coffee`, `duelyst/app/sdk/spells/spellSacrificeBBS.coffee` -- General abilities resolve through `UseActiveAbilityAction`; DebuffBBS stores -2 Attack and SacrificeBBS applies 2 self-damage. Apply scaling in the v2 General-ability path only.
- `duelyst/test/integration/misc/utils_game_session.js` and `duelyst/test/unit/sdk/game/game_setup.js` -- existing fixtures cover Methron authorization/replay and v2 Wall/setup behavior; extend the focused coverage for configured values and legacy/v1 preservation.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/rulesets/rulesetsLookup.coffee` -- define one v2 numeric config and expose it through the existing ruleset/session path.
- [x] `duelyst/app/sdk/gameSetup.coffee` and `duelyst/app/sdk/cards/factory/misc/tiles.coffee` -- apply configured General Health/Attack and Wall Health only in v2.
- [x] `duelyst/app/sdk/actions/resolveMethronPointControlDamageAction.coffee`, `duelyst/app/sdk/actions/useActiveAbilityAction.coffee`, and the two BBS effect definitions -- apply configured Methron and Bloodbound scales without mutating legacy card definitions or behavior.
- [x] Existing focused SDK tests -- cover all configured values and prove v1/legacy values remain unchanged.

**Acceptance Criteria:**
- Given a v2 match, when setup completes, then both Generals have 6000 maximum and current Health, 100x their factory Attack, and every v2 Wall has 2000 Health.
- Given a General uses either BBS with a numeric effect, when its v2 effect resolves, then DebuffBBS applies -200 Attack and SacrificeBBS deals 200 damage to its General; ordinary use outside v2 keeps the existing -2 and 2 values.
- Given a v2 control deficit of N, when authorized Methron scoring resolves, then the disadvantaged General takes 200 × N normal damage; authorization, equal-control behavior, and lethal handling are unchanged.
- Given a v1 or legacy match, when setup and effects resolve, then existing General, Wall, Methron, and spell values are preserved.

## Implementation Notes

- Practice and Sandbox v2 resolve DebuffBBS as -200 Attack and SacrificeBBS as 200 self-damage; ordinary and legacy spell values remain -2 Attack and 2 damage.
- Replay reconstruction applies the same v2 General stats as new-match setup and flushes cached attributes so restored legacy card data cannot retain 25 Health / 2 Attack.
- The focused Mocha suites passed: 72 tests across `test/integration/misc/utils_game_session.js` and `test/unit/sdk/game/game_setup.js`. They used the already-running local Redis service with elevated execution because sandboxed startup returned `EACCES`.

## Spec Change Log

## Review Triage Log

- `medium` — `rulesetsLookup.coffee` returned the shared v2 config by reference; a consumer mutation would change subsequent v2 sessions. Changed the getter to return a shallow copy and added a regression test; route: `patch`.
- `false` — The General scaling formula reads `getBaseATK()` and applies the configured multiplier for whichever General reaches setup; existing tests cover both players, and the BBS fixture also sets up a different General. No incorrect stats outcome was demonstrated; the request was for broader optional coverage.
- `false` — Bloodbound scaling checks `sourceAction.getIsGeneralAbility()` before scaling, so non-ability spell actions do not enter the v2 adjustment. The finding identified missing additional tests rather than a reachable behavior defect.
- `false` — Replay reconstruction calls `configureRulesetGeneral` with `resetDamage` false, and the helper does not change damage; maximum Health adjustment therefore preserves the restored damage value.
- `false` — The unit setup test explicitly creates a Wall after v2 setup and expects 2000 Health, confirming later-created Walls use the ruleset config.
- `false` — Live session serialization stores the changed entity stats, while initial replay setup reapplies v2 stats after card reconstruction; the replay regression checks Health and Attack. No divergent restore behavior was demonstrated.

## Design Notes

The six BBS identifiers are `KingsGuardBBS`, `SwordsBBS`, `SacrificeBBS`, `DebuffBBS`, `EggBBS`, and `StunBBS`. Repository definitions show numeric effect amounts only for DebuffBBS (-2 Attack) and SacrificeBBS (2 self-damage). Spawned-card stats, mana costs, durations, and unrelated printed values are not effect amounts and are not scaled.

## Verification

**Commands:**
- From `duelyst`: run the focused GameSetup and game-session integration suites -- expected: v2 configured values and v1/legacy preservation pass.
- From `duelyst`: changed-file CoffeeLint/ESLint and `git diff --check` -- expected: clean.
