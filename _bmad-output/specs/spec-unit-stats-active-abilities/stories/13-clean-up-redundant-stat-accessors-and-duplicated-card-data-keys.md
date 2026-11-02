---
title: 'Story 13: Clean up redundant stat accessors and duplicated card-data keys'
type: 'chore'
created: '2026-11-02'
status: 'done'
baseline_commit: '2d629526'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-duelyst-2026-10-30/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The stat work left small duplications: an alias of an alias (`getAttackRangeStat`), two separate `hasOwnProperty("attackType")` checks, the Entity card-data key list written twice, an inline `require` in `Player.actionUseActiveAbility`, and a private `_isVersion2Ruleset` wrapper in `AttackRange` that repeats the AD-1 helper.

**Approach:** Remove or consolidate each one without changing behavior. Keep `getMovementDistance` and `getAttackRangeValue`, which the card UI and tests use as the named stat API.

</frozen-after-approval>

## Implementation Notes

- Decision: the plan said to remove the alias getters, but `getMovementDistance` and `getAttackRangeValue` are called by `CardNode.js`, `PhobiesCollectionCardVisual.js`, and tests, and they are the stat names the spec uses. Only the unused `getAttackRangeStat` was removed.
- `Entity.getHasExplicitAttackType` is now the single strict check (own property with a valid value); `getAttackType` and `AttackAction._isVersion2StatDrivenAreaAttack` both use it, and the area gate stays exactly as strict as before.
- `STAT_CARD_DATA_KEYS` in `entity.coffee` replaces both copies of the key list.
- `Player` requires `UseActiveAbilityAction` at the top. No circular-dependency failure appeared: it works when `player`, `useActiveAbilityAction`, `cardEligibility`, or `gameSession` is loaded first, checked with a fresh node process for each.
- `AttackRange` calls `entity.getIsPracticeSandboxV2()` and the wrapper is gone.
- Added a `unit_stats.js` test for the explicit attack type accessor and the copied keys; the full unit sweep and the transform, FirstBlood, and egg card tests pass. Subagent review layers were skipped for this behavior-preserving cleanup.
