---
title: 'Face a balanced Practice bot that competes for Methron control'
type: 'feature'
created: '2026-11-02'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
story_key: '2-12-face-a-balanced-practice-bot-that-competes-for-methron-contr'
baseline_commit: 'c3c774045984379dd933b6201b2181c94b836d45'
outer_baseline_commit: '4b010ef13aa29d7c866e8141a3634f1e1d0e7f6e'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-11-face-a-practice-bot-that-evaluates-walls-and-routes.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/map-layout.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 2.10–2.11 made the Practice bot legal and terrain-aware, but it has no tactical valuation for persistent Methron control. As a result, it may ignore a safe capture, abandon a point before its control value resolves, or choose territory without weighing combat and survival.

**Approach:** Extend production StarterAI with candidate evaluation that compares expected Methron control damage, capture/recapture, combat value, and Unit survival through the authoritative end-turn sequence. Keep hypothetical evaluation isolated and use the shared SDK for movement, combat, capture, and turn-end effects.

## Boundaries & Constraints

**Always:** Apply the policy only to `practice-sandbox-hex` version 2. Value owner-controlled Methron Points even when empty; capture or recapture only from a surviving active Unit occupying a point when end-turn capture resolves. Estimate control damage after captures, for either ending player, as twice the control-count difference; equal ownership count means zero. Score the AI's and opponent's General health impact, combat removal/damage, and Unit survival in a common deterministic comparison. Preserve immediate winning actions and avoid choices that allow a forced loss when a safer available candidate prevents it. Use existing scalar difficulties, fixed Practice roster, reserve-mana and hand-slot contracts, and legal SDK actions.

**Never:** Change SDK capture, point ownership, turn-end timing, damage, movement, or replay rules; duplicate their resolution in AI; use experimental `phase_ii_ai.js`; add random point preferences; make capture unconditional over combat or vice versa; change other rulesets or card eligibility.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Capture and persistence | Candidate leaves a surviving Unit on a neutral/enemy-owned point, or leaves a friendly-owned point empty | Apply capture/recapture before control scoring; retain empty-point ownership | Use isolated candidate state and shared SDK end-turn execution |
| Control damage estimate | Either player ends with 3–1 control, or equal control | 3–1 predicts 4 damage to the disadvantaged General; equal predicts zero; General capture itself follows ordinary capture rules | Do not assign standing damage to the advantaged General |
| Survival and defense | Prospective capturer may die from relevant end-turn effects; a defender can preserve a point | Value only control that survives capture resolution; prefer defense when it avoids a worse control outcome | Do not count a dead or removed occupant |
| Balanced choices | Safe capture competes with neutral movement or combat; no immediate win/loss override | Deterministic fixtures show a capture-favorable and a combat-favorable choice, balancing control damage, combat and survival | Preserve win and forced-loss priorities |
| Integrated play | Fixed-roster sessions across existing difficulties reach AI turns and replay | AI actions validate and replay to the same point owners and General damage without changing roster or hand/mana behavior | Leave unsupported modes and versions unchanged |

</frozen-after-approval>

## Code Map

- `duelyst/server/ai/starter_ai.js` -- production `StarterAI` phase pipeline, attack selection, movement candidate scoring, and end-turn fallback. Integrate a bounded tactical comparison while retaining lethal checks and the existing legal action generators.
- `duelyst/server/ai/scoring/position/position_ScoreForCardAtTargetPosition.js` and `server/ai/scoring/utils/utils_scoreWallRouteBenefit.js` -- existing positional scoring and Story 2.11 isolated candidate-evaluation pattern; keep scoring deterministic and scoped to v2.
- `duelyst/app/sdk/actions/captureMethronPointAction.coffee`, `resolveMethronPointControlDamageAction.coffee`, and `app/sdk/gameSession.coffee` end-turn resolution -- authoritative ownership capture after end-turn effects, followed by control damage before the next turn. Simulate these through SDK actions; do not reimplement their rules.
- `duelyst/test/unit/sdk/ai/board_geometry.js` and `test/unit/sdk/ai/ai.js` -- deterministic fixed-roster AI selection fixtures. `duelyst/test/integration/misc/utils_game_session.js` -- authoritative control, survival, turn-end ordering, legality, and replay oracles.
- `_bmad-output/implementation-artifacts/spec-2-11-face-a-practice-bot-that-evaluates-walls-and-routes.md` -- continuity constraints for winning-action priority and candidate isolation.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/server/ai/scoring/utils/utils_scoreMethronControl.js` -- add deterministic isolated candidate/turn-end control, combat, survival, and immediate General-threat valuation using SDK resolution.
- [x] `duelyst/server/ai/starter_ai.js` -- compare legal territorial, movement, and combat candidates while preserving earlier lethal/action priorities and restricting the tactic to Methron ruleset v2.
- [x] `duelyst/test/unit/sdk/ai/methron_control.js` -- verify control damage, capture/persistence, survival ordering, defensive combat, winning/losing priorities, unsupported-version guard, and active `nextAction()` choices.
- [x] `duelyst/test/integration/misc/utils_game_session.js` -- ran the existing authoritative control, turn-end, legality, and replay integration suite as an SDK regression check.

**Acceptance Criteria:**
- Given a candidate that changes point occupation, when the candidate end-turn sequence is evaluated, then surviving occupants capture or recapture, empty points retain owners, and control damage reflects the resulting count.
- Given equally safe choices and no immediate win, when capture improves expected control damage, then deterministic selection favors capture; when combat value is better, it favors combat.
- Given a candidate exposing a capturer or General to relevant end-turn damage, when compared with defense or a safer choice, then the evaluation accounts for survival without overriding an immediate win or accepting a preventable forced loss.
- Given representative fixed-roster games at supported difficulties, when the bot completes turns, then actions remain legal and replay matches authoritative point ownership and damage.

## Implementation Notes

Candidate actions are serialized from the live state, executed in isolated GameSession projections, and followed through the shared SDK EndTurnAction. The score uses General health, persistent point counts, Unit material, terminal outcomes, and legal immediate lethal attacks the opponent can make on its next turn. The production AI compares every legal move reachable by its usable Units and every filtered Unit attack; earlier high-priority card actions and lethal actions retain precedence.

## Spec Change Log

## Review Triage Log

| Finding | Verdict and evidence | Route / outcome |
|---|---|---|
| Blind Hunter: tactical comparison omitted movement and combat alternatives, potentially preempting a better action. | **medium** — the initial candidate list omitted legal moves and only sampled one attack target; the final implementation evaluates all legal moves and all filtered Unit attacks before choosing. Active `nextAction()` tests cover capture and combat. | `patch` — fixed and verified. |
| Blind Hunter: unsupported ruleset/version guard lacked tests. | **low** — the evaluator and tactical selector both gate on `practice-sandbox-hex` v2; a v1 test now verifies zero score and no selected action. | `patch` — fixed and verified. |
| Blind Hunter: lethal-action precedence lacked a dedicated new test. | **false** — `_findNextActions()` tries high-priority actions and the existing lethal move/attack pass before calling the Methron comparison, returning immediately when either selects an action. No changed code path displaces an already-selected lethal action. | Rejected on that evidence. |
| Blind Hunter: multiple combat targets and terminal score lacked coverage. | **low** — all filtered Unit attack objectives are now evaluated; the terminal win/loss ±1000 score has explicit unit coverage. The remaining low-probability multi-target selection gap is covered by the all-target loop and active AI combat-path test; no additional branching fix is needed. | `patch` — implementation and terminal coverage verified. |
| Blind Hunter: the ±1000 terminal valuation was untested. | **low** — explicit winning and losing terminal position tests now cover the score bounds. | `patch` — fixed and verified. |
| Edge Case Hunter: a safer move could be omitted when it prevents a forced loss. | **medium** — the initial implementation sampled only the legacy-best neutral move and evaluated only the ending player's turn; it now scores every reachable legal move and applies a large penalty when the opponent can make a legal immediate lethal attack on the next turn. A deterministic direct-lethal fixture verifies the safer attack choice. | `patch` — fixed for immediate legal lethal threats and verified. |
| Verification Gap: direct helper tests could pass while live `nextAction()` ignored Methron choices. | **medium** — capture and combat assertions now call `StarterAI.nextAction()` on active v2 sessions and confirm the selected action kind; both tests pass. | `patch` — fixed and verified. |

## Design Notes

The authoritative `EndTurnAction` applies end-turn effects, captures living occupants, computes control counts and damage, then starts the next turn. Candidate scoring should derive expected outcomes from an isolated session so temporary movement, death, or ownership changes never leak into live play.

## Verification

**Commands:**
- From `duelyst`: `npx mocha --exit -t 1000 test/unit/sdk/ai/methron_control.js --reporter dot` (8 passing), `npx mocha --exit -t 1000 test/unit/sdk/ai/ai.js test/unit/sdk/ai/board_geometry.js --reporter dot` (34 passing), and `npx mocha --exit -t 1000 test/integration/misc/utils_game_session.js --reporter dot` (30 passing).
- From `duelyst`: `npx eslint --quiet server/ai/starter_ai.js server/ai/scoring/utils/utils_scoreMethronControl.js test/unit/sdk/ai/methron_control.js` and `git diff --check` -- clean.
