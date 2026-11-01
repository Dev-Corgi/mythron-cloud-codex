# Epic 2 Context: Play tactical Practice and Sandbox matches on the replacement battlefield

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Deliver complete Practice and Sandbox matches on the specified replacement battlefield while keeping Developer Sandbox and other modes compatible with their existing maps and rules. Preserve saved match and replay behavior as the feature evolves, then integrate the map, terrain, combat, point control, and Practice AI so users do not encounter a partially implemented rules package. The work uses the existing shared SDK, services, persistence, and assets.

## Stories

- Story 2.1: Preserve each saved match's battlefield and rules
- Story 2.2: Resolve positions consistently on the irregular hex battlefield
- Story 2.3: Enter and interact with the exact replacement battlefield
- Story 2.4: Traverse and occupy holes according to unit movement
- Story 2.5: Attack neutral Walls and open their tiles
- Story 2.6: Share a Wall position and attack the correct target
- Story 2.7: Apply Wall obstruction consistently to attacks and area effects
- Story 2.8: Capture and retain Methron Points
- Story 2.9: Damage the disadvantaged General at both turn ends
- Story 2.10: Face a Practice bot that makes legal terrain-aware actions
- Story 2.11: Face a Practice bot that evaluates Walls and routes
- Story 2.12: Face a balanced Practice bot that competes for Methron control

## Requirements & Constraints

- New Practice and Sandbox matches use `practice-sandbox-hex` version 2 after complete integration. Preserve version 1 map, coordinates, starts, and rules for existing matches and replays; do not infer old match identity from current launch defaults.
- Resolve identity before board construction and action replay. Snapshots with no ruleset identity retain the existing legacy fallback. Reject unknown IDs or versions clearly; do not add a separate map-version field.
- Developer Sandbox and all unaffected modes retain legacy maps and behavior. Keep existing mana, decks, eligibility, fixed-hand, summoning, combat, and Practice roster contracts.
- Save and replay terrain entities, health, co-located entities, point ownership, and turn-end effects deterministically.
- Use the exact supplied 41-tile irregular map and preserve its literal placements. Holes remain addressable but have no rendered tile. Walls and points have distinct state and use existing visual assets without inheriting original card or mana effects.
- Shared geometry, action legality, UI previews, authoritative resolution, AI, and replay must agree. Reuse existing SDK and persistence; no new service or datastore.

## Technical Decisions

- Match-scoped immutable ruleset ID/version is the source of behavior selection. Entry paths bind identity; clients do not choose it.
- Existing coordinate formats remain. Map-specific positions, row staggering, neighbors, and starts follow the replacement map definition; do not migrate coordinates or apply square-grid offsets.
- SDK actions own authoritative state changes. Browser prediction, server play, local Sandbox, and replay use shared rules and serialization.
- Stage rollout behind the versioned identity so version 2 does not construct or expose incomplete map capabilities.

## Cross-Story Dependencies

Story 2.1 establishes compatibility and version registration. Geometry and map interaction follow in 2.2–2.3; movement, Walls, and obstruction build through 2.7; point control resolves in 2.8–2.9. Practice AI legality depends on completed action capabilities (2.10), followed by Wall tactics (2.11) and point-aware evaluation (2.12). No Epic 2 story depends on a later epic.
