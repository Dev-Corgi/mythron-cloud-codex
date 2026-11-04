---
title: 'Story 4: Summon fly and phase units onto Walls next to the General'
type: 'feature'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/specs/spec-duelyst-action-model-rush/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-practice-sandbox-map/map-layout.md'
---

## Intent

**Problem:** Fly and phase units can already cross and occupy Walls by moving, but summoning follows the ordinary rules and cannot place them on a Wall.

**Approach:** In Practice/Sandbox v2, let a fly or phase unit be summoned onto a Wall on a tile adjacent to its owner's General. Independent of stories 1 and 2. Implementation only; this spec run changed no code.

## Boundaries & Constraints

**Always:** Movement type must be fly or phase; the Wall must be on a tile hex-adjacent to the owner's own General; the Wall stays as a separate entity sharing the position. Applies to hand-card summons (Walls adjacent to the General) and to effect-created summons of such units (any Wall the effect itself may place a unit on; the effect's own placement constraints still apply). Follow spine AD-23: one predicate decides the fly/phase Wall exemption for validation, highlighting, AI and every summon position producer.

**Never:** Allow walk units on Walls; allow holes or non-adjacent Walls; remove or damage the Wall; change any other summon rule.

## Code Map (starting points; verify against the repo)

- `duelyst/app/sdk/entities/entity.coffee` -- `getObstructsEntity` (a Wall obstructs every Unit) and `getValidTargetPositions`; `duelyst/app/sdk/board.coffee` -- `getObstructionAtPositionForEntity`, `getValidGeneralAdjacentSpawnPositions`, `isValidGeneralAdjacentSpawnPosition`.
- `duelyst/app/sdk/validators/validatorPlayCard.coffee` and `validatorFollowup.coffee` -- placement validation reads the same positions.
- `duelyst/app/sdk/validators/validatorApplyCardToBoard.coffee` -- final authority on obstructed positions.
- Effect-created summons call `Board.getObstructionAtPositionForEntity` themselves (about 20 spells and modifiers, e.g. `spellSpawnEntity`, `spellApplyEntityToBoard`, `modifierOpeningGambitProgenitor`). Teleports (`teleportAction`, teleport spells) use the same call but are not summons and must keep Wall obstruction.
- View highlighting and `duelyst/server/ai` -- must use the shared source.
- `duelyst/test/unit/sdk/game/` -- summon and Wall tests.

## Acceptance Criteria

- Given a fly unit card in hand and a Wall adjacent to my General, then that Wall tile is a legal summon position and the unit can be played there.
- Given a phase unit card, then the same holds.
- Given a walk unit card, then the Wall tile is not a legal position.
- Given a Wall not adjacent to my General, a hole, or a tile adjacent only to the enemy General, then it is not a legal position for a fly or phase unit.
- Given a fly or phase unit is summoned onto a Wall, then the Wall remains, with its own health, as a separate entity at that position, and attack priority follows the existing occupant rules.
- Given an effect that summons a fly or phase unit, then it may place it on a Wall that the effect's own constraints allow, and an effect constraint that forbids a tile is still respected.
- Given placement highlights, validation and AI, then they agree on the same legal positions.
- Given tests, then they cover walk, fly and phase units, adjacent and non-adjacent Walls, and the Wall's survival.
