---
title: 'Restore complete graphics resource packages'
type: 'bugfix'
created: '2026-11-02'
status: 'in-progress'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent">

## Intent

Restore missing card frames and other graphics by ensuring resource generation waits for every source directory before generating package manifests. Verify the frame in the running game after rebuilding.

</frozen-after-approval>

## Implementation Notes

- Generated ignored packages.js lacked the shared card package despite valid source textures and CardNode pragma.
- scripts/helpers.js resolved its walk when the final array entry's stat callback completed, even when earlier entries were still pending.
- Replaced callback index completion with Promise.map awaiting all stats and recursive reads; errors now reject the caller.
- No intent gaps or irreversible actions. Footprint: helper and generated asset manifest/client bundle.
- Controlled out-of-order callback check passes; read errors reject instead of escaping asynchronous callbacks.
- Regenerated manifest restores 24 missing packages, including card, tooltip, instruction, speech and reward graphics. Card package contains 32 resources including all six neutral/prismatic frames.
- Added resource_file_walk.js regression coverage: delayed earlier directory and read error propagation; both pass.

## Review Triage Log

- Medium, patched: the directory reader wrapper swallowed traversal rejection; forwarded rejection so generation cannot remain pending on a failed directory.
- Deferred: existing Windows factory exclusion uses forward slash only; this can scan additional SDK factory resources. It does not cause the missing shared UI packages fixed here.
