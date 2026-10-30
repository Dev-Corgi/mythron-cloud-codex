---
title: 'Keep each match''s rules consistent'
type: 'feature'
created: '2026-10-30'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '2843f2400854136598631288c2e8dfb8f5173de7'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** New Practice and Sandbox rules must be tied to the match that uses them. Inferring rules from a broad game type or accepting client metadata could cause different setup, saved state, and replay behavior.

**Approach:** Give each session a stable ruleset ID and version, select them from trusted entry paths before setup, and persist and validate them when restoring a snapshot or replay. Historical snapshots without ruleset metadata remain legacy.

## Boundaries & Constraints

**Always:** The validated server Practice entry selects `practice-sandbox-hex` version `1`; the concrete local Sandbox entry selects the same pair. The selection is server/class derived and cannot be overridden by client input. Developer Sandbox and every other mode use `legacy`. Resolve ruleset identity before board/deck setup or replay actions; reject unknown IDs and versions. Missing metadata means `legacy`.

**Never:** Infer the ruleset from `GameType.Sandbox` alone, change legacy gameplay or snapshot compatibility, or expose the new ruleset through unvalidated entry paths.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid Practice | Validated server Practice request; client may include arbitrary ruleset fields | Session is initialized with `practice-sandbox-hex` version `1` before setup; client fields have no effect | N/A |
| Concrete local Sandbox | Local `Sandbox` challenge | Session uses `practice-sandbox-hex` version `1` before setup | N/A |
| Other entry | Developer Sandbox or any other game mode | Session uses `legacy` | N/A |
| Known snapshot/replay | Supported ruleset ID and version | Identity is restored before state reconstruction and actions | N/A |
| Unknown snapshot/replay | Unknown ID or unsupported version | Reject restoration before board/deck reconstruction or action execution | Clear validation error |
| Historical snapshot | No ruleset ID/version | Resolve as `legacy`; preserve existing square-board behavior | N/A |

</frozen-after-approval>

## Code Map

- `server/routes/api/me/games.coffee` -- Validates and dispatches Practice; its server call uses `GameType.SinglePlayer`.
- `server/lib/create_single_player_game.coffee` -- Creates the authoritative session and invokes setup; select the server-owned Practice ruleset here before setup.
- `app/sdk/challenges/sandbox.coffee` -- Concrete local Sandbox setup-mode hook runs before shared setup; select the new ruleset here.
- `app/sdk/challenges/sandboxDeveloper.coffee` -- Developer Sandbox subclasses Sandbox and must retain legacy rules.
- `app/sdk/gameSession.coffee` -- Persistent session properties, snapshot serialization, and Firebase deserialization; restore/validate ruleset immediately after session data is copied and before rebuilding state.
- `app/sdk/gameSetup.coffee` -- Shared initial setup and replay reconstruction using `gameSetupData`; preserve the resolved session identity through both.
- `test/unit/sdk/game/game_setup.js`, `test/integration/misc/utils_game_session.js` -- Existing setup and snapshot test locations to extend for routing, roundtrip, legacy default, and rejection behavior.

## Tasks & Acceptance

**Execution:**
- [x] Add a versioned ruleset registry/default and session accessors; initialize legacy sessions and serialize the selected ID/version.
- [x] Select the new ruleset only in validated server Practice creation and concrete local Sandbox setup, before `GameSetup`; keep Developer Sandbox and all other modes legacy.
- [x] Resolve missing metadata to legacy and reject unknown ID/version before snapshot reconstruction; ensure replay setup retains the selected ruleset.
- [x] Add focused tests for entry selection, client override resistance, supported and unsupported snapshot metadata, and historical legacy snapshots.
- [x] Update the Epic 1 sprint status for this story as implementation progresses.

**Acceptance Criteria:**
- Given a validated Practice entry, when the server creates its match, then it has `practice-sandbox-hex` version `1` before board/deck setup regardless of client-supplied ruleset fields.
- Given the concrete local Sandbox entry, when it creates a match, then it selects that ruleset before setup; Developer Sandbox and other modes select `legacy`.
- Given a snapshot or replay with a known ruleset ID and version, when restored, then the ruleset is resolved before actions run.
- Given an unknown ID or version, when restored, then restoration is rejected before actions run.
- Given a historical snapshot without ruleset metadata, when restored, then it uses `legacy` and preserves existing square-board behavior.

## Implementation Notes

- Added `Rulesets` registry entries for `legacy` v1 and `practice-sandbox-hex` v1; server entry selection maps only `GameType.SinglePlayer` (the validated Practice route) to the new ruleset. Local `Sandbox` opts in before setup, and `SandboxDeveloper` restores legacy.
- Session snapshots persist `rulesetId` and `rulesetVersion`. Deserialization validates before copying or rebuilding session state; replay setup resolves metadata before restoring players, decks, and board.
- Verification: 37 focused tests passed, including the server Practice creation test, which checks the saved session snapshot. All changed CoffeeScript files compile; `git diff --check` passed. The repository's standard Mocha preload fails under the installed Node runtime (`require-dir` receives undefined `filename`), so tests ran through the direct Mocha entry point with `--no-config` and `--exit`.

## Spec Change Log

## Review Triage Log

- medium — The original selector-only test did not catch removal of the server creator's session assignment; patched by adding a test that invokes Practice creation and inspects the saved snapshot.
- medium — The saved Practice/BossBattle ruleset mapping was not verified at the session boundary; patched by testing the actual Practice creation path plus serialized ruleset assignments for both game types.
- low — An ignored extra argument made the selector test imply it modeled a client request; removed the argument and kept the assertion focused on the selector contract.
- false — The `SinglePlayer` mapping does not affect other single-player modes: the only `createSinglePlayerGame` call supplying `GameType.SinglePlayer` is the validated `/single_player` Practice route; Boss Battle passes its own type, while matchmaker calls use their queued network type.
- false — Unsupported replay rules are not left unresolved: the replay load chain catches setup/deserialization errors, stops the replay, and routes the message through `App._error`; the SDK test also verifies rejection before reconstruction.

## Verification

**Commands:**
- `node_modules/.bin/mocha --no-config --require coffeescript/register --timeout 10000 --exit --grep "game setup|UtilsGameSession" test/unit/sdk/game/game_setup.js test/integration/misc/utils_game_session.js` -- expected: focused setup and snapshot tests pass.
- Compile each changed CoffeeScript source with `coffeescript.compile` -- expected: all changed CoffeeScript files compile.
- `git diff --check` -- expected: no whitespace errors.

