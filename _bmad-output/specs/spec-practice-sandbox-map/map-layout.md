# Battlefield Layout and Asset References

## Coordinate convention

Preserve the existing coordinate system and coordinate data formats. This feature replaces the map layout and its neighbor relationships, not the coordinate system.

Coordinates are (row,column), indexed from zero at the upper-left. Columns restart at zero on each row. Rows 0, 2, and 4 contain nine positions; rows 1 and 3 contain eight, shifted half a tile right. Hexes have top and bottom vertices.

```text
row0   k  B  #  X  .  X  B  .  o
row1     .  .  .  B  .  .  .  .
row2   .  .  B  .  X  .  B  .  B
row3     .  .  .  .  B  .  .  .
row4   b  .  B  X  .  X  #  B  K
```

Within a row, neighbors differ by one column. For a cell (r,c), neighbors in each adjacent row are columns c-1 and c when r is even, and c and c+1 when r is odd. Discard out-of-row positions. Retain hole coordinates in the logical geometry despite not rendering tiles there. Filter paths and destinations by movement type: ordinary units cannot cross or stop on holes or Walls, while flying and phasing units can. Walls occupy existing tiles and can share a position with an eligible unit. This convention replaces the prior column-staggered layout.

## Placement contract

| Symbol | Meaning | Positions (row,column) |
| --- | --- | --- |
| # | No hex tile | (0,2), (4,6) |
| X | Methron Point | (0,3), (0,5), (2,4), (4,3), (4,5) |
| B | Neutral Wall, 10 health | (0,1), (0,6), (1,3), (2,2), (2,6), (2,8), (3,4), (4,2), (4,7) |
| b | Player1 start on an ordinary tile | (4,0) |
| o | Player2 start on an ordinary tile | (0,8) |
| k / K | Ordinary tile, no keyhole visual or mechanic | (0,0), (4,8) |
| . | Existing basic hex tile | All remaining positions |

There are 43 layout positions, 2 holes, 41 actual tiles, 9 Walls, and 5 Methron Points. The remaining 27 actual tiles include ordinary tiles and both player starts.

The approximate 180-degree symmetry description is reference context, not an instruction to modify the map. In particular, the Wall at (2,8) has no matching Wall at (2,0). Preserve the literal placement.

## Entities and visuals

- Replace the initial cloth-covered-box interpretation of B with a Wall using Bonechill Barrier visuals. Each Wall is neutral and independently attackable by both sides, starts at 10 health, and blocks ordinary units of both sides from occupying or traversing its tile. Flying and phasing units can cross or stop on it. Other attack legality still applies.
- Bonechill Barrier is a visual source only. Its original card statistics, player ownership, and modifiers are not part of this feature's contract. A destroyed Wall leaves an ordinary tile that permits movement and otherwise legal summoning. Walls block intervening ranged attacks and area effects, subject to the target-position exception below.
- X is named **Methron Point** and uses the existing `tile_mana_idle` effect, without granting mana. Its control and damage mechanics are defined below.
- Ignore all previous keyhole or goal interpretations for k/K. Treat them exactly like a basic tile. b/o designate player starts; their earlier orb interpretation does not add orb entities.

## Wall blocking and elevated targets

- Flying and phasing units may traverse and end movement on holes and Walls. Holes remain visually empty; do not create a hex tile merely to support an eligible occupant. Ordinary units cannot cross or stop on either terrain type.
- A unit on a Wall and the neutral Wall are distinct entities at one coordinate. Direct melee/ranged attacks prioritize an enemy occupant; an allied occupant is skipped so the neutral Wall can be attacked. Damaging area effects can affect both the Wall and its enemy occupant independently.
- A Wall between an attacker or effect source and a target blocks ranged attacks and area effects beyond it.
- The Wall directly beneath the target unit does not shield that unit from melee attacks, ranged attacks, or area effects. Existing range and targeting conditions still apply, and any other intervening Wall can still block the attack or effect.
- Examples: an adjacent attacker can melee an otherwise legal enemy unit on a Wall; a ranged attack or area effect can reach a unit on a Wall if no other Wall obstructs it; adding an intervening Wall blocks that ranged attack or area effect.

## Ranged axes and circular area delivery

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
## Methron Point control and damage

Methron Points follow Phobies Panic Point control behavior, with the user-selected damage value and General as the deficit-damage target:

- Control has three states: neutral, player1, or player2. A player's unit remaining alive on a point through turn-end effects captures it; a unit that dies before capture does not capture it.
- Capturing an opponent-controlled point transfers ownership. Leaving a captured point empty does not remove ownership; it remains controlled until recaptured.
- At every turn end, including both players' turns, update captures before calculating control advantage. Count each player's controlled points across all five points. The player with fewer points suffers damage to their General equal to `2 * abs(player1_count - player2_count)`. Equal counts cause no control damage. Empty controlled points still count.
- Generals capture and recapture points under the same rules as other units. Standing on a point causes no additional damage or other General-specific effect.
- Methron Points do not grant mana and are not consumed by capture or departure.

Reference behavior was checked against the [community map guide](https://phobies.fandom.com/wiki/Guide%3AMap_Features) and [community turn-event guide](https://www.reddit.com/r/PhobiesGame/comments/1pd8jfr/game_help_battle_information/). These are community sources; user decisions here govern damage amounts and targets. Phobies-specific units, terrain effects, scaling, and Heart entities are not added by this reference.

## Verified repository references

- `duelyst/app/data/resources.js`: `tileManaIdle` references `resources/tiles/tile_mana.png`, its plist, and frame prefix `tile_mana_idle`.
- `duelyst/app/data/resources.js`: `f6BonechillBarrierIdle` and the corresponding breathing, damage, and death definitions reference the existing `f6_bonechillbarrier` atlas.
- `duelyst/app/sdk/cards/factory/core/faction6.coffee`: existing Bonechill Barrier card setup is a reference for asset wiring, not authority for Wall mechanics.

## Verification examples

- Both modes reproduce every row and symbol; neither odd row gains a ninth position.
- Center Methron Point (2,4) has geometric neighbors (2,3), (2,5), (1,3), (1,4), (3,3), (3,4). Its neighboring Wall cells are geometrically adjacent and block ordinary movement, while allowing flying and phasing movement.
- At setup, player1's otherwise valid adjacent tiles are (4,1) and (3,0); player2's are (0,7) and (1,7).
- Neither hole renders a hex tile. Ordinary units cannot cross or stop there; flying and phasing units can cross and stop there. Movement permission alone does not add summoning permission.
- Both players can damage a Wall. Ordinary units cannot cross or stop on a living Wall; flying and phasing units can do both.
- After destroying a Wall, its tile remains present and supports movement and otherwise legal summoning.
- Capture a point, leave it empty, and confirm ownership persists; capture it with the opposing side to confirm ownership transfers.
- With control counts 3 versus 1, the disadvantaged General takes 4 control damage at the end of either player's turn. With 2 versus 2, neither General takes control damage.
- A unit killed by turn-end effects before capture does not capture its point.
- A General can capture and leave a point without receiving standing damage; equal point counts cause no Methron Point damage to either General, even if they stand on points.
- Flying and phasing units can end movement at either hole and on a living Wall. Confirm separate entity state, enemy-occupant priority for direct attacks, Wall targeting beneath an allied occupant, and independent Wall/enemy damage from an eligible area effect.
- Melee, ranged, and area effects can hit a unit on a Wall when otherwise legal; a different intervening Wall still blocks ranged attacks and area effects.




