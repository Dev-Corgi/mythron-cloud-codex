# Rubric review - ARCHITECTURE-SPINE.md (updated 2026-11-02)

Reviewer: independent rubric walker. Spine not edited.

## Verdict

Sound and mostly enforceable for the original five CAPs and the new stats/ability decisions, but not yet complete: the Map spec's Methron Points and Walls, movement-terrain permissions, and the operational/rollout dimension have no owning AD, and AD-4/AD-6/AD-7 leave a few real divergence points.

## Findings

### High

1. **No AD owns Methron Points or Walls (AD-2/AD-3/AD-8, capability map).** Map CAP-3 (neutral/p1/p2 ownership, capture before deficit damage, 2 x deficit to the General, recapture, persistence across turns, serialization and replay) and the Wall entity (neutral, 10 HP, Bonechill visuals only, destroyed leaves ordinary tile) are mapped to "AD-1, AD-2, AD-3, AD-8" but none of these decides them. AD-3 says turn-end changes occur "only inside p_endTurn" (reserve transfer and counters) with everything else by an SDK action, so the ordering of reserve transfer, capture, deficit damage, counter decrement and `end_turn` publication is undefined. The repo already has `captureMethronPointAction.coffee` and `resolveMethronPointControlDamageAction.coffee`; the spine does not ratify them. AD-3 also says setup "omits bonus mana tiles" while Methron reuses `tile_mana_idle`; state that Methron is not the mana tile. Add an AD: ownership state location, explicit actions, ordering at turn end, who is the damage source, replay determinism.

2. **Movement-terrain permissions and direct-target priority have no owner (AD-6, AD-8).** Fly/phase/walk crossing and stopping on holes, Walls and enemy units, and the enemy-occupant priority for direct melee/ranged attacks (previews, AI, replay), are specified only in the specs. AD-8 covers only area/ranged obstruction. AD-6 says modifiers and validators "never branch on ruleset version," yet Flying must now be blocked by enemy units in v2 (the spec's change from legacy) and holes/Walls only exist in v2; the version gate point for pathing is unnamed, so the rule is unenforceable as written. Also: the segment-versus-hex-interior test needs continuous hex geometry, which "shared topology" (AD-2) does not obviously provide; name the owner.

3. **v2 axial mapping undefined (AD-2).** AD-2 defers v2 footprint to `map-layout.md`, which is in (row,column) with odd-row half shift and gives no `{q,r}` mapping, no v2 axial start cells, and no hole/Wall/Methron coordinates in `{q,r}`. Two builders can pick different (row,col) to `{q,r}` conversions. Fix by fixing the mapping formula (odd-row offset to axial) in AD-2. Also state that the six axial deltas apply to v2 (it currently reads as v1-scoped). Core CAP-1 (45 cells) is superseded for v2 and the capability map does not say so.

4. **Operations/deployment dimension is only a one-line deferral.** "No infrastructure component" is true but skips: rollout/cutover mechanism for "after rollout" (flag or switch), in-flight and saved v1 matches across deploy, browser-vs-server SDK version skew (shared `app/sdk` means a stale client could run a v2 match), indefinite retention and regression testing of the v1 execution path, logging/metrics for ruleset-rejection paths, and the deck-purpose persistence contract (field name, default `legacy`, migration) which AD-4 leaves to "existing patterns." Decide or explicitly defer each.

### Medium

5. **AD-7 vs AD-4 and the Spec (hand slot).** AD-4 forbids later hand additions and encodes spent slots as `null`; AD-7 has an ability appear in the unit's emptied slot. Say the slot stays `null` in deck data and the ability is a view over `activeAbilityState`. AD-7 requires a "fixed hand-slot index" on the General's state, but the spec puts Bloodbound in its dedicated slot, not a hand slot (make the index nullable). AD-7 omits "no mana cost" and whether counters decrement while silenced (spec: "keeps its counters").

6. **AD-6 exhausted vs action points.** The spec says exhausted = 0 AP; AD-6 does not say whether `exhausted` becomes derived (otherwise two budget models remain). Where AP refresh happens (turn start) is unnamed. AD-5's audit list omits action-granting modifiers (Rush, Celerity, Frenzy, Blast and similar) and ability effect spells (Phoenix Fire) for hex/allowlist compliance.

7. **AD-1 vs the map spec versioning paragraph.** AD-1 is consistent that v2 is one package with entry-path selection, no player choice and v1 untouched, but it widens v2 to include stats, action points and abilities, whereas the map spec says v2 binds the battlefield and ranged/area/target-priority rules. Align the map spec text or note the widening. Lobbed is in AD-8 but missing from AD-6's attack-type list.

8. **Stats CAP-5 (card UI wiring, detail view) has an AD row but no deciding AD, and is not in Deferred.** The map lists AD-7 for it. Defer explicitly or add a convention (layered assets per layout JSON, view reads from `Entity` accessors).

### Low

9. AD-2/AD-1 consistency with the map spec's "supersedes the architecture" statement: no contradiction. Deferring the v2 board to `map-layout.md` matches the supersession, and the spec's "preserve the existing coordinate system" matches AD-2's `{q,r}` retention. The only gap is item 3.
10. No dependency-direction diagram (the template asks for one; the current flowchart is a data flow). No Stack table (acceptable for brownfield, but name CoffeeScript/Firebase and SDK as ratified). No parent spine is declared, so no inherited-AD conflict was found.

## Checklist summary

| Check | Result |
| --- | --- |
| Real divergence points fixed | Partial (items 1-3, 5-6) |
| Rules enforceable | AD-1, AD-3, AD-4, AD-7, AD-8 mostly yes; AD-6 gate unnamed |
| Deferred cannot diverge units | Mostly; deck persistence contract (item 4) |
| Named tech verified | None newly named; helper `Rulesets.isPracticeSandboxV2` confirmed in repo |
| Brownfield ratified | Partial; Methron actions exist in code but are not ratified |
| Spec CAPs mapped | Core 1-5 yes; Map CAP-3/4 mapped only nominally; Stats CAP-1/2 terrain, CAP-5 weak |
| Ops/deployment | Gap |
