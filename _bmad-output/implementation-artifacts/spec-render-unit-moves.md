---
title: 'Keep moved units in sync with the rendered board'
type: 'bugfix'
created: '2026-11-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
baseline_commit: '4cdf3a1ba31598293802c075ba31ca1e77ab71e7'
---

<frozen-after-approval reason="User authorized automatic approval and continuation">

## Intent

**Problem:** A unit can have its SDK board position updated by a move action while its rendered node remains at the prior position. This leaves the board display inconsistent with authoritative game state.

**Approach:** Preserve the existing move animation when it can run, and make the rendered entity reliably finish at the action's destination when animation resources or node state prevent normal playback. Cover the movement completion and fallback behavior with focused tests.

</frozen-after-approval>

## Implementation Notes

- User authorized auto-approval and requested uninterrupted implementation.
- `GameLayer._showActionForGame` dispatches `MoveAction` to `EntityNode.showMove`; `showMove` currently only synchronizes the position through its async resource callback when `canChangeState()` remains true.
- `MoveAction` stores source and target positions before/after execution; the movement data path is already working per the user report. Preserve action semantics and avoid edits to SDK movement rules.
- Inspect the asynchronous animation completion/cancellation and zero-duration paths; fix the smallest reachable rendering gap found, then add view-level regression coverage.
- No external or irreversible effects. Scope is the move renderer plus focused unit test(s).
- `duelyst/app/view/nodes/cards/EntityNode.js`: `showMove` now keeps the node at its action destination and emits the matching tile movement events when animation state or resources prevent playback.
- `duelyst/app/view/nodes/cards/EntityNode.js`: resource rejection is handled separately from animation callback errors, and a stale resource request cannot update a replacement card node.
- `duelyst/test/unit/view/entity_node_move_fallback.js`: covers locked state, rejected and invalid resources, a state change during loading, a stale request, and hex-board coordinates.
- Verification: the focused Mocha suite passes (6 tests); focused ESLint and `git diff --check` pass.

## Review Triage Log

- `medium / patch` — the initial state fallback omitted `before_show_move`, which `TileNode` uses to refresh the source tile; the fallback now emits start and completion events in order.
- `low / rejected` — normal animation and equal-position cases are not directly tested, but the existing animation body remains unchanged and fallback behavior is covered for locked state, resource rejection, and hex positions; extra harness complexity for unchanged paths was not justified.
- `medium / patch` — rejected or invalidated resource requests could leave the node at the source position and moving; the guarded fallback now snaps the current card to the target and emits completion events.
- `medium / patch` — Blind Hunter found no resolved-invalid resource test; added coverage proves a still-current node snaps to target, stops moving, and emits both movement events.
- `low / patch` — Blind Hunter found the stale-request guard lacked coverage; added a rejection-after-card-replacement test proving the old action does not mutate the replacement node.
- `medium / patch` — Blind Hunter found the broad `.catch` could hide animation setup exceptions; resource rejection is now handled as the second `.then` callback, leaving callback exceptions visible.
- `low / patch` — Blind Hunter found missing timing and duplicate-completion assertions; the rejection test now checks returned duration and exactly one before/after event pair.
- `medium / patch` — Edge Case Hunter found that state becoming locked during resource loading skipped `before_show_move`; that branch now uses shared fallback and emits both tile movement events.
- `medium / patch` — Verification Gap Reviewer confirmed the resolved-invalid branch was untested; the added test verifies final position, movement state, and event order.
