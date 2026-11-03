---
title: 'Story 11: Implement the movement and push actives'
type: 'feature'
created: '2026-11-03'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'ea7a852e301ba2948a5cb9a85e4d136b486a7084'
context:
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/card-roster.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-phobies-card-import-2026-11-02/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-duelyst-2026-10-30/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Cassowary, Rook, and Wild Tahr have movement and push actives that are not represented by the Phobies runtime-only effect cards.

**Approach:** Add Knucklestorm, Spiral Counter, and Koan of Horns effect cards. Resolve their movement, real attacks, dash path selection, and push using SDK actions and the shared AD-8 geometry path so the ability itself is the only action point charged.

## Boundaries & Constraints

**Always:** Follow CAP-4 and AD-6, AD-8, AD-11, and AD-17. Register effect ids 51012–51014 for units 50004, 50032, and 50020, with respective use ranges 2, 3, and 1 and roster Lockdown/Cooldown 0/1. Keep effects zero-cost, runtime-only, and owner-bound. Damage and movement resolve through real SDK attack/move actions with caster source and ability-origin provenance; each ability spends exactly one action point total and attacks trigger normal attack modifiers. Use axial positions and extend the shared resolver for dash path selection and push legality. Bull Rush's selected endpoint is unoccupied and exactly distance 3; among valid paths prefer the path crossing the most enemy Units, breaking remaining ties deterministically by the topology's fixed neighbor order. Play Smashface pushes its adjacent enemy one tile directly away when that destination is legal; the attack still resolves if the push is blocked. Use existing FX and sounds from the roster.

**Never:** Change ordinary movement/attack rules, legacy behavior, action-point policy, or other actives; duplicate geometry in card effects; replace real attacks with raw damage actions; or make effect cards deckable or hand-playable.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Caw Claw | Cassowary targets an enemy within 2 | Move at most one tile to a legal adjacent position, then perform its 425-damage melee attack; consume one point total | Reject target/range or move/attack combination with no legal resolution |
| Bull Rush | Rook chooses an unoccupied endpoint 3 tiles away | Traverse a legal 3-step path, preferring enemy Units over empty tiles; attack each enemy crossed for 550 and finish at the endpoint | Reject occupied/off-board endpoint or no valid path |
| Play Smashface | Wild Tahr attacks an adjacent enemy | Perform a 350-damage attack; push one tile directly away when legal; consume one point total | Damage still resolves when push destination is blocked or off-board |
| Attack hooks | Any active performs an attack | Attack actions preserve caster source and trigger attack-related modifiers | No extra action point for embedded attack/move |
| Card registration | Resolve each effect id and owner link | Correct skill name, text, FX/sfx, range/counters, runtime-only type and eligibility | Reject wrong owner and ordinary use |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/rulesets/hexAttackGeometry.coffee` — extend AD-8 with deterministic 3-step dash path selection and legal push destination checks; use shared axial topology and board obstruction methods.
- `duelyst/app/sdk/cards/factory/phobies/abilities.coffee` — add Phobies effect spell subclasses and action sequencing, reusing `MoveAction`, `AttackAction`, `TeleportAction` only where their semantics fit, `UseActiveAbilityAction.setAbilityOriginOn`, and existing skill card FX/sounds.
- `duelyst/app/sdk/cards/factory/phobies/neutral.coffee`, `duelyst/app/sdk/cards/cardsLookup.coffee` — link Cassowary 50004, Rook 50032, and Wild Tahr 50020 to unique ids and roster metadata.
- `duelyst/app/sdk/actions/attackAction.coffee`, `moveAction.coffee`, and `actionFactory.coffee` — preserve normal move/attack hooks and register a dedicated push action only if the existing action set has no equivalent.
- `duelyst/app/sdk/entities/entity.coffee`, `movementRange.coffee`, and `validators/validatorEntityAction.coffee` — ability-origin accessors already exempt embedded movement/attack from a second AP charge; keep ordinary checks unchanged.
- `duelyst/test/unit/sdk/game/active_abilities.js`, `hex_attack_geometry.js`, and `phobies_factory.js` — verify path choice, geometry, target and endpoint legality, push, AP accounting, attack hooks, source attribution, and card metadata.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/rulesets/hexAttackGeometry.coffee`, `actions` and `abilities.coffee` — implement deterministic Bull Rush pathing, legal push, and sequenced movement/attack effects using real actions.
- [x] `duelyst/app/sdk/cards/cardsLookup.coffee`, `neutral.coffee`, `abilities.coffee` — register and link the three effect cards with roster text, use ranges, cooldowns, FX, and sounds.
- [x] `duelyst/test/unit/sdk/game/active_abilities.js`, `hex_attack_geometry.js`, `phobies_factory.js` — cover path preference/ties, invalid paths, Caw Claw movement+attack, blocked/legal push, one-point accounting, attack hooks, and registration.

**Acceptance Criteria:**
- Given each ability has a legal target/path and at least one action point, when used, then Caw Claw moves and attacks, Bull Rush traverses its selected path and damages crossed enemies, and Play Smashface attacks then pushes when possible.
- Given an ability includes movement and/or attack, when it resolves, then exactly one point is spent for the ability while real embedded actions and attack-related modifiers resolve normally.
- Given an occupied or unreachable Bull Rush endpoint, illegal target, or unavailable ability, when validated, then no partial effect occurs.
- Given any push destination is blocked or off-board, when Play Smashface resolves, then the attack damage remains applied and the target stays in place.
- Given effect cards are resolved or offered for ordinary play, when eligibility runs, then only the exact owning unit may invoke them and ordinary deck/hand use is rejected.

## Implementation Notes

## Spec Change Log

## Review Triage Log
| Blind Hunter | PhobiesRaisingHell hits off-axis distance-two units | defer | This behavior is in Story 10's Raising Hell effect, outside Story 11's movement/push intent; tracked under Story 10. |
| Blind Hunter | Bull Rush moves onto a surviving enemy cell | false | The integration path test keeps crossed enemies alive and verifies Bull Rush reaches the selected endpoint; the claimed blocked step does not occur. |
| Blind Hunter | Bull Rush continues after an embedded action fails | medium / patch | A failed attack or move could leave later route steps executing; resolution now returns on invalid actions. |
| Blind Hunter | Caw Claw may move without a legal follow-up attack | false | Its candidate tile is adjacent to the chosen enemy, and ability-origin AttackAction resolves from that tile; no invalid combination is produced. |
| Blind Hunter | Smashface pushes after its caster dies during attack hooks | medium / patch | The old sequence checked only the target; it now requires both caster and target active before pushing. |
| Blind Hunter | PushAction leaves range caches stale | false | PushAction calls `updateCachedState()`, which flushes movement and attack range caches. |
| Blind Hunter | PushAction can push a non-adjacent target | false | The geometry helper requires attacker-target distance one, and validator permits the action only for the owning ability. |
| Blind Hunter | Self-destruct multi-target coverage is missing | defer | This is Story 10 Self Destruct/Gotcha behavior and outside Story 11's intent; tracked under Story 10. |
| Blind Hunter | Registration metadata assertions are missing | false | `phobies_factory.js` asserts owner binding, text, FX/sound, ranges, counters, type, cost, eligibility, animation, and portrait for all three cards. |
| Blind Hunter | No failed-action or unreachable-path tests | medium / patch | Bull Rush now stops on invalid embedded actions; an integration test covers a free distance-three endpoint with all routes blocked and unchanged board/AP. |
| Edge Case Hunter | Bull Rush cannot traverse a surviving enemy | false | The runtime Bull Rush test has a crossed enemy survive the 550 damage and confirms the route reaches its endpoint. |
| Verification Gap | No-route Bull Rush lacks an integration test | medium / patch | Added a blocked-route case asserting rejection, no movement or damage, and unchanged AP. |

## Design Notes

Bull Rush selects an endpoint, then the resolver searches all legal 3-edge routes to that endpoint. It ranks paths by number of enemy Unit cells crossed and uses the shared topology neighbor order to make ties stable. Attacks on crossed Units use `AttackAction`; after each tile, the route advances so damage and attack hooks remain observable. A legal push destination must be an on-board, unoccupied neighboring tile on the straight line continuing from attacker through target.

## Verification

**Commands:**
- `./node_modules/.bin/mocha -t 1000 test/unit/sdk/game/active_abilities.js test/unit/sdk/game/hex_attack_geometry.js test/unit/sdk/cards/phobies_factory.js` — expected: Story 11 focused behavior and geometry cases pass; report unrelated Story 5/10 failures separately.
- `./node_modules/.bin/coffeelint app/sdk/cards/factory/phobies/abilities.coffee app/sdk/cards/factory/phobies/neutral.coffee app/sdk/cards/cardsLookup.coffee app/sdk/rulesets/hexAttackGeometry.coffee` — expected: no CoffeeScript lint errors.
- `./node_modules/.bin/eslint --quiet test/unit/sdk/game/active_abilities.js test/unit/sdk/game/hex_attack_geometry.js test/unit/sdk/cards/phobies_factory.js` — expected: no JavaScript lint errors.
