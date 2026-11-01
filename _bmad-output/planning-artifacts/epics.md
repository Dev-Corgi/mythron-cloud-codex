---
status: final
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
currentStep: complete
requirementsStatus: approved
epicDesignStatus: approved
storyCreationStatus: approved
storyApprovalMode: user-authorized-automatic
validationStatus: passed
openReadinessChecks: 0
validationReport: C:/Working/duelyst/_bmad-output/planning-artifacts/epic-2-validation-2026-11-01.md
inputDocuments:
  - C:/Working/duelyst/_bmad-output/specs/spec-practice-sandbox-map/SPEC.md
  - C:/Working/duelyst/_bmad-output/specs/spec-practice-sandbox-map/map-layout.md
  - C:/Working/duelyst/_bmad-output/specs/spec-duelyst-rules-overhaul/SPEC.md
  - C:/Working/duelyst/_bmad-output/specs/spec-duelyst-rules-overhaul/rules-detail.md
  - C:/Working/duelyst/_bmad-output/specs/spec-duelyst-rules-overhaul/practice-bot-deck.md
  - C:/Working/duelyst/_bmad-output/planning-artifacts/architecture/architecture-duelyst-2026-10-30/ARCHITECTURE-SPINE.md
previousEpicPlan: C:/Working/duelyst/_bmad-output/planning-artifacts/epics-duelyst-rules-overhaul.md
---

# duelyst — Practice and Sandbox Battlefield Replacement - Epic Breakdown

## Overview

The battlefield replacement requirements, including the Practice AI clarification, and the single Epic 2 structure are approved. All twelve stories below are approved under the user-authorized automatic approval instruction; final validation passed after the authorized Epic 1 baseline repair, as recorded in the linked validation report. Inherited core rules are compatibility constraints, not a new implementation backlog.

## Requirements Inventory

### Functional Requirements

FR1: New Practice and Sandbox matches use the battlefield replacement. Developer Sandbox and all other modes retain their existing maps and rules. (SPEC constraints)
FR2: Render pointy-top hex rows of lengths 9,8,9,8,9 with odd rows shifted half a tile right. Retain 43 logical positions and render 41 tiles, omitting tiles at (0,2) and (4,6). Preserve every literal placement in map-layout.md without symmetrizing the map. (CAP-1)
FR3: Apply the documented zero-based (row,column) geometry consistently to rendering, movement, paths, range, adjacency, targeting, and summoning. Within-row neighbors are c-1/c+1; adjacent-row neighbors are c-1/c for even rows and c/c+1 for odd rows, filtered to each row's bounds. Holes remain addressable logical positions. (CAP-1)
FR4: Place player1's General at (4,0) and player2's at (0,8). Treat (0,0) and (4,8) as ordinary tiles, with no keyhole mechanics, goal visuals, or additional orb entities. (CAP-2)
FR5: Initialize neutral, independently attackable Walls with 10 health at (0,1),(0,6),(1,3),(2,2),(2,6),(2,8),(3,4),(4,2),(4,7). Both players can select and damage them through otherwise legal attacks. (CAP-4)
FR6: Ordinary units cannot cross or stop on holes or living Walls. Flying and phasing units can cross and stop on both; occupying a hole does not create a rendered tile. Movement permissions do not independently permit summoning there. (CAP-1, CAP-4)
FR7: Support a Wall and an eligible unit at one coordinate as distinct entities. Direct melee/ranged attacks against the tile prioritize an enemy occupant over the Wall; an allied occupant is skipped and the neutral Wall can be attacked when otherwise legal. Allied units cannot directly attack each other. Eligible damaging area effects exclude allies, damage enemies and neutral Walls, and damage both a Wall and its enemy occupant independently. (User-confirmed CAP-4 refinement)
FR8: Ranged attacks are restricted to the six center-to-center hex axes perpendicular to tile edges. All area effects use effect-specific circular hex-distance explosion radii, with direct explosion-center-to-target-center delivery and no detours; only intersecting the interior of an intervening Wall blocks, not touching its boundary/vertex. Intervening Walls block ranged attacks along their axis and area delivery as specified. A Wall beneath the target unit does not block melee, ranged, or area effects against that unit; other blockers, range, and targeting conditions still apply. (CAP-4)
FR9: Destroying a Wall removes its obstruction and leaves an ordinary existing tile available for movement and otherwise legal summoning. (CAP-4)
FR10: Display Walls with Bonechill Barrier visuals without inheriting the original card's statistics, faction ownership, or modifiers. (CAP-4)
FR11: Initialize five neutral Methron Points at (0,3),(0,5),(2,4),(4,3),(4,5), displaying tile_mana_idle. They grant no mana and are not consumed by capture or departure. (CAP-3)
FR12: At every player's turn end, a player's unit that remains alive on a Methron Point through turn-end effects captures it. A unit that dies before capture does not capture it. (CAP-3)
FR13: Track each point as neutral, player1-controlled, or player2-controlled. Capturing an opponent-controlled point transfers ownership; ownership persists when the point becomes empty until recaptured. (CAP-3)
FR14: At both players' turn ends, update captures before counting all five points, including empty controlled points. Damage the disadvantaged player's General by 2 times the control-count difference; 3 versus 1 deals 4 damage and equal counts deal none. (CAP-3)
FR15: Generals capture and recapture Methron Points under the same rules as other units. Standing on a point causes no additional damage or General-specific effect. Do not introduce a separate Heart or new victory condition. (CAP-3)
FR16: Preserve general-adjacent-only summoning, no automatic counterattacks, reserve-funded persistent mana, separate nine-card mode decks, fixed eight-slot hands, shared audited card eligibility, and the exact Practice bot roster. Apply the map's geometry to these existing behaviors; do not reopen the original rules overhaul as new feature scope. (Inherited core contract)

FR17: Practice AI must generate and execute legal actions using the replacement map's row-staggered six-neighbor topology, per-row bounds, addressable holes, living Walls, and movement-type permissions. Ordinary units avoid holes and living Walls; flying and phasing units may cross or occupy them. Summons still require otherwise legal General-adjacent tiles. (User clarification: Practice AI adaptation)
FR18: Practice AI must evaluate Wall attacks and movement routes opened by Wall destruction, distinguish a Wall from a unit sharing its coordinate, and respect intervening-Wall blocking and the target-supporting-Wall exception when evaluating melee, ranged, and area effects. (User clarification: Practice AI adaptation)
FR19: Practice AI uses a balanced policy: consider immediate wins and avoiding immediate defeat first, then compare expected control damage, combat gains, and survival rather than always preferring territory or attacks. Practice AI must include Methron Point capture, recapture, retained ownership of empty points, and control-count deficit damage in action evaluation. It must consider capturing or defending points and keeping capturing units alive through turn-end effects; General capture follows the same rules and incurs no standing penalty. AI evaluations must use capture-before-damage ordering at both players' turn ends. (User clarification: Practice AI adaptation)

### NonFunctional Requirements

NFR1: Browser prediction, authoritative Practice play, local Sandbox play, AI geometry, and replay must agree on map positions and action legality. (Inherited architecture AD-2, AD-3)
NFR2: Terrain state, Wall identities and health, co-located units, Methron ownership, and turn-end control damage must serialize and replay deterministically. (Inherited deterministic-state contract applied to this feature)
NFR3: Other modes, existing legacy decks and matches, and snapshots without ruleset IDs retain legacy behavior; unknown ruleset identities or versions are rejected. The replacement must not silently reinterpret an existing match's geometry. (Inherited AD-1, compatibility convention)
NFR4: Rendered positions, interaction previews, target selection, and resolved actions must agree even for invisible hole tiles and co-located Wall/unit entities. (SPEC success signal and interaction constraints)
NFR5: Reuse the existing shared SDK, services, persistence, and referenced assets; no new service, datastore, starter project, or infrastructure component is required. (Inherited architecture structural seed)

### Additional Requirements

### Confirmed attack target priority and shared-position damage

- A Wall and its occupant remain distinct entities with separate health and persistence, but direct melee/ranged attack target resolution uses priority rather than a player override.
- When a Wall tile is attacked and an enemy unit occupies it, resolve the attack against the enemy unit instead of the Wall. Do not allow manually selecting the Wall to bypass the enemy-occupant priority.
- If only an allied unit occupies the Wall, skip that allied unit and attack the neutral Wall when otherwise legal. Allied units cannot directly attack one another. If no unit occupies the Wall, the Wall is the direct target.
- Damaging area effects exclude allied units and can damage enemy units and neutral Walls when their range, obstruction, and target conditions are met. Both a Wall and its enemy occupant can receive damage independently. A Wall beneath an allied occupant can receive damage while the ally is excluded. The supporting Wall does not shield an enemy occupant.
- This decision supersedes earlier wording allowing independent direct-attack target selection for a Wall and its enemy occupant. Entity identity remains separate; previews, resolved targets, AI evaluation, and replay must follow the priority rule.

- Authority: practice-sandbox-map/SPEC.md and map-layout.md define this feature. The latter is authoritative for exact positions. Core-rule documents and the architecture remain binding except where this feature explicitly replaces board footprint, row staggering, map-specific neighbor/layout calculations, starting positions, and the subsequently confirmed attack rules.
- User-confirmed coordinate scope: preserve the existing coordinate system and data formats. No coordinate-system replacement or coordinate migration is requested. Replace the old map footprint, column staggering, and center-edge starts with the new row-staggered placement, six-neighbor relationships, and specified starts. Adjust map-specific geometry calculations within the existing system and verify them against map-layout.md. Coordinate-system choice is removed from the open-decision list.
- Separate logical positions (43), rendered tiles (41), terrain obstacles (nine initial Walls), and mobile unit occupancy. Hole addressability and Wall/unit co-location must survive setup, actions, serialization, and replay.
- Extend SDK action validation and resolution as well as UI previews; cover board helpers, pathfinding, targeting, card effects, and Practice AI consumers. Adapt AI candidate generation, route evaluation, target identity, and tactical scoring to FR17-FR19. Use the shared SDK legality and effect-resolution contracts rather than a divergent AI geometry or combat model. Preserve the approved fixed bot deck; this clarification does not authorize roster changes or additional difficulty modes.
- Preserve immutable match-scoped ruleset identity selected by the validated Practice route or concrete local Sandbox entry. GameType.Sandbox alone cannot identify scope; Developer Sandbox remains excluded.
- User-confirmed versioning: retain ruleset ID practice-sandbox-hex and use version 2 for new Practice/Sandbox matches after rollout. Version 1 saved matches/replays retain their existing recorded geometry and rule execution; the current checkout already uses a row-staggered version-1 board, so compatibility must not assume every version-1 session came from the old 45-tile design. Do not migrate or reinterpret existing version 1 sessions. Keep the version 1 path, existing legacy fallback for absent IDs, and rejection of unsupported identities. No separate map-version field or player-facing version selector is introduced.
- Persist neutral Wall entity identity, health, terrain/occupant distinction, and Methron ownership with deterministic action ordering. Resolve direct attacks using shared enemy-occupant-first priority and validate the resolved entity consistently; explicit entity targeting cannot bypass this priority.
- Integrate capture after relevant turn-end effects, then deficit damage, at both players' turn ends without duplicating the existing once-per-ending-player reserve transfer. Use existing General damage and match-end resolution.
- User-confirmed ranged geometry: only the six center-to-center axes perpendicular to tile edges are legal; intervening Wall cells block. User-confirmed area geometry: all effects are circular in hex distance with effect-specific explosion radii; test each target by a direct center-to-target segment without detours. A Wall blocks only if the segment enters its hex interior, not on boundary/vertex contact alone. Preserve the target-supporting-Wall exception. Use one deterministic shared implementation, including precise boundary handling.
- Reference assets: app/data/resources.js tileManaIdle and f6BonechillBarrier animation definitions. Asset reuse must not instantiate original mana rewards or Bonechill Barrier gameplay modifiers.
- Preserve opening mana (reserve,spendable) of (17,3)/(16,4), own-turn-end transfer min(3,reserve), no bonus mana, no nine-mana cap, and persistent unspent mana.
- Preserve deck purposes practice/sandbox/legacy, one General plus eight eligible cards, eight stable slots with null spent entries, no draw/replacement/fatigue/hand mutation, and shared eligibility validation at editing, entry, setup, and generated-card boundaries.
- Preserve the fixed bot roster: Maw 10979, Bloodtear Alchemist 19052, Golem Metallurgist 19038, Bloodshard Golem 10205, Dragonlark 10001, Flameblood Warlock 19051, Sworn Avenger 10954, Drybone Golem 10206. Maw's nearby effect and all audited card interactions must respect the replacement topology.
- Existing implementation story IDs and sprint status are unchanged by this requirements extraction. The original epic plan is preserved as epics-duelyst-rules-overhaul.md; select new epic numbering during epic design to avoid collisions.

### UX Design Requirements

No separate UX DESIGN.md/EXPERIENCE.md contract was found. The following actionable requirements are extracted from the approved feature SPEC and map companion.

UX-DR1: Render the exact five pointy-top rows with half-tile right offsets for odd rows, 41 visible tiles, and visually empty holes at (0,2)/(4,6), including when an eligible unit occupies a hole.
UX-DR2: Show player starts at (4,0)/(0,8); render (0,0)/(4,8) as ordinary hexes without keyhole or orb visuals.
UX-DR3: Render all nine neutral 10-health Walls using Bonechill Barrier assets; reflect damage and destruction while retaining the underlying tile.
UX-DR4: Keep Wall and occupant identities distinct while previewing the actual attack target: enemy occupant first for direct melee/ranged attacks, otherwise the Wall beneath an allied occupant. Disallow allied direct attacks; reflect independent damage to both Wall and enemy occupant from eligible area effects.
UX-DR5: Display tile_mana_idle at all five Methron Points and make neutral/player1/player2 control distinguishable, including persistent ownership on empty points. No new mana-reward interaction is introduced.
UX-DR6: Movement, summon, attack, and area-effect previews must match the replacement row geometry, movement-type permissions, intervening-Wall blocks, and target-Wall exception.
UX-DR7: Reflect turn-end ownership changes and resulting General health changes consistently with resolved state, including 4 damage for 3-versus-1 control and no damage for equal counts or General standing alone.

### FR Coverage Map

FR1: Epic 2 - Apply the new battlefield only to Practice and Sandbox.
FR2: Epic 2 - Reproduce the exact 41-tile row-staggered battlefield.
FR3: Epic 2 - Use consistent six-neighbor geometry across all consumers.
FR4: Epic 2 - Start Generals at opposite specified corners with ordinary k/K tiles.
FR5: Epic 2 - Provide nine neutral 10-health Walls attackable by both players.
FR6: Epic 2 - Respect ordinary versus flying/phasing movement over holes and Walls.
FR7: Epic 2 - Preserve distinct entities, enemy-first direct targeting, no allied direct attacks, and separate area damage.
FR8: Epic 2 - Apply intervening-Wall blocking and the target-supporting-Wall exception.
FR9: Epic 2 - Open an ordinary usable tile after Wall destruction.
FR10: Epic 2 - Reuse Bonechill Barrier visuals without inheriting its gameplay.
FR11: Epic 2 - Provide five non-mana Methron Points with the specified visuals.
FR12: Epic 2 - Capture only with occupants surviving relevant turn-end effects.
FR13: Epic 2 - Persist and transfer ownership, including on empty points.
FR14: Epic 2 - Apply capture-before-counting and deficit damage at both turn ends.
FR15: Epic 2 - Give Generals normal capture behavior without standing damage.
FR16: Epic 2 - Preserve the inherited mana, deck, hand, combat, summon, and bot-roster contracts.
FR17: Epic 2 - Generate legal Practice AI actions for the replacement terrain.
FR18: Epic 2 - Evaluate Wall destruction, routing, blocking, and distinct targets in Practice AI.
FR19: Epic 2 - Evaluate Methron capture, defense, recapture, and control damage in Practice AI.

## Epic List

### Epic 2: Play tactical Practice and Sandbox matches on the replacement battlefield

Players can complete matches on the exact irregular battlefield, use special movement and destructible Walls to create tactical routes, and capture Methron Points to damage the opposing General. Practice provides an opponent that acts legally and evaluates these terrain and control objectives.

**FRs covered:** FR1-FR19 (all 19 approved functional requirements).
**Quality constraints:** NFR1-NFR5 apply throughout.
**UX requirements:** UX-DR1-UX-DR7 are included in their corresponding gameplay work.

**User outcomes:**
- Enter either supported mode on the exact 41-tile map with the specified starts while other modes retain their behavior.
- Move, summon, select targets, attack, and destroy Walls with consistent previews and resolved outcomes, including hole occupation, enemy-occupant-first direct targeting, and Wall/unit co-location for eligible movement types.
- Capture, retain, and recapture five Methron Points and resolve control-deficit damage correctly at every turn end.
- Face a Practice bot that accounts for legal routes, Wall attacks, target identity, and Methron control when choosing actions.
- Save and replay the resulting terrain, ownership, targeting, and damage state consistently while retaining the existing core rules.

**Grouping rationale:** Geometry, terrain occupancy, Wall targeting, point control, and AI all affect shared board, action, turn-resolution, and view behavior. Splitting these into separate epics would repeatedly modify the same components and leave intermediate Practice matches with incomplete opponent behavior. Their defined gameplay contracts are already known, so one complete user outcome with ordered, bounded stories is preferred over separate technical or partially playable epics.

**Dependencies and ordering:** Epic 1 is the existing core-rules baseline, not a claim that its unfinished work is complete. The audited valid-entry/fixed-roster and fixed-hand gaps are repaired and 224 related tests pass. Story 1.10 is implemented with sprint status review; prior done story records are reconciled. Preserve that verified baseline during implementation. Epic 2 will not require any later epic to function. Within Epic 2, order future stories so earlier stories provide complete capabilities for later ones: compatible map identity and geometry first; terrain, targeting, and point resolution before AI evaluation of those mechanics. Integrate relevant UI, persistence, and verification with each capability rather than deferring them to a final technical-layer epic.

**Decision status:** User-facing decisions are settled: version 2 for new matches, existing coordinate system retained, six-axis ranged attacks, circular direct-delivery area effects with interior-only Wall obstruction, enemy-occupant priority, no friendly damage, and balanced Practice AI. Implement and verify these contracts in the relevant stories. Map-specific geometry calculations and numerical AI weights are implementation details, not pending coordinate-system or gameplay choices.

**Numbering:** Use Epic 2 and story IDs 2.x to avoid collisions with the preserved Epic 1 and existing implementation artifacts. Existing sprint status is unchanged at this design stage.

## Epic 2: Play tactical Practice and Sandbox matches on the replacement battlefield

Players complete matches on the supplied battlefield, exploit destructible terrain, compete for persistent Methron control, and face a Practice opponent that understands these mechanics.

Delivery uses the existing shared SDK and persistence; no new service, datastore, or starter template is needed. Each story includes its own relevant UI, serialization, replay, and regression checks. Earlier capabilities must be executable without unfinished later stories; the complete replacement is released only after all required capabilities are integrated. The incremental map identity mechanism must not expose a partly implemented map as the completed replacement.

### Story 2.1: Preserve each saved match's battlefield and rules

As a player,
I want saved matches and replays to retain their original battlefield,
So that introducing a new map does not change past match outcomes.

**Requirements:** FR1, FR16; NFR2, NFR3, NFR5.
**Dependencies:** Existing Epic 1 session/ruleset persistence baseline; no Epic 2 dependencies.
**Scope:** Version 1 compatibility and registration of practice-sandbox-hex version 2; no replacement-map construction or rollout until its required capabilities are integrated.

**Acceptance Criteria:**

**Given** an existing legacy match or a practice-sandbox-hex version 1 match,
**When** it is loaded or replayed,
**Then** its original map, coordinate interpretation, start positions, and core rules are retained,
**And** the replacement map is never inferred from the current launch defaults.

**Given** a match with a supported map/ruleset identity,
**When** its setup or session snapshot is saved and restored,
**Then** the identity round-trips and is resolved before board construction and action replay,
**And** version 1 keeps its original execution path, version 2 identifies the replacement map/rules package, and no separate map-version field is introduced.

**Given** a historical snapshot without ruleset metadata or a snapshot with an unknown identity/version,
**When** reconstruction is requested,
**Then** the former follows the existing legacy fallback and the latter is rejected with a clear error,
**And** unsupported data is not silently interpreted as either supported map.

**Given** Developer Sandbox or another unaffected entry,
**When** a match is started, saved, and restored,
**Then** its original map and rules are unchanged,
**And** compatibility fixtures cover both existing match families without requiring later Epic 2 stories.

### Story 2.2: Resolve positions consistently on the irregular hex battlefield

As a player,
I want movement, range, and adjacency to agree on the new battlefield,
So that actions obey the same geometry everywhere.

**Requirements:** FR2, FR3; NFR1-NFR3, NFR5.
**Dependencies:** 2.1.
**Scope:** Executable shared map/topology definition with round-trip coordinates; rendering and entry activation follow in 2.3.

**Acceptance Criteria:**

**Given** the replacement map definition,
**When** its logical positions, tile-presence mask, or neighbors are queried,
**Then** row lengths are exactly 9,8,9,8,9 with 43 logical positions and 41 actual tiles,
**And** holes at (0,2)/(4,6) remain addressable while out-of-row coordinates are rejected.

**Given** an even or odd row,
**When** neighbors are computed,
**Then** within-row columns are c-1/c+1 and adjacent-row columns are c-1/c for even rows or c/c+1 for odd rows, filtered by row bounds,
**And** (2,4) has exactly (2,3),(2,5),(1,3),(1,4),(3,3),(3,4).

**Given** any of the 43 logical positions,
**When** mapped through the existing display/SDK coordinate adapters and back,
**Then** it returns the same position without collisions,
**And** coordinate-system/data formats remain unchanged while map-specific layout and six-neighbor distance calculations agree with the new row-staggered battlefield.

**Given** board, range, path, targeting, and adjacency consumers using this map,
**When** identical geometry queries run in browser/shared SDK/server and reconstruction fixtures,
**Then** they agree on position and neighbor results,
**And** legacy and prior-map topology fixtures remain unchanged.

### Story 2.3: Enter and interact with the exact replacement battlefield

As a Practice or Sandbox player,
I want the supplied battlefield and corner starts displayed accurately,
So that I can recognize and select the positions used by the rules.

**Requirements:** FR1-FR4, FR16; UX-DR1, UX-DR2, geometry portion of UX-DR6; NFR1-NFR5.
**Dependencies:** 2.1, 2.2.
**Scope:** Base map, input adapters, and scoped setup; later stories add Walls and Methron mechanics.

**Acceptance Criteria:**

**Given** version 2 replacement-map setup through validated Practice or concrete local Sandbox entry after rollout,
**When** the base battlefield is constructed and displayed,
**Then** pointy-top rows have lengths 9,8,9,8,9 with odd rows half a tile right and only 41 hex tiles rendered,
**And** holes have no tile, player1 starts at (4,0), player2 at (0,8), and (0,0)/(4,8) are ordinary tiles without keyhole or orb entities.

**Given** a visible tile or logical hole position,
**When** pointer selection and display/SDK conversion are exercised,
**Then** the selected logical coordinate agrees with shared topology and range/adjacency previews,
**And** hit testing does not manufacture an extra tile or an odd-row ninth column.

**Given** either supported mode's base setup,
**When** state is saved, restored, or replayed,
**Then** ruleset practice-sandbox-hex version 2, holes, starts, and selected action coordinates round-trip,
**And** unaffected entry paths retain their original maps; new-map selection cannot be forced through a client-supplied identifier.

**Given** the existing core-rules baseline,
**When** map setup and otherwise legal ordinary-tile actions run,
**Then** General-only adjacent summoning, no counterattack, opening mana (17,3)/(16,4), own-turn-end reserve transfer, persistent mana, and mode-specific decks/hands remain in force,
**And** existing unfinished Epic 1 prerequisites are identified rather than marked complete by this story.

### Story 2.4: Traverse and occupy holes according to unit movement

As a player,
I want flying and phasing units to use holes while ordinary units avoid them,
So that movement capabilities create valid tactical routes.

**Requirements:** Hole portion of FR6, FR3, FR16; UX-DR1, movement portion of UX-DR6; NFR1-NFR4.
**Dependencies:** 2.2, 2.3.
**Scope:** Hole traversal/occupation and occupant interactions; living-Wall permissions follow in 2.5-2.6.

**Acceptance Criteria:**

**Given** an ordinary unit and either hole,
**When** a path crosses the hole or ends there,
**Then** shared movement validation rejects that route or destination,
**And** UI previews do not offer the invalid movement.

**Given** a flying or phasing unit with otherwise legal movement,
**When** it crosses or ends at either hole,
**Then** the move is accepted and the occupant remains rendered, selectable, and targetable under existing combat rules,
**And** the underlying hole remains visually empty and normal range/occupancy constraints still apply.

**Given** hole movement permission,
**When** a summon is evaluated,
**Then** movement permission does not independently create summon permission,
**And** General adjacency, available destination, and the inherited summon rules still govern legality.

**Given** a unit occupying a hole,
**When** actions are predicted, resolved, serialized, and replayed,
**Then** location, selection, and action results agree without null-tile failures,
**And** ordinary-tile and legacy movement behavior is preserved.

### Story 2.5: Attack neutral Walls and open their tiles

As a player,
I want either side to damage and destroy neutral Walls,
So that I can open blocked routes and usable tiles.

**Requirements:** FR5, ordinary-unit Wall portion of FR6, FR9, FR10; UX-DR3, Wall portion of UX-DR6; NFR1-NFR5.
**Dependencies:** 2.2-2.4.
**Scope:** Separate terrain obstacle storage, neutral attackability, health, destruction, and ordinary movement blocking.

**Acceptance Criteria:**

**Given** a new replacement-map match,
**When** terrain setup completes,
**Then** exactly nine neutral Walls with 10 health exist at (0,1),(0,6),(1,3),(2,2),(2,6),(2,8),(3,4),(4,2),(4,7),
**And** the literal asymmetry at (2,8) is retained without adding a Wall at (2,0).

**Given** a living Wall and either player,
**When** an otherwise legal attack selects that Wall,
**Then** the Wall takes the resolved damage and its health/display update consistently,
**And** Bonechill Barrier assets provide visuals only, without its original statistics, ownership, or modifiers.

**Given** a living Wall,
**When** an ordinary unit attempts to cross or stop on its position,
**Then** SDK validation and movement previews reject the route or destination,
**And** the Wall is a terrain entity rather than a replacement mobile occupant.

**Given** damage that destroys a Wall,
**When** destruction resolves,
**Then** only the Wall obstacle is removed and the existing tile becomes available for ordinary movement and otherwise legal summoning,
**And** health and destruction round-trip through snapshots/replay without a second destruction or a missing underlying tile.

### Story 2.6: Share a Wall position and attack the correct target

As a player,
I want eligible units to occupy Walls with clear attack-target priority,
So that I can use special movement and attack the intended entity.

**Requirements:** Wall portion of FR6, FR7, FR9; UX-DR4, movement/target portion of UX-DR6; NFR1-NFR4.
**Dependencies:** 2.4, 2.5.

**Acceptance Criteria:**

**Given** a flying or phasing unit and a living Wall,
**When** otherwise legal movement crosses or ends on that position,
**Then** the move succeeds and the Wall and unit remain distinct entities at the coordinate,
**And** this movement permission does not change summon legality or ordinary-unit restrictions.

**Given** a Wall tile occupied by an enemy unit,
**When** a direct melee or ranged attack is requested against that tile or its Wall,
**Then** the enemy occupant is the resolved target instead of the Wall, subject to normal attack legality,
**And** UI preview, SDK validation, authoritative execution, AI, and replay agree; explicit Wall selection cannot bypass the priority.

**Given** a Wall tile occupied only by an allied unit, or a tile with an allied unit but no Wall,
**When** a direct melee or ranged attack is requested,
**Then** the former can target the neutral Wall when otherwise legal and the latter cannot attack the allied unit,
**And** allied occupants never receive direct friendly attacks.

**Given** a Wall and its enemy occupant within an eligible damaging area effect,
**When** area damage resolves,
**Then** both entities receive their applicable damage independently,
**And** the supporting Wall does not shield its occupant or absorb the occupant's damage.

**Given** allied units, enemy units, and neutral Walls within an eligible damaging area effect,
**When** its damage resolves,
**Then** allied units receive no damage from that effect while eligible enemies and Walls do,
**And** a Wall beneath an allied occupant can take damage independently without damaging that ally.

**Given** the co-located pair,
**When** either entity is removed through a legal action,
**Then** the other entity remains with its own identity and state,
**And** destroying the Wall retains the tile and surviving occupant.

**Given** co-located state,
**When** it is saved, restored, or replayed,
**Then** both identities, health values, and occupancy relationships survive,
**And** stale or inconsistent target information is rejected or revalidated through the documented attack-priority contract rather than silently damaging an unintended entity.

### Story 2.7: Apply Wall obstruction consistently to attacks and area effects

As a player,
I want Walls to block intervening attacks without shielding their own occupant,
So that previews and combat results follow the battlefield rules.

**Requirements:** FR3, FR8, FR16; attack/area portion of UX-DR6; NFR1-NFR4.
**Dependencies:** 2.2, 2.5, 2.6.

**Acceptance Criteria:**

**Given** a Wall between a source and an otherwise reachable target,
**When** a ranged attack or area effect is evaluated,
**Then** the target beyond the obstruction is blocked according to one documented shared hex obstruction policy,
**And** SDK resolution and UI previews use the same result.

**Given** a unit standing on a Wall with no other intervening blocker,
**When** an otherwise legal melee attack, ranged attack, or area effect targets it,
**Then** its supporting Wall does not block the effect against that unit,
**And** adding a different intervening Wall blocks the ranged attack or area effect as required.

**Given** a ranged attacker and an in-range target,
**When** attack legality is evaluated,
**Then** only targets on one of the six hex axes perpendicular to the attacker's tile edges are eligible,
**And** intermediate Wall cells block the attack while the target-supporting-Wall exception remains in force.

**Given** an area effect with explosion radius R,
**When** candidate targets and obstruction are computed,
**Then** candidates are within hex distance R of the explosion center, including off-axis positions, and each is checked by the direct center-to-target-center segment without detours,
**And** R describes explosion radius rather than caster-to-center distance.

**Given** such a segment and an intervening Wall,
**When** the segment intersects the Wall hex interior or touches only its boundary/vertex,
**Then** only the interior intersection blocks delivery,
**And** boundary-only/vertex-only contacts do not block, the target-supporting Wall is excluded, and odd/even rows, holes, prediction, server, Sandbox, and replay use the same results.
**Given** an eligible card effect, including Maw's nearby follow-up,
**When** its range, adjacency, or area targets are resolved on the replacement map,
**Then** it uses shared replacement geometry and applicable Wall obstruction,
**And** audited eligibility, no automatic counterattacks, and other inherited combat constraints remain intact.

### Story 2.8: Capture and retain Methron Points

As a player,
I want to capture, retain, and recapture Methron Points,
So that territory remains mine until the opponent takes it.

**Requirements:** FR11-FR13, capture portion of FR15; UX-DR5, ownership portion of UX-DR7; NFR1-NFR5.
**Dependencies:** 2.3-2.7.
**Scope:** Point placement, capture timing, ownership, visuals, and persistence; deficit damage follows in 2.9.

**Acceptance Criteria:**

**Given** a replacement-map match,
**When** objective setup completes,
**Then** five neutral Methron Points appear at (0,3),(0,5),(2,4),(4,3),(4,5) using tile_mana_idle,
**And** they grant no mana and are not consumed by capture or departure.

**Given** either player's unit on a point at either player's turn end,
**When** relevant turn-end effects resolve and the unit remains alive for capture,
**Then** the point becomes controlled by that unit's player,
**And** a unit killed before the capture phase does not capture.

**Given** a controlled point,
**When** its occupant leaves or a surviving opposing unit captures it,
**Then** empty ownership persists in the first case and ownership transfers in the second,
**And** neutral, player1, and player2 states remain distinguishable even without occupants.

**Given** a General instead of another unit,
**When** the same capture conditions apply,
**Then** it captures and recaptures normally without General-specific standing damage or effects,
**And** ownership round-trips and replays deterministically with no separate Heart entity.

### Story 2.9: Damage the disadvantaged General at both turn ends

As a player,
I want Methron control advantage to damage the opposing General,
So that retaining territory affects the match outcome.

**Requirements:** FR14-FR16; UX-DR7; NFR1-NFR4.
**Dependencies:** 2.8.

**Acceptance Criteria:**

**Given** either player's turn ends,
**When** the Methron phase runs,
**Then** captures are updated after relevant turn-end effects and before all five ownership states are counted,
**And** empty controlled points count toward their owner's total.

**Given** player control counts of 3 and 1,
**When** either player's turn ends,
**Then** the disadvantaged General takes 4 control damage,
**And** 2 versus 2 causes none and 5 versus 0 causes 10, irrespective of which player ended the turn.

**Given** a capture changes the advantage at turn end,
**When** damage is calculated,
**Then** the updated ownership determines the disadvantaged player and damage,
**And** a unit dying before capture cannot change ownership merely through its former presence.

**Given** a General stands on a point, or control damage is lethal,
**When** turn-end resolution runs,
**Then** standing itself adds no damage and lethal control damage uses existing General damage and match-end resolution,
**And** no Heart or additional victory condition is created.

**Given** the combined turn-end pipeline,
**When** the same turn is predicted, authoritatively resolved, saved, and replayed,
**Then** ownership, damage, and resulting match state agree,
**And** reserve transfer min(3,reserve) occurs exactly once for the ending player, point effects grant no mana, and fixed hands do not draw, refill, shift, or incur fatigue.

### Story 2.10: Face a Practice bot that makes legal terrain-aware actions

As a Practice player,
I want the bot to move, summon, and target legally on the new battlefield,
So that the opponent can complete turns without invalid map assumptions.

**Requirements:** FR17, FR3, FR16; NFR1-NFR3.
**Dependencies:** 2.2-2.9; existing Epic 1 valid entry/fixed bot roster prerequisite.
**Scope:** Legal action generation and execution, without requiring later tactical scoring improvements.

**Acceptance Criteria:**

**Given** the Practice bot considers a move, summon, or attack,
**When** candidates are generated,
**Then** shared SDK geometry and legality govern row bounds, six-neighbor paths, holes, Walls, movement types, General-adjacent summons, target identities, and applicable obstruction,
**And** square-grid offsets or coordinate-only target assumptions cannot admit an invalid candidate.

**Given** ordinary, flying, and phasing unit fixtures,
**When** bot candidates are evaluated,
**Then** ordinary movement avoids holes/living Walls and eligible special movement can cross or occupy them,
**And** no extra summon permission is inferred from movement permission.

**Given** a bot turn with no legal non-ending action,
**When** the bot selects its next action,
**Then** it can end the turn through the existing legal action flow,
**And** it does not repeatedly submit an invalid action or stall on unavailable coordinates.

**Given** each existing Practice difficulty,
**When** a replacement-map match starts and representative turns run,
**Then** the bot uses the approved General plus the exact eight-card roster and starts with all eight cards in stable hand slots,
**And** chosen actions validate authoritatively and replay with the same outcomes; roster substitution and new difficulty modes are not introduced.

### Story 2.11: Face a Practice bot that evaluates Walls and routes

As a Practice player,
I want the bot to understand destructible obstacles and distinct targets,
So that Walls create tactical decisions for both sides.

**Requirements:** FR18, FR17; NFR1-NFR3.
**Dependencies:** 2.10 and completed Wall behavior in 2.5-2.7.

**Acceptance Criteria:**

**Given** a candidate attack against a Wall,
**When** the bot simulates its result,
**Then** evaluation accounts for remaining Wall health and legal routes available after destruction,
**And** it does not treat an undestroyed Wall as an open ordinary-unit route.

**Given** otherwise equivalent choices where destroying a Wall opens a useful route and an alternative gains no combat or positional benefit,
**When** deterministic evaluation fixtures compare candidates,
**Then** the route-opening benefit is represented in the candidate score and can affect the chosen action,
**And** the scoring weights and fixture conditions are documented without requiring Wall attacks to override a winning move.

**Given** a Wall and an enemy unit at the same coordinate,
**When** the bot evaluates attacks,
**Then** it resolves direct attacks to the enemy occupant rather than offering a Wall-override candidate, and eligible area effects evaluate both entities independently,
**And** it accounts for intervening blocking and the supporting-Wall exception for ranged/area effects.

**Given** a hypothetical candidate state,
**When** route/attack evaluation finishes,
**Then** speculative Wall damage, destruction, and occupancy have not mutated the live match,
**And** executing the chosen action produces the shared SDK result predicted for that target.

### Story 2.12: Face a balanced Practice bot that competes for Methron control

As a Practice player,
I want the bot to contest and defend Methron Points,
So that territorial control is a meaningful tactical challenge.

**Requirements:** FR19, FR16, FR17; NFR1-NFR3.
**Dependencies:** 2.10, 2.11 and completed point behavior in 2.8-2.9.

**Acceptance Criteria:**

**Given** a candidate move, attack, or turn end that changes point occupation,
**When** the bot evaluates the resulting position,
**Then** it accounts for capture, recapture, persistent ownership of empty points, and the survival of the prospective capturer through relevant turn-end effects,
**And** leaving a point empty does not incorrectly lose its ownership.

**Given** a simulated turn end for either player,
**When** the bot estimates control damage,
**Then** it applies capture before counting and damages the disadvantaged General by 2 times the point-count difference,
**And** 3 versus 1 estimates 4 damage, equal counts estimate zero, and Generals have neither a capture penalty nor standing damage.

**Given** a controlled fixture with equally safe alternatives and no immediate winning attack,
**When** capturing or recapturing a point improves control damage compared with a neutral move,
**Then** the territorial advantage affects evaluation and the bot selects the advantageous option under deterministic fixture settings,
**And** a separate fixture verifies that defending a point and preserving its capturer's survival are valued when they prevent a worse control outcome.

**Given** a candidate using its General to capture or exposing its General to lethal damage,
**When** the bot compares choices,
**Then** General capture is evaluated using ordinary capture rules and existing survival/win considerations still apply,
**And** the evaluation does not blindly prefer territory over an immediate win or forced loss.

**Given** representative fixed-roster Practice positions across existing difficulties,
**When** the integrated bot completes turns,
**Then** actions remain legal and the resulting control/damage state matches authoritative execution and replay,
**And** map tactics do not change the fixed roster, reserve mana contract, stable hand slots, or card eligibility policy.

**Given** no immediate winning move or immediate defeat to avert,
**When** the Practice bot compares territorial and combat candidates,
**Then** it uses a balanced evaluation of expected control damage, enemy removal/General damage, and unit survival rather than an unconditional capture-first or attack-first rule,
**And** documented evaluation fixtures include a position favoring capture and a position favoring combat; numerical weights remain implementation tuning constrained by these behaviors.
## Story Coverage and Delivery Notes

| Requirement | Stories |
| --- | --- |
| FR1 | 2.1, 2.3 |
| FR2 | 2.2, 2.3 |
| FR3 | 2.2, 2.3, 2.7, 2.10 |
| FR4 | 2.3 |
| FR5 | 2.5 |
| FR6 | 2.4, 2.5, 2.6 |
| FR7 | 2.6 |
| FR8 | 2.7 |
| FR9 | 2.5, 2.6 |
| FR10 | 2.5 |
| FR11 | 2.8 |
| FR12 | 2.8 |
| FR13 | 2.8 |
| FR14 | 2.9 |
| FR15 | 2.8, 2.9 |
| FR16 | 2.1, 2.3, 2.7, 2.9, 2.10, 2.12 |
| FR17 | 2.10, 2.11, 2.12 |
| FR18 | 2.11 |
| FR19 | 2.12 |
| NFR1 | 2.2-2.12 |
| NFR2 | 2.1-2.12 |
| NFR3 | 2.1-2.3, 2.10-2.12; compatibility checks throughout |
| NFR4 | 2.3-2.9 |
| NFR5 | 2.1-2.3, 2.5, 2.8; shared existing architecture throughout |
| UX-DR1 | 2.3, 2.4 |
| UX-DR2 | 2.3 |
| UX-DR3 | 2.5 |
| UX-DR4 | 2.6 |
| UX-DR5 | 2.8 |
| UX-DR6 | 2.2-2.7 |
| UX-DR7 | 2.8, 2.9 |

User approved Story 2.1 explicitly and authorized automatic approval of all subsequent stories. The numbered story order uses only earlier Epic 2 capabilities and the stated Epic 1 baseline. Epic 1 baseline repair is verified; its Story 1.10 sprint handoff remains review. The baseline repair updated sprint records separately. Before replacement-map rollout, retain those verified contracts and integrate all twelve stories. This artifact does not implement code or update sprint tracking. Baseline test results and environment limits are recorded in epic-2-validation-2026-11-01.md; they do not verify the unimplemented Epic 2 gameplay.
