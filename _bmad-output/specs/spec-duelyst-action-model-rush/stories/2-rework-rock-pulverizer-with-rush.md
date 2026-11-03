---
title: 'Story 2: Rework Rock Pulverizer with Rush'
type: 'feature'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/specs/spec-duelyst-action-model-rush/SPEC.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-action-model-rush-2026-11-03/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/specs/spec-duelyst-action-model-rush/stories/1-restore-the-duelyst-move-then-attack-action-model.md'
---

## Intent

**Problem:** Rock Pulverizer (Cassowary) has the `move_and_strike` active ability, which no longer fits the restored action model.

**Approach:** Remove that ability and give it Rush: the turn it is summoned it is not exhausted and may move then attack. Nothing else changes. Depends on story 1. Implementation only; this spec run changed no code.

## Boundaries & Constraints

**Always:** Stats and Lifegain unchanged. Rush removes only the default summon exhaustion (stun and other exhaustion sources still apply) and has no effect beyond summon-turn move-then-attack under story 1's rules. No other card gets Rush. Retire `move_and_strike` only if no other card uses it.

**Never:** Keep Rock Pulverizer's active ability; grant extra attacks, extra moves, or other effects; alter other cards.

## Code Map (starting points; verify against the repo)

- Phobies roster/factory data (`duelyst/app/sdk/cards/factory/phobies/`) -- Rock Pulverizer entry and active-ability mapping to effect 51012.
- Card description/localization source -- Rush text.
- Existing Rush/First Blood modifier and summon-exhaustion path -- decide whether to reuse or add a Phobies-specific passive.
- `duelyst/test/unit/` card and active-ability tests.

## Acceptance Criteria

- Given Rock Pulverizer's card data, then it has no active ability and its attack, health, mana, movement and Lifegain are unchanged.
- Given Rock Pulverizer is summoned, then it is not exhausted and can move then attack that turn.
- Given it has attacked or finished move-then-attack, then story 1 restrictions block further actions.
- Given an ordinary unit is summoned, then it stays exhausted until its owner's next turn start.
- Given all card data, then Rock Pulverizer is the only card with this Rush passive within the Phobies roster; original Duelyst Rush cards are unchanged (assumption).
- Given no other card uses `move_and_strike`, then its effect data is retired; otherwise the shared use is intact.
- Given the card is shown in game or card detail, then the text describes Rush and shows no removed ability.
- Given Rock Pulverizer is stunned or its exhaustion state was copied by a transform, then Rush does not clear the stun or override the copied state.
- Given effect 51012 is retired, then every reference is gone or updated first: effect factory entry, `validatorEntityAction` movement-attack id list, AI card-intent data, `PhobiesCollectionCardVisual`, `abilities.coffee`, `cardsLookup` and tests.
- Given tests, then they cover summon readiness, move-then-attack, normal exhaustion, unchanged stats/Lifegain, and ability removal.

## Assumptions

- "No other card has Rush" means the Phobies roster only.

