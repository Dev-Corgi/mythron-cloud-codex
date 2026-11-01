---
title: 'Capture and retain Methron Points'
type: 'feature'
created: '2026-11-01'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
story_key: '2-8-capture-and-retain-methron-points'
baseline_commit: 'c1cacd358461040e0ec12177650ab10309d9da44'
outer_baseline_commit: '0a96d0c0e50a24b7e176c52eaa80e9e3cc81d380'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/map-layout.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-7-apply-wall-obstruction-consistently-to-attacks-and-area-effects.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The version 2 replacement battlefield has no persistent Methron Point control, so players cannot capture, retain, or recapture its five objectives.

**Approach:** Add five neutral, non-consuming point tiles at the documented row/column positions. After turn-end effects finish, each surviving unit on a point captures it for its player; preserve ownership while empty and render the controller through the existing tile owner treatment.

## Boundaries & Constraints

**Always:** Enable points only for `practice-sandbox-hex` version 2. Convert documented `(row,column)` positions through `HexTopology`; retain `{q,r}` state coordinates. Use `tile_mana_idle` without mana, depletion, or consumption behavior. Track neutral/player1/player2 control separately from occupancy, allow a living Unit or General to capture at either player's turn end after queued end-turn effects resolve, retain control when empty, and transfer it to an opposing occupant. Persist setup and control changes through the existing snapshot and replay paths. Keep version 1 and other modes unchanged.

**Never:** Add capture damage, control-count scoring, a Heart entity, a new victory condition, a datastore/schema migration, or changes to mana and unrelated turn effects; control-count deficit damage belongs to Story 2.9.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Setup | New v2 match | Five neutral points at rows/columns (0,3), (0,5), (2,4), (4,3), (4,5), with `tile_mana_idle`; no mana or depleted uses | Invalid/hole positions are not introduced |
| Capture | Either player's turn ends; a player Unit or General survives on a point after end-turn actions | Point owner becomes that unit's player; other points are evaluated independently | A unit killed before capture does not capture |
| Retain or transfer | Controlled point is empty, or a surviving opponent occupies it at a later turn end | Empty ownership persists; opponent capture transfers ownership; neutral remains distinct | Do not clear ownership on departure |
| Persistence and visuals | Neutral, owned, and empty-owned points are rendered, snapshotted, restored, or replayed | Neutral/player1/player2 remain distinguishable and ownership replays deterministically | No separate Heart or state store |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/rulesets/hexTopology.coffee` -- canonical v2 row/column conversion and map positions; add the five placement coordinates here and keep axial state canonical.
- `duelyst/app/sdk/gameSetup.coffee` -- places v2 Walls and captures board cards into setup data; seed point tiles in the v2-only setup path so restore/replay reuse normal board-card reconstruction.
- `duelyst/app/sdk/cards/cardsLookup.coffee`, `cards/factory/misc/tiles.coffee`, `cards/cardFactory.coffee`, and `entities/tile.coffee` -- add a hidden point tile with the existing `tile_mana_idle` animation and no bonus-mana modifier or depletion behavior.
- `duelyst/app/sdk/gameSession.coffee` and `actions/` -- end-turn actions drain queued effects and run end-turn-duration changes before the turn advances. Add deterministic capture actions at the queue-empty boundary after those effects; re-check the live occupant when each action executes.
- `duelyst/app/sdk/actions/actionFactory.coffee` and `app/sdk/index.coffee` -- register/export capture actions for serialized actions and replay reconstruction.
- `duelyst/app/view/layers/game/GameLayer.js`, `view/nodes/cards/EntityNode.js`, and `TileNode.js` -- refresh point owner visuals after capture; reuse `TileNode` owner tint and existing player colors.
- `duelyst/test/unit/sdk/game/game_setup.js`, `board.js`, and `duelyst/test/integration/misc/utils_game_session.js` -- verify exact v2-only setup, no mana/depletion, turn-end capture/death/transfer/retention, and snapshot/replay ownership.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/rulesets/hexTopology.coffee` and `gameSetup.coffee` -- define and place five v2 points using row/column conversion; preserve all other map versions.
- [x] `duelyst/app/sdk/cards/cardsLookup.coffee` and `cards/factory/misc/tiles.coffee` -- register a neutral, non-targetable, non-consuming Methron tile using `tile_mana_idle` without mana modifiers.
- [x] `duelyst/app/sdk/gameSession.coffee` and `app/sdk/actions/` -- capture points after turn-end effects resolve, re-check live occupancy, and serialize control changes as deterministic actions.
- [x] `duelyst/app/view/nodes/cards/EntityNode.js` and `TileNode.js` -- visibly distinguish neutral and both player-owned points using existing owner colors.
- [x] SDK and integration tests -- cover setup, both turn owners, General capture, death-before-capture, empty retention, transfer, no mana/depletion, and snapshot/replay.

**Acceptance Criteria:**
- Given a new v2 match, when setup completes, then the five specified points exist as neutral non-consuming tiles using `tile_mana_idle`, and no points appear in version 1 or other modes.
- Given a point and a surviving player Unit or General on it, when either player's end-turn effects have resolved, then the point belongs to that unit's player; a unit killed before capture does not capture.
- Given a controlled point, when it becomes empty or an opposing Unit later survives on it through turn-end effects, then its prior owner persists while empty and transfers only on the opposing capture.
- Given neutral, player1-owned, or player2-owned points, when viewed, serialized, restored, or replayed, then the three states remain distinguishable and deterministic without mana, consumption, or a separate Heart entity.

## Implementation Notes

Planning facts: the intent and coordinate convention are settled by the epic and map layout; no irreversible data or external operation is required; footprint is cross-layer (map data/setup, tile factory, action ordering, visuals, and tests). Point control uses the inherited tile `ownerId` as the persisted controller and `CaptureMethronPointAction` revalidates occupancy at execution so queued turn-end deaths or movement cannot capture stale occupants.

## Spec Change Log

## Review Triage Log

| Finding | Verdict and evidence |
|---------|----------------------|
| Blind Hunter: an automatic capture action could be submitted outside turn end | **high** — `ValidatorExecuteExplicitAction` bypasses automatic actions. Added one-shot authorization populated only for capture actions created while processing the v2 end-turn boundary; an automatic out-of-phase action test confirms no ownership change. Patched. |
| Blind Hunter: an off-board Methron tile could be mutated | **false** — `gameSession` authorizes only point objects enumerated from active board tiles; a detached target never receives the required one-shot authorization. |
| Blind Hunter: end-turn queued movement or death was not tested | **medium** — the new integration case queues a teleport from the end-turn event and verifies the point remains neutral after the occupant moves. Patched. |
| Blind Hunter: setup absence was not tested for other rulesets | **false** — setup is guarded by exact ruleset ID and version 2, and the existing version 1 setup assertion covers the adjacent version boundary. |
| Blind Hunter: neutral, player 1, and player 2 visuals lack direct assertions | **false** — `TileNode` returns neutral gray, player tile white, and opponent tile red; capture completion refreshes owner sprites. The described indistinguishable visual outcome does not occur in the traced code. |
| Blind Hunter: player 2 ownership transfer is not replayed | **false** — the same serialized capture action sets ownership from the live occupant's owner ID for either player; integration coverage exercises player 1 action replay and player 2 transfer. There is no player-specific replay branch. |
| Verification Gap: no test covered queued occupant changes before capture | **medium** — the added end-turn movement integration case demonstrates that queued end-turn effects resolve before the live occupancy check, and asserts no stale capture occurs. Patched. |
| Blind Hunter: no unrelated ruleset/version 2 setup assertion or player mana assertion | **medium** — acceptance requires v2-only setup and no mana changes; current setup test only checks the same ruleset's version 1 and tile fields. Added focused absence and mana assertions. Patched. |
| Blind Hunter: regular Unit capture is not tested | **medium** — acceptance names both Units and Generals; existing capture setup uses only General instances. Added a regular Unit end-turn capture assertion. Patched. |
| Blind Hunter: replay test manually executes a capture action rather than replaying end turn | **medium** — manual authorization bypasses the turn-end dispatcher; added replay setup that runs the end-turn capture flow and checks identical ownership. Patched. |
| Blind Hunter: death-before-capture is only simulated by directly marking a General removed | **medium** — this did not exercise a queued end-turn death; added a regular Unit killed by an end-turn effect before capture. Patched. |
| Blind Hunter: queued movement test does not capture a new surviving occupant | **medium** — the existing case only verifies the original occupant moved away; added queued opponent movement onto the point and verified transfer after effects resolve. Patched. |
| Blind Hunter: setup test does not assert mana is unchanged | **low** — point setup has no mana modifier or mana action, and the tile test already asserts no inherent modifiers; added direct player mana assertions for the setup contract. Patched. |
| Verification Gap: owner colors and live tile refresh have no view-level test | **medium** — existing tests assert SDK ownership only; added a view-level test for neutral/player colors and capture-triggered sprite refresh. Patched. |
| Blind Hunter: sprint status remains in-progress while the spec says in-review | **false** — the prescribed Step 5 synchronization changes sprint status to `review` after review completes; the intermediate in-progress state is expected. |
| Blind Hunter: submodule pointer shows a dirty marker before a pointer commit | **false** — the nested repository is intentionally dirty until its required first commit; committing it first updates the outer pointer as requested. |
| Blind Hunter: Code Map names unchanged files | **false** — unchanged files are included as surrounding implementation context; the review workflow rejects findings whose fix is editing this build's spec, and no runtime harm was identified. |
| Blind Hunter: Verification section lacks exact commands/results | **false** — this asks to edit the build spec, which the review workflow explicitly rejects; the execution results are recorded in the completion summary. |
| Blind Hunter: no unsupported legacy-v2 setup assertion | **false** — `legacy` is the only other supported ruleset and its supported version is v1; the setup test checks that path and v2 hex setup. |
| Blind Hunter: simultaneous occupied points are not tested | **medium** — implementation iterates point tiles, but existing end-turn tests occupy only one point per session; added one end-turn test with two occupied points and independent ownership assertions. Patched. |
| Blind Hunter: capture action tests bypass validators | **medium** — direct fixture tests disable validators; added out-of-phase forged automatic action coverage through `submitExplicitAction` with normal validators enabled. Patched. |
| Verification Gap: capture action factory round-trip is not tested | **medium** — end-turn replay reconstructs a fresh action and would not catch a broken explicit action factory mapping; added serialization/deserialization type, target, and ownership assertions. Patched. |
| Blind Hunter: capture authorization is not covered by replay playback | **false** — the end-turn replay test rebuilds the initial snapshot, runs EndTurnAction, and verifies capture; that exercises authorization creation and consumption in the replayed flow. |
| Blind Hunter: a regular Unit is not shown surviving end-turn effects | **false** — the regular Unit capture test runs a real end-turn flow and asserts ownership; the separate killed-Unit test confirms the opposing boundary. |
| Blind Hunter: General occupancy is not verified | **false** — the end-turn test captures a General for both players; the query flags are exercised by that scenario. |
| Blind Hunter: setup mana assertion uses withoutMana=true | **medium** — the setup contract should be checked using the ordinary setup call; changed the test to use its default mana setup path. Patched. |
| Blind Hunter: regular Unit transfer is not tested | **medium** — current transfer coverage uses a General while regular Unit coverage only captures from neutral; added an end-turn transfer by a regular Unit. Patched. |
| Blind Hunter: submodule pointer remains dirty before commit | **false** — the instructed commit order requires committing the nested repository first; the dirty marker is expected until that commit updates the outer pointer. |
| Blind Hunter: sprint status is still in-progress during final review | **false** — Step 5 synchronizes the tracker to review after review completes; the intermediate status is expected until that step. |
| Blind Hunter: Verification section lacks commands and actual results | **false** — the prescribed review rules reject findings whose fix edits this build's spec; the assertion describes documentation only and no runtime defect. |
| Blind Hunter: nested implementation is not in a committed submodule revision | **false** — the required nested-first commit has not yet run; the `-dirty` marker is expected before that authorized commit sequence. |
| Blind Hunter: tracker remains in-progress during review | **false** — Step 5 updates it to `review` after this final review, so the intermediate status is expected. |
| Blind Hunter: spec verification section lacks observed commands and results | **false** — this requests a change to the build spec, explicitly rejected by the review triage rules; no runtime defect is identified. |
| Blind Hunter: replayed explicit action does not change owner in its final assertion | **medium** — the action factory assertion currently replays a same-owner capture; changed it to replay a transfer from player 1 to player 2 and assert the new owner. Patched. |
| Blind Hunter: valid end-turn capture is only tested with validators disabled | **medium** — existing valid-capture tests bypass validators; added a normal `submitExplicitAction` end-turn capture case with validators enabled. Patched. |
| Blind Hunter: two-point end-turn flow uses one owner for both units | **medium** — it does not establish per-occupant ownership assignment; changed the second occupant to player 2 and assert separate owners. Patched. |
| Blind Hunter: no supported non-hex v2 setup test | **false** — `legacy` has no supported v2 ruleset; the tested supported boundary is legacy v1 versus hex v2. |
| Blind Hunter: queued transfer starts from a neutral point | **medium** — the existing queued opponent arrival does not demonstrate transfer after the point is already controlled; added a queued player 2 arrival over player 1 control. Patched. |
| Verification Gap: Methron owner-indicator suppression is untested | **medium** — the tint and refresh tests do not call `getCanShowOwnerSprites`; added assertions that neutral and both player-owned points suppress the generic owner indicator. Patched. |
| Verification Gap: Methron runtime eligibility restrictions are untested | **medium** — setup covers only neutral actionless placement; extended the existing CardEligibility runtime test to reject owned and source-action Methron Points and to reject them outside hex v2. Patched. |
| Blind Hunter: nested changes are absent from outer diff while the pointer is dirty | **false** — nested-first commit order is required; the dirty marker is expected and the inner commit will make the outer pointer reproducible. |
| Blind Hunter: sprint tracker remains in-progress until Step 5 | **false** — synchronization to `review` is prescribed after review, so this is an expected intermediate state. |
| Blind Hunter: verification evidence should be added to the spec | **false** — review triage rejects findings whose fix edits this build's spec; no product behavior defect is stated. |
| Blind Hunter: end-turn duration occupancy changes lack coverage | **false** — the end-turn expiration test applies `ModifierDestroyAtEndOfTurn` to a regular Unit, verifies it is removed, and verifies the point remains neutral. |
| Blind Hunter: capture action ruleset/version guards lack direct coverage | **medium** — capture behavior is tested in hex v2, but no direct action test exercised legacy or hex v1 guards; added those action rejection cases. Patched. |
| Blind Hunter: capture authorization reuse is not tested | **medium** — current security coverage tests absent authorization but not one-shot consumption; added a repeated-consumption assertion. Patched. |
| Blind Hunter: ending-player/current-turn ordering is not asserted | **medium** — capture results are verified but current-player timing is not observed; added an assertion from the capture event that it runs before turn advancement. Patched. |
| Blind Hunter: view refresh is not tied to resulting owner appearance | **medium** — tint values and refresh calls are tested separately; added a combined assertion that capture changes the computed tint and refreshes the node. Patched. |
| Blind Hunter (carried): outer diff cannot reproduce the dirty nested implementation | **false** — this is the required pre-commit state; the workflow and user instruction require the nested repository commit first, after which the outer commit records its pointer. |
| Blind Hunter: direct authorization in action tests bypasses the turn-end authorization path | **false** — those cases isolate action rejection/replay mechanics; the integration suite also exercises ordinary end-turn capture with validators enabled and verifies ownership. |
| Blind Hunter: an end-turn test declares an unused `executeWithoutValidation` helper | **false** — the helper is used for the player's later end turn in `test/integration/misc/utils_game_session.js`. |
| Blind Hunter (carried): setup does not verify point setup leaves mana unchanged | **false** — the standard setup test checks both players' resulting mana against the expected preexisting setup values, alongside the no-modifier point state. |
| Blind Hunter: view refresh test does not exercise a real capture action | **false** — integration coverage verifies the action changes point ownership; the view test invokes the same after-show handler that `TileNode` subscribes to, and `GameLayer` emits that event for shown actions. |
| Blind Hunter: replay assertion only tests a manually-authorized serialized action | **false** — the same integration test reconstructs the initial snapshot, runs the end-turn action, and verifies the replayed point owner. |
| Blind Hunter: validator-disabled end-turn tests leave queued occupant changes unverified in normal flow | **false** — the normal validator-enabled end-turn test covers successful capture; the queued-effect tests directly exercise queue resolution and live-occupant rechecking, which validator state does not change. |
| Verification Gap: restoring a point while empty may lose its retained owner | **medium** — the original snapshot assertion serialized an occupied point; added a round trip after the occupant leaves and asserted null occupancy with player 1 ownership retained. Patched. |
| Verification Gap: neutral point initialization tint path was not exercised | **medium** — the earlier test stubbed `updateSpritesForOwner`; replaced it with a narrow real `EntityNode`/`TileNode` path and asserted the neutral point receives gray at initialization. Patched. |

## Design Notes

The map contract lists `(row,column)`, while runtime stores axial `{q,r}`. Convert each placement with `HexTopology.renderedToAxial(column, row)`; do not copy the row/column pair into runtime state.

## Verification

**Commands:**
- Focused game setup, board, turn-end capture, and snapshot/replay tests -- expected: all pass.
- Changed CoffeeScript lint/compilation, JavaScript lint, and `git diff --check` in both repositories -- expected: clean.
