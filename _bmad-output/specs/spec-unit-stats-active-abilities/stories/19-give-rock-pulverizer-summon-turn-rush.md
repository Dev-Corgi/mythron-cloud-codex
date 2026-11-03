---
title: 'Story 19: Give Rock Pulverizer summon-turn Rush'
type: 'feature'
created: '2026-11-03'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/stories/18-restore-duelyst-move-then-attack-action-model.md'
---

## Intent

**Problem:** Rock Pulverizer currently has the Phobies active ability mapped to effect card 51012 (`move_and_strike`). Its replacement is a focused summon-turn passive under the restored Duelyst action sequence.

**Approach:** Remove Rock Pulverizer's active-ability assignment and grant it Rush so that it starts ready on the summon turn and can move once, then attack once. Preserve its stats and Lifegain.

## Boundaries & Constraints

**Always:** Depends on Story 18. Scope the card change to Phobies card 50004 (Rock Pulverizer, mapped from Duelyst card 19026). Its stats, mana cost, and Lifegain stay unchanged. No other card receives this passive. Retire the `move_and_strike` implementation/data only if no other card references it.

**Never:** Keep effect card 51012 as Rock Pulverizer's active ability; grant an extra attack, multiple moves, or another effect beyond move-then-attack access on the summon turn.

## Code Map

- `duelyst/app/sdk/cards/factory/phobies/neutral.coffee` -- `ACTIVE_ABILITY_BY_CARD_ID[50004]`, roster entry, and passive assignment.
- Phobies card-description/localization source -- describe Rush and the summon-turn move-then-attack behavior.
- `duelyst/app/sdk/modifiers/modifierFirstBlood.coffee` and relevant summon/exhaustion paths -- determine whether the existing Rush modifier provides the requested semantics or needs a Phobies-specific passive.
- `duelyst/test/unit/sdk/game/active_abilities.js`, unit/card tests, and card-description tests -- removal and behavior coverage.

## Acceptance Criteria

- Given Rock Pulverizer card 50004 is created, when its card data is inspected, then it has no active ability definition for effect 51012 and its attack, health, mana, speed, movement type, and Lifegain are unchanged.
- Given no other card references effect card 51012, when the Rock Pulverizer assignment is removed, then the `move_and_strike` effect implementation/data is retired; if another card references it, that shared use remains intact.
- Given Rock Pulverizer is summoned in Practice/Sandbox v2, when its summon resolves, then it is not exhausted and can move once and then attack once during that turn.
- Given Rock Pulverizer attacks before moving or completes its move-then-attack sequence, when another action is attempted, then the regular Story 18 restrictions apply.
- Given an ordinary unit without Rush is summoned, when compared with Rock Pulverizer, then it remains exhausted until its owner's next turn start.
- Given the card data is inspected, when Rush assignments are counted, then Rock Pulverizer is the only card assigned this passive; how this uniqueness rule relates to existing original Duelyst Rush cards remains open.
- Given Rock Pulverizer is shown in game or card detail, when its rules text is displayed, then it describes Rush and no longer shows the removed active ability.
- Given card behavior tests run, when they cover summon readiness, move-then-attack, normal exhaustion, unchanged stats/Lifegain, and ability removal, then the outcomes match this contract.

## Open Questions

- Existing original Duelyst cards also use `ModifierFirstBlood`/Rush. The request does not say whether “no other card has Rush” means only the Phobies roster or every card in the game.
