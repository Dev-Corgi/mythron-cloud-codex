---
title: 'Story 1: Restore the Duelyst move-then-attack action model'
type: 'feature'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/specs/spec-duelyst-action-model-rush/SPEC.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-action-model-rush-2026-11-03/ARCHITECTURE-SPINE.md'
---

## Intent

**Problem:** Units get 2 interchangeable action points per turn (move, attack, ability = 1 each; refresh to 2; summoned = 0).

**Approach:** Replace it with one move then one attack action per unit and turn, where an active ability is the attack action. Keep state, validation, turn refresh, AI, UI and saved data in agreement. Implementation only; this spec run changed no code.

## Boundaries & Constraints

**Always:** Valid sequences: move only, move then attack, move then ability, attack only, ability only, nothing. No move after an attack or ability. Attack and ability share one slot. Embedded ability moves/attacks cost no slot. Summoned units stay exhausted on the summon turn and refresh at the owner's next turn start. Lockdown/Cooldown unchanged.

**Never:** Keep action points as the rule or show a point count; allow attack plus ability in one turn; change counters, stats, or card data.

## Code Map (starting points; verify against the repo)

- `duelyst/app/sdk/entities/entity.coffee` -- per-turn action state, exhaustion/readiness, serialization.
- `duelyst/app/sdk/actions/` (move, attack, use-active-ability, set-exhaustion) -- explicit and embedded accounting.
- `duelyst/app/sdk/validators/` and `gameSession.coffee`, `entities/unit.coffee` -- legality, turn-start refresh, summon initialization.
- `duelyst/server/ai/` -- starter and phase II AI choose only legal sequences.
- `duelyst/app/view/` entity/player/hand ability UI -- exhausted and ability-usable indicators.
- `duelyst/test/unit/sdk/game/` -- existing rule/active-ability tests.

## Acceptance Criteria

- Given a ready unit, when it moves once, then it may attack or use a ready ability; a second move is rejected.
- Given a ready unit, when it attacks, then another attack, an ability use, and a move are rejected that turn.
- Given a ready unit, when it uses an ability, then a direct attack and a move are rejected that turn (no attack plus ability, no move after ability).
- Given a ready unit, when it moves then uses a ready ability, then the sequence is legal; attack-only, ability-only and no-action turns are also legal.
- Given an ability with embedded moves or attacks, when it resolves, then no extra slot is consumed and no extra explicit action is granted.
- Given a newly summoned ordinary unit, then it cannot act on the summon turn and can move and attack/use an ability at its owner's next turn start.
- Given a unit's per-turn state is saved and restored (or replayed) in the new format, then its remaining legal actions are identical.
- Given snapshots/replays recorded under two action points are discarded (no compatibility required), then loading none of them is expected, and no migration code is written.
- Given a general, including its Bloodbound ability, then it follows the same move-then-attack rules.
- Given a zero-tile or rejected move attempt, then the move slot is not consumed and the unit may still move.
- Given the AI considers a unit, then it never proposes a sequence the rules reject.
- Given the board/hand refreshes, then exhausted and ability-usable indicators reflect remaining move/attack slots, with no action-point count shown.
- Given a Practice/Sandbox v2 ability unit with ATK 0 or attack type none and an unspent attack slot, then it can use its ability (one gate, `getCanUseActiveAbility`, used by validator, UI and AI alike).
- Given an ability with an embedded move or strike, when it is used, then the ability is validated, the attack slot is recorded once via `recordAttack`, and the embedded actions still execute (readiness checks pass for `isAbilityOrigin`) without recording another slot.
- Given the code base, then no reference remains to `actionPoints`, `actionPointsSpentThisTurn`, `getUsesActionPoints`, `getActionPoints`, `setActionPoints`, `spendActionPoint`, `getIsOutOfActionPoints`, `recordActiveAbilityUse` or `restoreActionPointState`, including `SetExhaustionAction`, every `ModifierTransformed.createContextObject` call site and the action-point test files; removed-method callers use the single ability accessor.
- Given a building completes, then its new unit starts with fresh (original) exhaustion and slot state.
- Given stored snapshots, then before implementing it is confirmed they carry `exhausted`, `movesMade` and `attacksMade`; action-point keys are ignored if present.
- Given Lockdown/Cooldown tests, then they pass unchanged.
- Given the rule test suite, then every valid sequence and each rejection above is covered.
