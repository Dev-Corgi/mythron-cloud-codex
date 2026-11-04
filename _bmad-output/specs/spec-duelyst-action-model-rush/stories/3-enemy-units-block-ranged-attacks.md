---
title: 'Story 3: Enemy units block ranged attacks'
type: 'feature'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/specs/spec-duelyst-action-model-rush/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/map-layout.md'
---

## Intent

**Problem:** A ranged attacker can currently hit a target behind an enemy unit, because units do not obstruct the ranged line; only Walls do.

**Approach:** In Practice/Sandbox v2, make every enemy unit between attacker and target obstruct a ranged attack exactly like a Wall, inside the one shared geometry resolver. Independent of stories 1 and 2. Implementation only; this spec run changed no code.

## Boundaries & Constraints

**Always:** Ranged attack type only. "Enemy" is relative to the attacker; Generals count. Use the same line tests as a Wall: the segment passes through the center of the obstructor's tile strictly between the ends, or crosses the center-to-center link of two hex-adjacent obstructors (a Wall and an enemy unit that are hex-adjacent form such a link). An enemy on the target tile never blocks its own tile; the Wall beneath the target stays excluded; allied units never block. Targeting, previews, AI evaluation and replay all use the one resolver.

**Never:** Change lobbed or area obstruction; add a second obstruction implementation; make allies block.

## Code Map (starting points; verify against the repo)

- `duelyst/app/sdk/rulesets/hexAttackGeometry.coffee` -- `_getBlockingWalls`, `isRangedSegmentBlockedByWall`, `canDeliver`; the single owner of ranged obstruction (parent spine AD-8). `getBeholdVictims` and the Behold target selection call the same Wall check. Add the enemy-unit check as a separate, ranged-attack-only path (or parameter) so Behold keeps its current Wall-only behavior; its beam must keep piercing enemy units.
- `duelyst/app/sdk/entities/attackRange.coffee` -- target resolution and the occupant-priority rule on Walls.
- `duelyst/server/ai` and view targeting/preview code -- must call the resolver, not re-derive.
- `duelyst/test/unit/sdk/game/hex_attack_geometry.js` -- existing geometry tests.

## Acceptance Criteria

- Given a ranged attacker, an enemy unit directly between it and a second enemy, then the second enemy is not a legal target and the first is.
- Given an allied unit between the attacker and an enemy, then the enemy remains targetable.
- Given an enemy unit on the target tile, then it is not blocked by itself.
- Given two hex-adjacent obstructors (unit and unit, unit and Wall) whose center link the attack line crosses, then the target is blocked; given only a corner or edge clip, then it is not.
- Given a General standing in the line, then it blocks like any other enemy unit.
- Given a Wall beneath the target unit, then it still does not shield the target.
- Given a lobbed or area attack across an enemy unit, then behavior is unchanged.
- Given Behold, then its target selection and beam behave exactly as before: it still hits the targeted enemy and the enemy units behind it, stopping only at a Wall.
- Given the shared resolver is changed, then targeting, preview highlight, AI target lists and replay agree on the same legal targets.
- Given tests, then they cover each case above in `hex_attack_geometry.js`.

## Assumptions

- Behold is unaffected by this story (it pierces enemies by design and is an active ability, not a ranged attack). Confirmed by the user.
