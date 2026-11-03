---
title: 'Story 13: Teach the Practice AI to Use Active Abilities'
type: 'feature'
created: '2026-11-03'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'a2d705718982ac4edde6992a2b91388261faaaa8'
context:
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-phobies-card-import-2026-11-02/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-duelyst-2026-10-30/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Practice's heuristic AI can use its General's Bloodbound ability, but does not consider active abilities on deployed units.

**Approach:** Add unit ability candidates to the existing StarterAI decision flow. Reuse its balanced policy and target scoring, and construct the existing `UseActiveAbilityAction` so SDK rules remain authoritative.

## Boundaries & Constraints

**Always:** Follow AD-7, AD-11, and AD-17. Consider only the AI's active, usable, ready, unsilenced, unstunned units with action points. Generate candidates from the ability effect card's legal target positions and range; final validation remains in `GameSession.validateAction`. The ability use costs one AP total. Preserve the existing difficulty behavior for General abilities and the existing priority order for winning moves, lethal attacks, tactical moves, and cards.

**Never:** Add a second ability engine, bypass SDK validation, alter the 35-card roster or effects, change non-v2 AI behavior, or make every ready ability fire regardless of its value.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Favorable unit ability | A ready allied unit has a legal, high-value target and the unit can spend AP | Existing balanced policy may select `UseActiveAbilityAction` with that unit and target | Do not enqueue invalid or duplicate candidates |
| Not ready | Ability has Lockdown/Cooldown, silence/stun, no AP, or unit is inactive | AI skips it and continues its existing action policy | No action-point or board changes |
| Illegal target | No valid target, target out of ability range, or effect validator rejects it | AI skips the candidate and can choose another legal action or end turn | No repeated invalid-action loop |
| General ability | Current v2 General signature is ready and difficulty permits signature use | Preserve current General ability candidate and execution behavior | Continue respecting readiness, AP, and difficulty |

</frozen-after-approval>

## Code Map

- `duelyst/server/single_player.coffee` -- constructs `StarterAI` for Practice; this is the production AI path.
- `duelyst/server/ai/starter_ai.js` -- `_findNextActions` is the balanced priority flow; `_getMyUsableUnits`, `_getCardsInHandAndSignatureSpell`, `_findFilteredTargetPositionsScoresAndFollowupsForCardByIntent`, and `_findPlayCardActionsForCard` provide reusable unit selection, target scoring, and General ability behavior. Add unit abilities without reordering existing priorities.
- `duelyst/server/ai/scoring/threshold.js`, `scoring/base/card.js`, and `scoring/intent/intents.js` -- retain established score thresholds and effect-aware targeting scores; add only the Phobies ability intent metadata needed for these existing scorers.
- `duelyst/app/sdk/player.coffee`, `actions/useActiveAbilityAction.coffee`, `entities/entity.coffee`, and `validators/validatorPlayCard.coffee` -- reuse ability action creation, effect lookup, readiness/AP accessors, range and target validation.
- `duelyst/test/unit/sdk/ai/ai.js` -- existing v2 StarterAI fixtures cover General abilities and provide deterministic setup for unit-ability selection, readiness, validation, and effect assertions.
- `duelyst/test/integration/misc/utils_game_session.js` -- existing Practice AI difficulty/replay coverage can confirm generated actions remain legal across current difficulty values.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/server/ai/starter_ai.js` -- generate and score eligible unit ability candidates in the existing policy flow while preserving General handling and priorities.
- [x] `duelyst/server/ai/card_intent/` -- define or extend only the intent metadata needed for existing scoring to evaluate Phobies ability targets.
- [x] `duelyst/test/unit/sdk/ai/ai.js` -- cover favorable ability selection, validation/effect resolution, and readiness/illegal-target skips.
- [x] Practice AI verification -- confirm representative difficulty actions remain legal and existing General ability selection is unchanged.

**Acceptance Criteria:**
- Given an eligible Practice v2 unit with a ready active ability and a favorable legal target, when StarterAI chooses its next action, then it can choose a `UseActiveAbilityAction` for that unit and target under the existing balanced policy.
- Given a unit ability that is locked, cooling down, silenced, stunned, out of action points, or without a legal target, when StarterAI generates candidates, then it does not submit that ability and continues its existing legal decision flow.
- Given a unit or General ability selected by the AI, when SDK validation and execution run, then the action is legal, uses the existing effect, and spends only its one AP.
- Given a non-v2 match or an existing difficulty setting, when AI decisions are generated, then existing behavior and General ability difficulty rules remain unchanged.

## Implementation Notes

The Practice entry path instantiates `StarterAI`; scripted `StaticAgent`/`AgentActions` are not the Practice opponent decision pipeline. General Bloodbound already enters through the signature-card candidate path. Unit abilities need an explicit candidate path because effect cards are not ordinary cards in the deck hand array and cannot be played with `PlayCardFromHandAction`.

## Spec Change Log

## Review Triage Log

- medium — patch — Blind Hunter: a favorable legal Terrorform target lacked an intent score and fell below the ability threshold; verified because the zero-cost spell score alone was insufficient. Added Wall placement/removal utility scoring.
- medium — patch — Edge Case Hunter: the same missing Terrorform utility scoring caused legal Wall candidates to be skipped; this is a separate finding with the same root cause, retained and fixed by the Wall utility scorer.
- medium — patch — Blind Hunter: Special Delivery and Poof's burn intent scored enemies but omitted the friendly caster's self-destruction; added caster-loss cost to both.
- medium — patch — Blind Hunter: Gotcha immobilizes rather than stunning, so the original full stun scorer misrepresented its value; changed to CannotMove modifier scoring plus bounded immobilization value.
- medium — patch — Blind Hunter: Raising Hell's original intent represented adjacent targets but omitted its two-tile straight-ray damage; added ray scoring. Existing adjacent scoring is retained once, without duplication.
- medium — patch — Blind Hunter: Caw Claw and Bull Rush intents omitted movement/path value; added bounded destination, path-damage, and push-position utility.
- medium — patch — Verification Gap Hunter: tests called the ability helper directly and did not prove the normal Practice `nextAction()` flow selected an ability; added a favorable ability assertion through `nextAction()`.
- medium — patch — Implementation review: the first utility patch duplicated adjacent damage already scored by `Nearby` intents and penalized Raising Hell's caster despite that ability not self-destructing; removed both errors and retained caster-loss cost only for Special Delivery, Poof, and Gotcha.
## Design Notes

Ability target scoring should reuse the same card/intent target score and thresholds as ordinary spells. Keep lethal and immediate tactical choices ahead of ordinary ability use; within the existing ability/card tier, select only candidates whose score meets that tier's threshold.

## Verification

**Commands:**
- `./node_modules/.bin/mocha -t 1000 test/unit/sdk/ai/ai.js` -- expected: unit ability candidate selection, readiness guards, General behavior, and legacy AI tests pass.
- `./node_modules/.bin/mocha -t 10000 test/integration/misc/utils_game_session.js` -- expected: current Practice AI difficulty actions remain valid and deterministic in outcomes.
- `./node_modules/.bin/eslint --quiet server/ai/starter_ai.js test/unit/sdk/ai/ai.js` -- expected: no JavaScript lint errors.
- Blind Hunter — Terrorform receives no positive intent score, so valid Wall creation/removal candidates remain below threshold — Patch: add useful board-state scoring; confirmed from the zero-cost effect and missing intent registration.
- Edge Case Hunter — A favorable legal Terrorform target is skipped because it lacks a scored intent — Patch: same root cause as the Blind Hunter finding; retained as a separate reviewer finding and addressed by the Terrorform scoring fix.
- Blind Hunter — Special Delivery and Poof damage the caster, but their target-only burn score ignores that friendly-unit loss — Patch: include the caster's self-destruction cost when evaluating the ability.
- Blind Hunter — Gotcha immobilizes but is scored as a full stun — Patch: use a distinct lower immobilization value consistent with its CannotMove effect.
- Blind Hunter — Raising Hell scoring omits its two-tile line damage beyond the adjacent blast — Patch: score both resolver regions without counting any target twice.
- Blind Hunter — Caw Claw and Bull Rush scoring omits path damage and positional/push value — Patch: add bounded movement/path utility to their resolved effect score.
- Verification Gap Hunter — Unit ability tests called the helper directly and did not establish that Practice's `_findNextActions` decision flow selects it — Patch: exercise `nextAction()` with a favorable unit ability and assert the selected action.

- Implementation Review — Shared Nearby intent scoring already covered adjacent damage; duplicate adjacent blast scoring was removed, and the non-self-destructing Raising Hell caster penalty was removed — Patch applied and verified against card-roster.md.

