---
title: 'Story 16: Fly and phase follow the movement distance stat'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: 'ffff2dbf'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** In Practice/Sandbox v2 a Flying unit showed and used a movement distance of base speed plus a "move anywhere" grant (16), ignoring the movement distance stat.

**Approach:** In version 2, fly and phase only decide what a unit may cross; every unit moves its movement distance stat. Show the stat everywhere, and leave the movement and attack type keyword text out of the version 2 unit face because the stat icons replace it. Legacy and version 1 keep the old Flying grant.

</frozen-after-approval>

## Implementation Notes

- `ModifierFlying` nulls its speed grant when constructed in a version 2 session (`ModifierBandedFlying` inherits it); `ModifierPhasing`, which only exists in version 2, no longer carries a speed grant. The existing hex movement search is distance limited, so flyers now reach the stat distance and cross holes and Walls within it.
- `Entity.getMovementDistance` returns speed minus any Flying grant, so legacy-session views such as the collection show the stat instead of 16; gameplay still uses `getSpeed`.
- `statKeywordText.removeStatKeywordText` drops keyword-only lines for Flying, Phasing, Ranged, and Blast from the version 2 unit face description, and the face's keyword tooltip list omits them. The Phasing keyword text was reworded to match.
- Tests: `phase_keyword.js` (distance limits in version 2, unlimited Flying in version 1 and legacy, terrain crossing) and `stat_keyword_text.js`.
