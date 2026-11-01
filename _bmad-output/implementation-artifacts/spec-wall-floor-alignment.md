---
title: 'Align walls and floor cells through their native rendering paths'
type: 'bugfix'
created: '2026-11-02'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent">

## Intent

Correct horizontal and vertical wall alignment in the version 2 Practice map. Walls must use the same standing sprite ground anchor as units, while Methron markers must align with floor hexes. Apply perspective exactly once to each rendered object and verify the browser result.

</frozen-after-approval>

## Implementation Notes

- No intent gaps or irreversible changes. Reuse UnitNode sprite initialization for v2 Walls.
- GameLayer routes standing walls to middleground; Methron remains in the floor layer.
- UtilsHexView draws unprojected geometry; BattleMap positions floor cells in board screen space because TileLayer projects them.
- Removed copied incomplete wall offset logic and duplicate floor projection.
- Independent diagnosis confirmed both missing unit centerOffset (vertical) and double floor projection (horizontal and vertical).
- Verification: gulp js succeeded; generated bundle contains native unit initialization and single floor projection. Browser new Practice match visually confirms left/center/right Wall ground contacts and Methron centers align. Existing hex_view suite: 10 passing with 60s SDK loading allowance. ESLint flagged existing BattleMap formatting and one new indentation issue, which was corrected.

## Review Triage Log

- Low, patched: sharing UnitNode initialization creates a shadow; TileNode placeholder/spawn handling must also share UnitNode shadow visibility. Added delegation for those states.
