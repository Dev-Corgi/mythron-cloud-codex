---
title: 'Preserve each saved match''s battlefield and rules'
type: 'feature'
created: '2026-11-01'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Registering the replacement battlefield must not change the map or rules used by already saved matches and replays.

**Approach:** Keep `practice-sandbox-hex` version 1 as the current Practice/Sandbox entry identity and register version 2 as a supported, distinct rules package. Resolve each saved identity before reconstruction, retain the legacy fallback for historical snapshots without metadata, and reject unsupported identities or versions.

</frozen-after-approval>

## Implementation Notes

- The current lookup registers `legacy:1` and `practice-sandbox-hex:1`; server Practice entry and concrete local Sandbox both select version 1. Preserve those selections until later stories complete and authorize rollout.
- `GameSession.deserializeSessionFromFirebase` and `GameSetup.setupNewSessionFromExistingSessionData` call `setRuleset` before restoring session state or board cards. Missing metadata defaults to `legacy:1`; unsupported pairs already throw before reconstruction.
- Add `practice-sandbox-hex:2` to the central registry as a separately versioned identity without a separate map-version field. Do not add replacement-map construction or change ruleset-ID dispatch / gameplay behavior in this story.
- Extend focused persistence and setup tests to cover version 2 round-trip, version 1 compatibility and unchanged Practice/Sandbox entry selection, legacy fallback and unaffected Developer Sandbox behavior, and unknown identity/version rejection.
- No data migration, deletion, deployment, or external side effect is required. Changes are confined to `app/sdk/rulesets/rulesetsLookup.coffee` and focused SDK persistence/setup tests.


- Implementation decision: the registry accepts version 2 for persistence/reconstruction, but no Practice or Sandbox entry emits it yet. Until the replacement package is integrated, the existing id-based gameplay branches remain unchanged; version-aware map behavior must be added before any version 2 rollout.
- Persistence checks exercise fields and positions that exist in these match families. Wall, point-ownership, and turn-end state checks belong to the later stories that introduce those entities and effects.
- Changed `app/sdk/rulesets/rulesetsLookup.coffee`, `test/integration/misc/utils_game_session.js`, and `test/unit/sdk/game/game_setup.js`. Focused SDK persistence/setup run: 48 passing.

## Review Triage Log

- `patch` — Version 2's Firebase-restored board positions were not asserted; added player 1 and player 2 position assertions for both snapshot restore and replay.
- `false` — The review said concrete local Sandbox selection was untested. `test/unit/sdk/game/game_setup.js` already asserts `Sandbox.setupSessionModes` selects `practice-sandbox-hex` version 1, and Developer Sandbox stays `legacy:1`.
- `false` — Version 2 currently shares id-based gameplay branches, as intentionally recorded in the spec. No Practice/Sandbox entry emits version 2 before later stories add version-aware map behavior and complete the package.
- `false` — The story does not introduce Walls, points, or turn-end effects; their deterministic state coverage belongs to the stories that implement those states. This change verifies current map positions and ruleset identity round-trip.

