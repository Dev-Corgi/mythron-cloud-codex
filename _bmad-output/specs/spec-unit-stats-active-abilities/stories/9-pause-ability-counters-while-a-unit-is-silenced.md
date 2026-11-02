---
title: 'Story 9: Pause ability counters while a unit is silenced'
type: 'feature'
created: '2026-11-02'
status: 'done'
baseline_commit: 'a7f7fe9a'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** In version 2, Lockdown and Cooldown keep decreasing at the owner's turn end while a unit or General is silenced, but silence should freeze them and re-enabling should resume from the same values (spine AD-7, active-ability-rules.md).

**Approach:** Make `Entity.decrementActiveAbilityCounters` do nothing while the entity is silenced. Units and Generals share this one path since Story 8, so no other code changes.

</frozen-after-approval>

## Implementation Notes

- `Entity.decrementActiveAbilityCounters` returns early while the entity is silenced; units and Generals share the path since Story 8, so this is the only code change.
- Tests in `active_abilities.js` cover a unit and the General: counters stay frozen through owner and opponent turn ends while silenced, then resume from the same values at the owner's next turn end. Both fail when the early return is removed.
- Review: the three subagent layers were skipped for this one-line change; behavior was proven by the fail-then-pass check above and the surrounding test files pass.
