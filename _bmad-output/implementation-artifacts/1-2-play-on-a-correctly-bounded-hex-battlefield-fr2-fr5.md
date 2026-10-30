---
title: 'Play on a correctly bounded hex battlefield'
type: 'feature'
created: '2026-10-30'
status: 'done'
route: 'dispatch'
baseline_commit: 'bd9e397353a94b359251ceaf4b85f4744a34cdb2'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Practice and Sandbox need a 45-cell staggered hex board whose stored positions and bounds follow the new rules, while existing modes continue using square coordinates.

**Approach:** Add shared ruleset-aware axial topology for conversion, six-neighbor geometry, distance, and board bounds. Use it to construct and address new-rules board cells and place its generals at the defined opposite center-edge cells; preserve legacy board state and behavior.

## Boundaries & Constraints

**Always:** `practice-sandbox-hex` positions use `{q,r}` and map to rendered `(c,k)` by `c=2q+r`, `k=floor(r/2)`. The board is `0<=c<=8`, `0<=k<=4`, with odd rendered columns staggered down. Inverse conversion is `r=2k+(c mod 2)`, `q=(c-r)/2`. Legal neighbors are exactly `(1,0)`, `(-1,0)`, `(0,1)`, `(0,-1)`, `(1,-1)`, `(-1,1)`. General starts are `(-2,4)` and `(2,4)`. Legacy sessions retain `{x,y}` square state.

**Never:** Change legacy coordinate semantics, mutate global square patterns to hex offsets, or include movement/targeting UI integration owned by later stories.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|-----------------------------|----------------|
| Board enumeration | New-rules session | Exactly 45 unique axial positions; rendered columns 0–8 and rows 0–4, odd columns stagger down | No invalid cells emitted |
| Coordinate round trip | Each rendered board cell | Render-to-axial and axial-to-rendered recover the same cell | Off-board or malformed positions are not legal |
| Topology | In-board axial position | Six declared deltas and hex distance; neighbors beyond the board are excluded by bounds | Invalid source position yields no legal neighbors |
| General setup | New-rules session | Generals at `(-2,4)` and `(2,4)` | N/A |
| Legacy setup | Legacy session | Existing `{x,y}` board and default general positions remain unchanged | N/A |

</frozen-after-approval>

## Code Map

- `app/sdk/rulesets/rulesetsLookup.coffee` and `app/sdk/gameSession.coffee` -- identify the resolved ruleset; dispatch topology without relying on game type.
- `app/sdk/board.coffee` -- `Board#getPositions`, `isOnBoard`, lookup and obstruction use; add ruleset-aware enumeration and legal-cell bounds while retaining legacy methods.
- `app/sdk/gameSession.coffee` -- board construction in initialization and deserialization; keep board dimensions and ruleset available before creation.
- `app/sdk/gameSetup.coffee` -- `setupNewSession` and `addGeneral` consume starting positions; provide axial starts only for the new ruleset and preserve legacy defaults.
- `app/common/utils/utils_position.js` -- existing `{x,y}` map/equality helpers; avoid changing their legacy meaning, add or use a dedicated topology module.
- `app/common/utils/utils_engine.js` -- display conversion boundary; leave presentation integration to Story 1.4.
- `test/unit/sdk/game/board.js`, `test/unit/sdk/game/game_setup.js` -- existing board and setup regression coverage; add topology and new-rules setup cases alongside legacy assertions.

## Tasks & Acceptance

**Execution:**
- [x] `app/sdk` topology and `app/sdk/board.coffee` -- implement axial/rendered conversion, six-neighbor deltas, hex distance, path and range primitives, 45-cell enumeration, and ruleset-aware bounds; preserve square behavior for legacy.
- [x] `app/sdk/gameSetup.coffee` and board creation call sites -- choose the specified axial general starts and axial board only for the resolved new ruleset.
- [x] `test/unit/sdk/game/board.js` and `test/unit/sdk/game/game_setup.js` -- cover all matrix cases, conversion round trips, edge bounds, and legacy regressions.
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- mark Story 1.2 in progress during implementation and review when complete.

**Acceptance Criteria:**
- Given a new-rules match, when its board is constructed, then it has exactly 45 pointy-top cells across nine rendered columns and five rows, with odd columns staggered down, and generals at `(-2,4)` and `(2,4)`.
- Given any rendered cell in columns 0–8 and rows 0–4, when converted both ways, then axial and rendered coordinates round-trip using the specified formulas.
- Given any new-rules position, when its neighbors or distance are computed, then only the six specified axial deltas are used and no off-board cell is legal.
- Given a legacy match, when its board and generals are constructed, then its square `{x,y}` state and existing geometry remain unchanged.

## Implementation Notes

Added ruleset-aware axial topology and board storage, including bounded enumeration, neighbor, distance, range, and shortest-path helpers. New-rules setup uses the required general cells and omits legacy mana tiles; legacy setup remains square. Review fixes updated coordinate accessors and shortest paths that skirt board edges. Movement/targeting consumers and rendering integration remain for later stories.

## Spec Change Log


## Review Triage Log

- medium — `blind_hunter`, `app/sdk/cards/card.coffee`: `getPositionX/Y()` returned undefined for axial cards; patched to return q/r under the new ruleset, with legacy behavior retained.
- medium — `verification_gap`, `app/sdk/cards/card.coffee`: the same accessor defect was confirmed through existing callers; patched as above.
- medium — `blind_hunter`, `app/sdk/board.coffee`: a straight line can leave the bounded board when a valid route exists; patched `getHexPath()` to use bounded-neighbor breadth-first search.
- false — `blind_hunter`, `app/sdk/entities/attackRange.coffee`: its legacy x/y attack atlas is not adapted in this topology story; attack-target integration belongs to the later movement/targeting story, while Story 1.2 provides topology primitives.
- false — `blind_hunter`, `app/sdk/gameSetup.coffee`: hex setup ignores custom general coordinates, but the story requires fixed starts `(-2,4)` and `(2,4)`; legacy setup still honors supplied positions.
- false — `blind_hunter`, `app/sdk/gameSetup.coffee`: new-rules starting board-card data uses q/r as required by the canonical SDK position contract; legacy x/y data remains supported.

## Design Notes

Keep canonical axial positions in the SDK and treat rendered columns/rows as an adapter. Board enumeration is the set of 45 rendered cells mapped through the inverse formula; bounds should validate both axial shape and membership in that rendered rectangle, not merely compare `q` or `r` independently.

## Verification

**Commands:**
- `node_modules/.bin/mocha --no-config --require coffeescript/register --timeout 10000 --exit test/unit/sdk/game/board.js test/unit/sdk/game/game_setup.js` -- expected: topology/setup assertions and legacy board regression tests pass.
- Compile each changed CoffeeScript source with `coffeescript.compile` -- expected: all changed CoffeeScript files compile.
- `git diff --check` -- expected: no whitespace errors.





