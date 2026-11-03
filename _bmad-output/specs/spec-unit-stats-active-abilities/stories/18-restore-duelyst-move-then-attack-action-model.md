---
title: 'Story 18: Restore Duelyst move-then-attack action model'
type: 'feature'
created: '2026-11-03'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/stories/4-replace-move-and-attack-allowance-with-action-points.md'
---

## Intent

**Problem:** Practice/Sandbox v2 currently permits two interchangeable action points per unit. Restore the original Duelyst sequence while treating an active ability as the unit's attack action.

**Approach:** Replace action-point-based movement, attack, and ability eligibility with one move slot followed by one attack slot. Keep the existing summon exhaustion and owner-turn refresh behavior, and make the authoritative rules, AI, UI, and persisted action state agree.

## Boundaries & Constraints

**Always:** Practice/Sandbox v2 only; preserve legacy and version 1 behavior. Valid sequences are move only, move then attack, move then ability, attack only, ability only, and no action. Movement is unavailable after an attack or ability. A direct attack and active ability share one slot. Embedded moves/attacks in ability effects consume no additional slot. Ordinary summons stay exhausted until their owner's next turn start. Lockdown/Cooldown rules do not change.

**Never:** Keep two interchangeable action points as the v2 action contract; allow attack plus ability in one turn; allow a separate move after an attack or ability; change ability counter rules or card stats.

## Code Map

- `duelyst/app/sdk/entities/entity.coffee` -- per-turn move/attack eligibility, action state, exhaustion/readiness, and serialized card data.
- `duelyst/app/sdk/actions/moveAction.coffee`, `attackAction.coffee`, `useActiveAbilityAction.coffee`, and `setExhaustionAction.coffee` -- explicit and embedded action accounting.
- `duelyst/app/sdk/validators/validatorEntityAction.coffee` and `validatorPlayCard.coffee` -- authoritative legality.
- `duelyst/app/sdk/gameSession.coffee`, `gameSetup.coffee`, and `entities/unit.coffee` -- owner-turn refresh and summon initialization.
- `duelyst/server/ai/starter_ai.js`, `phase_ii_ai.js`, and action scoring -- choose only currently legal sequences.
- `duelyst/app/view/nodes/cards/EntityNode.js`, `view/Player.js`, and hand ability UI -- exhausted/readiness and ability usability indicators.
- `duelyst/test/unit/sdk/game/basic.js`, `active_abilities.js`, `unit_stats.js`, `action_point_accessors.js`, plus relevant AI and view tests -- characterize the action matrix and state round trips.

## Acceptance Criteria

- Given a ready unit, when it moves once, then it may attack or use a ready ability; a second move is invalid.
- Given a ready unit, when it attacks, then another attack, ability use, and move are invalid for that turn.
- Given a ready unit, when it uses a ready ability, then a direct attack and a separate move are invalid for that turn.
- Given a ready unit that has not attacked, when it uses a ready ability after moving, then the action is legal; a unit may also attack or use an ability without moving.
- Given an ability effect with embedded movement or attack actions, when the ability resolves, then those effects do not consume an additional move or attack slot or grant another explicit action.
- Given a newly summoned ordinary unit, when the summon action resolves, then it is exhausted until its owner's next turn start; at that start, its move and attack action are available.
- Given a unit action state saved and reconstructed or replayed within the supported current format, when it has moved or consumed its attack action, then its legal remaining actions are identical after restoration.
- Given the local AI considers a unit, when it chooses movement, attack, or ability use, then it does not propose a sequence rejected by the same action rules.
- Given a unit's readiness changes, when the board/hand refreshes its presentation, then the exhausted/readiness indicator and ability usability reflect whether move and attack actions remain; no action-point count is shown.
- Given the rule regression suite, when it covers each listed valid sequence and attack-plus-ability, move-after-attack, move-after-ability, and second-move rejection, then results match this contract.

## Open Questions

- Historical snapshots/replays recorded under two action points may require a migration rule; the required behavior is not specified in the current contract.
