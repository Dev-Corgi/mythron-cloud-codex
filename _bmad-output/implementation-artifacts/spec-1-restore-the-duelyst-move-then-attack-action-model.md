---
title: 'Story 1: Restore the Duelyst move-then-attack action model'
type: 'feature'
created: '2026-11-03'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '2ccd3bfb429a093066730add1b2fa75fac2b54fc'
context:
  - '../../specs/spec-duelyst-action-model-rush/SPEC.md'
  - '../../planning-artifacts/architecture/architecture-action-model-rush-2026-11-03/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Practice and Sandbox v2 currently allow two interchangeable action points, so units can take action sequences that diverge from original Duelyst rules. The model also applies to generals, abilities, UI and AI, so local validator changes would leave inconsistent behavior.

**Approach:** Replace the v2 action-point budget with Entity's per-turn move and attack slots. Active abilities use the attack slot through the same accessor and recording path as attacks; exhaustion, refresh, serialization, transforms, AI and UI use the same model.

## Boundaries & Constraints

**Always:** Follow AD-18, AD-19, AD-20 and AD-22 in the architecture spine. Permit at most one move and one attack action per unit each turn; the move must precede the attack or ability. Embedded ability moves/attacks bypass readiness slot checks and do not record extra slots. Only executed moves spend the move slot. Summons remain exhausted until their owner's next turn start. Preserve Lockdown/Cooldown behavior, ruleset v2, general/Bloodbound behavior and fresh building-completion state. Ignore old action-point keys without migration.

**Never:** Implement Story 2 or change card data/Rush. Retain any action-point field, API, branch, test name, UI display or AI rule. Add compatibility for old snapshots/replays or alter Lockdown/Cooldown semantics.

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/entities/entity.coffee` -- canonical move/attack counters and readiness, exhaustion and stat-card copy keys; remove action-point state and make ability readiness one accessor.
- `duelyst/app/sdk/actions/` -- move and attack record slots only on explicit execution; ability validates, calls `recordAttack`, then resolves embedded actions; exhaustion action stores only exhausted/move/attack state.
- `duelyst/app/sdk/modifiers/modifierTransformed.coffee` and `modifierBuilding.coffee` -- carry exhausted/move/attack state, keeping positional arguments aligned; building completion starts fresh.
- `duelyst/app/sdk/validators/`, `gameSession.coffee`, `entities/unit.coffee` -- validation, turn refresh and summon initialization use Entity mutators/accessors.
- `duelyst/server/ai/starter_ai.js` and card/player ability UI -- query the shared ability accessor; do not re-derive eligibility.
- `duelyst/test/unit/sdk/game/` -- replace action-point tests and cover legal/rejected sequences, serialization, transforms, summons, general abilities, failed/zero movement, AI/UI gates and Lockdown/Cooldown.
- Preserve non-v2/original rules and unrelated cards. Search all callers of removed action-point methods, all `ModifierTransformed.createContextObject` sites, and all action-point identifiers in code and tests.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/entities/entity.coffee`, actions, modifiers, validators, session, AI and UI -- remove v2 action-point accounting and route all eligibility and recording through Entity slots.
- [x] `duelyst/test/unit/sdk/game/` -- replace action-point tests with coverage for sequences, edge cases, ability-origin embedded actions, exhaustion, snapshots, transforms and general abilities.
- [x] Search the repository for every retired action-point identifier and confirm none remains in code or tests; run the full test suite (runner/environment blocked complete execution).

**Acceptance Criteria:**
- Given a ready entity, when it moves once, then it can attack or use an eligible ability, but a second move is rejected.
- Given a ready entity, when it attacks or uses an ability, then another attack, an ability after attack, an attack after ability, and a move are rejected that turn.
- Given a ready entity, when it takes no action, attacks only, uses an ability only, moves only, moves then attacks, or moves then uses an ability, then the sequence is legal.
- Given an ability has embedded moves or attacks, when it resolves, then embedded work passes readiness checks without consuming additional slots.
- Given a move is rejected or moves zero tiles, then it does not consume the move slot.
- Given an ordinary unit is summoned, when its summon turn continues, then it is exhausted; at its owner's next turn start, its slots and exhaustion refresh.
- Given per-turn state is serialized/restored, then exhausted, movesMade and attacksMade preserve remaining legal actions; action-point keys are absent/ignored and no migration is added.
- Given a general uses its Bloodbound ability, then it spends the same attack slot under the same ability conditions.
- Given the AI or UI checks ability eligibility, then both use `Entity.getCanUseActiveAbility`; attack-less units can use abilities when all AD-7 conditions hold.
- Given Lockdown/Cooldown behavior is exercised, then existing behavior and tests remain unchanged.
- Given a building completes, then its new unit starts with fresh exhaustion and slot state.
- Given the repository is searched after implementation, then no retired action-point field, accessor, branch, flag or test reference remains.

## Implementation Notes

- Baseline and post-change `npm test` both fail before tests load: Node 22 causes legacy `require-dir` to access missing `module.parent.filename` from `test/index.js`.
- Direct `mocha --recursive test/unit test/integration` and `test/unit/sdk/game` attempts reach initialization but crash when Kue connects to sandbox-blocked Redis (`EACCES 127.0.0.1:6379`); Firebase credentials are also unavailable.
- Focused verification passed: 55 unit tests across move/attack slots, basic actions and unit stats; 9 focused ability/slot/transform tests; 31 hand ability slot tests; 2 v2 unit-ability AI tests. CoffeeLint and ESLint passed for changed source/test files (ESLint reports existing warnings only).
- Action-point identifier search returned no matches in app/server/test. Story 2/card data were untouched. Full suite completion and legacy Lockdown/Cooldown suite results remain blocked by the test setup above; no commit was made because the full tests did not pass.

## Spec Change Log

## Review Triage Log

- patch — Sequence coverage lacked move then ability; added a v2 test that accepts move→ability and rejects attack and another move afterward.
- patch — Transform coverage copied state manually; replaced it with a real `PlayCardAsTransformAction` preserving exhaustion and slots.
- patch — Building coverage only tested the state getter; now completes `ModifierBuilding` and verifies a fresh replacement.
- patch — No rejected-move slot assertion; added one proving rejected movement leaves the move slot available.
- patch — No summon-turn refresh integration test; added summon, opponent turn, and owner refresh assertions.
- false — Embedded move and attack recording is covered by the existing Caw Claw ability test, which verifies ability-origin actions and exactly one attack slot.
- false — General Bloodbound slot use is covered by active-ability tests asserting `attacksMade === 1` after use.
- maybe-false / defer — Lockdown/Cooldown rejection assertions exist, but the related ability suite cannot pass its positive validation branch because the fixture uses cards rejected by the Practice/Sandbox card audit; the test/runtime setup has not been verified against the baseline. Deferred pending an audited test fixture and runnable test environment.
- patch — Ability readiness lacked spent/exhausted assertions; added checks that `getCanUseActiveAbility()` is false after spending the attack slot and while summon-exhausted.
- false — UI tests mock the accessor intentionally to verify the view uses it; AI v2 unit ability tests invoke and resolve abilities using the shared accessor and passed.
- patch — Ability-origin readiness bypass changed non-v2 behavior; gated the bypass to Practice/Sandbox v2 and added non-v2 regression assertions.
