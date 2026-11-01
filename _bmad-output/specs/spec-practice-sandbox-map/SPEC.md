---
id: SPEC-practice-sandbox-map
companions:
  - map-layout.md
  - ../spec-duelyst-rules-overhaul/SPEC.md
  - ../spec-duelyst-rules-overhaul/rules-detail.md
  - ../spec-duelyst-rules-overhaul/practice-bot-deck.md
  - ../../planning-artifacts/architecture/architecture-duelyst-2026-10-30/ARCHITECTURE-SPINE.md
sources: []
---

# Practice and Sandbox Battlefield Replacement

## Why

Give Practice and Sandbox the supplied battlefield with missing tiles, neutral destructible Walls, Methron Points, and opposite-corner player starts while retaining the other core rules already specified for these modes.

## Capabilities

- **CAP-1**
  - **intent:** Players use the supplied irregular hex battlefield in both Practice and Sandbox.
  - **success:** Row lengths are 9, 8, 9, 8, 9, with odd rows shifted half a tile right and pointy-top hexes. Of 43 layout positions, two holes have no tile, leaving 41 rendered tiles. Placement and six-neighbor adjacency match `map-layout.md`.
- **CAP-2**
  - **intent:** Players begin at the specified opposing corners without keyhole objectives.
  - **success:** Player1 starts at row-column (4,0), player2 at (0,8); (0,0) and (4,8) behave and render as ordinary hex tiles.
- **CAP-3**
  - **intent:** Players capture and retain five Methron Points to damage the opposing General through a control advantage.
  - **success:** The five X positions display `tile_mana_idle` and follow the capture and ownership rules in `map-layout.md`. At either player's turn end, the General of the player controlling fewer points takes 2 damage per point of deficit; 3 versus 1 deals 4 damage, and equal counts deal none. Generals capture points under the same rules as other units and receive no damage merely for standing on a point.
- **CAP-4**
  - **intent:** Both players can attack neutral Walls that obstruct movement.
  - **success:** Each of the nine B positions starts with a neutral 10-health Wall using Bonechill Barrier visuals. Both players can select and damage it through otherwise legal attacks. Ordinary units cannot cross or stop on Walls; flying and phasing units can cross and stop on both Walls and holes. Walls block intervening ranged attacks and area effects, but a Wall beneath the target unit does not block melee, ranged, or area effects against that unit, subject to other blockers and range. Destroying it leaves an ordinary tile available for movement and otherwise legal summoning.

## Constraints

- Apply this map only to Practice and Sandbox; other modes retain their existing maps and rules.
- `map-layout.md` is authoritative for exact positions. Do not alter it to enforce symmetry.
- This spec supersedes the adopted core rules and architecture for board footprint, row staggering, map-specific neighbor/layout calculations, starting positions, and the ranged/area-effect geometry explicitly defined below. The former 45-tile, column-staggered board and center-edge starts do not apply to this map. Other core rules remain in force.
- Preserve the existing coordinate system and coordinate data formats; do not introduce a coordinate-system replacement or coordinate migration for this feature. User-facing map positions remain zero-based (row,column). Update map placement, row staggering, six-neighbor relationships, and start positions within that system, consistently across rendering, movement, range, adjacency, targeting, and summoning. Map-specific geometry calculations must match the new layout; coordinate-system choice is not an open decision.
- A hole has no rendered hex tile, but remains an addressable position for flying and phasing units to cross or occupy. These units may also cross or occupy a Wall position; ordinary units may not cross or occupy either. Apply existing summoning rules separately from these movement permissions.
- A Wall and a flying or phasing unit may share a position as separate entities; direct attacks follow the occupant-priority rules below. Intervening Walls block ranged attacks and area effects; the Wall beneath the target unit does not block attacks or area effects against that unit.
- Reuse `tile_mana_idle` and Bonechill Barrier visuals without silently inheriting original mana rewards, card statistics, faction ownership, or modifiers.
- Methron Points grant no mana. Deficit damage targets the disadvantaged player's General, without introducing a separate Heart. Point ownership is updated before deficit damage. There is no General-specific standing effect.

- Ranged attacks follow only the six center-to-center hex axes, perpendicular to the attacker's six tile edges. An in-range target off those axes cannot be hit by a ranged attack. Intervening Wall cells on the selected axis block it.
- All area effects are circular in hex-grid distance, with an effect-specific explosion radius measured from the explosion center. Radius is not the distance from caster to explosion center. Candidate targets need not lie on the six axes.
- For each candidate area target, test direct delivery along the segment from the explosion center to the target tile center. Do not propagate around Walls. An intervening Wall blocks only when that segment enters the interior of its hex; touching only a boundary or vertex does not block.
- A Wall directly beneath the target unit remains excluded from obstruction for melee, ranged attacks, and area effects. Other intervening Walls still apply.
### Confirmed attack target priority and shared-position damage

- A Wall and its occupant remain distinct entities with separate health and persistence, but direct melee/ranged attack target resolution uses priority rather than a player override.
- When a Wall tile is attacked and an enemy unit occupies it, resolve the attack against the enemy unit instead of the Wall. Do not allow manually selecting the Wall to bypass the enemy-occupant priority.
- If only an allied unit occupies the Wall, skip that allied unit and attack the neutral Wall when otherwise legal. Allied units cannot directly attack one another. If no unit occupies the Wall, the Wall is the direct target.
- Damaging area effects exclude allied units and can damage enemy units and neutral Walls when their range, obstruction, and target conditions are met. Both a Wall and its enemy occupant can receive damage independently. A Wall beneath an allied occupant can receive damage while the ally is excluded. The supporting Wall does not shield an enemy occupant.
- This decision supersedes earlier wording allowing independent direct-attack target selection for a Wall and its enemy occupant. Entity identity remains separate; previews, resolved targets, AI evaluation, and replay must follow the priority rule.
## Practice AI policy

Practice AI uses the replacement map's shared action legality, movement permissions, Wall targeting/obstruction, and Methron turn-end resolution. Preserve its approved fixed deck and existing difficulty modes. User-selected policy is balanced: prioritize immediate victory and averting immediate defeat, then compare expected control damage, combat gains, and survival. Neither point capture nor attacking has unconditional priority. Numerical evaluation weights are implementation tuning, verified with representative capture-favoring and combat-favoring positions.
## Match ruleset versioning

Use the existing ruleset ID practice-sandbox-hex with version 2 for new Practice and Sandbox matches after rollout. Version 2 binds the replacement battlefield and the ranged/area/target-priority rules defined in this spec as one rules package. Existing version 1 matches and replays retain their existing map, coordinate interpretation, and rules; do not migrate or reinterpret them as version 2. Keep the version 1 execution/reconstruction path. Other modes and Developer Sandbox retain their existing legacy selection. Historical snapshots without a ruleset ID retain the existing legacy fallback. Reject unsupported IDs/versions rather than guessing. Entry paths select the version; players do not choose it. No separate map-version field is introduced for this feature.
## Non-goals

- Keyhole mechanics, orb entities, new victory conditions, or automatic symmetrization of the supplied map.
- Changing mana, deck, hand, summoning, or counterattack rules beyond their application to the new map.
- Reworking maps in other modes, including the distinct Developer Sandbox entry.

## Success signal

A new Practice match and a new Sandbox match each show the exact 41-tile layout, nine neutral 10-health Walls, five Methron Points, and the specified player starts. Both sides can destroy Walls to open their tiles for ordinary movement. Flying and phasing units can traverse and stop on Walls and holes. Verify that intervening Walls block ranged attacks and area effects while a target's supporting Wall does not block melee, ranged, or area effects against that target. Demonstrations verify persistent point ownership, recapture, 4 damage for a 3-to-1 control advantage at either turn end, and identical capture rules for Generals and other units. An unaffected mode retains its map and rules.

## Assumptions

- b and o designate the existing player generals' starting positions, rather than additional orb entities.







