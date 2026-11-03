---
title: 'Story 9: Implement the damage, heal, buff, and debuff actives'
type: 'feature'
created: '2026-11-03'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'd70ccd286f48b108305b99001fc6ade67529faba'
context:
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/card-roster.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-phobies-card-import-2026-11-02/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Seven imported Phobies units have damage, healing, Attack-buff, and Attack-debuff actives that are not yet represented by runtime-only ability cards.

**Approach:** Add seven ability-effect cards using existing damage, heal, and modifier spell behavior where it fits, link each card to its owning unit with the roster's range, Lockdown, and Cooldown, and declare the existing Duelyst FX and sounds. Ability resolution remains on the Story 5 `UseActiveAbilityAction` path.

## Boundaries & Constraints

**Always:** Follow CAP-4, AD-11, AD-14, AD-15, AD-16 and AD-17. Ability effects are zero-cost `AbilityEffect` cards; they are neither deckable nor playable normally and resolve only through their exact owning unit in v2. Keep caster source attribution for damage/healing. Damage and Attack debuffs may target enemy units including Generals; healing and Attack buffs target friendly minions only. Preserve roster values and effect text: Monty 450 damage/range 2; Pure Adrenaline heal 1500/range 1; Group Hug heal 1100 to adjacent friendly minions/range 1; I feel great! heal 650 and +300 Attack this turn/range 1; Clang! Clang! and Helping Hand +300 Attack this turn/range 2; Peek-a-booOO! -300 Attack for 2 turns/range 2. Use Lockdown/Cooldown respectively: 0/1, 0/3, 1/3, 0/1, 1/2, 0/2, 1/2. Ignore poison and Undead restrictions as specified by the roster. Ability card names use the associated Duelyst skill names.

**Never:** Change general ruleset constants, generic spell behavior, legacy card definitions, ability action accounting, Story 6 presentation routing, or implement other active effects. Do not add these effect cards to the deckable list.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Monty | Flameblood Warlock targets an enemy unit or General within 2 | Deal 450 damage sourced to the caster | Reject allies/out-of-range targets |
| Group Hug | Zurael uses ability | Heal each adjacent friendly minion 1100; do not affect caster unless another valid adjacent target | Reject enemy, General, and non-adjacent targets |
| Friendly targeted effects | Heal/buff ability targets | Only friendly minions receive its stated heal/buff; temporary buffs expire at caster's turn end | Reject enemy/General targets |
| Peek-a-booOO! | Lightbender targets an enemy unit or General | Apply -300 Attack for 2 affected-owner end turns | Reject allies/out-of-range targets |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/cards/factory/phobies/neutral.coffee` — unit definitions 50005, 50014, 50016, 50017, 50024, 50026 and 50031; attach `activeAbility` metadata without disturbing existing stats or passives.
- `duelyst/app/sdk/cards/cardsLookup.coffee`, `duelyst/app/sdk/cards/cardFactory.coffee`, and a Phobies ability factory — reserve unique effect ids, resolve effect cards, and preserve the existing unit factory path.
- `duelyst/app/sdk/spells/spellDamage.coffee`, `spellHeal.coffee`, `spellApplyModifiers.coffee` and `duelyst/app/sdk/actions/useActiveAbilityAction.coffee` — reuse existing spell resolution and caster attribution; add Phobies-specific spell subclasses only where source attribution or area healing requires it.
- `duelyst/app/sdk/modifiers/modifier.coffee` — existing `durationEndTurn` and `durationEndTurnPlayerId` lifecycle supports temporary Attack changes; do not alter generic duration behavior.
- `duelyst/test/unit/sdk/game/active_abilities.js` and `duelyst/test/unit/sdk/cards/phobies_factory.js` — extend binding, target, source, effect value, cooldown/range, and legacy/deckability coverage.
- `card-roster.md` Active ability FX/SFX tables — exact existing caster/target resources and `apply` sounds; confirm resources against card factories and preserve client-side-only presentation.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/cards/cardsLookup.coffee`, `duelyst/app/sdk/cards/cardFactory.coffee`, `duelyst/app/sdk/cards/factory/phobies/abilities.coffee` — register seven unique runtime-only effect cards with the correct skill names, descriptions, spell behavior, FX, sounds, and zero mana cost.
- [x] `duelyst/app/sdk/cards/factory/phobies/neutral.coffee` — attach the seven effect ids and exact range/lockdown/cooldown metadata to their roster units.
- [x] `duelyst/test/unit/sdk/game/active_abilities.js`, `duelyst/test/unit/sdk/cards/phobies_factory.js` — verify ownership binding, no ordinary entry/deckability, target classes and ranges, applied values/durations, caster attribution, and per-unit metadata.

**Acceptance Criteria:**
- Given each of the seven units is on board in v2, when its active is resolved through `UseActiveAbilityAction`, then its correct zero-cost AbilityEffect card applies the roster effect to valid targets in range and uses the casting unit as damage/heal source.
- Given an invalid owner, target class, range, ordinary hand-play, or deck-choice is attempted, when eligibility or validation runs, then the effect is rejected and no effect occurs.
- Given temporary buffs/debuffs are applied, when their specified owner's end turns elapse, then the Attack modifier expires after one or two turns as specified.
- Given the effect resolves in-game, when its presentation plays, then the roster's existing caster/target FX and apply sound are used without changing action outcomes.

## Implementation Notes

AD-13 confirms Story 9 adds no ruleset numeric constants; its numeric values are effect data, not rules configuration.

## Spec Change Log

## Review Triage Log

- **false — duplicate healing through `SpellHeal` superclass (Blind Hunter):** `PhobiesAbilityHeal.onApplyEffectToBoardTile` does not call `super`; it executes one custom `HealAction`, so there is no inherited heal to duplicate.
- **false — missing caster source after removing an inherited heal (Blind Hunter):** the custom `HealAction` sets its source to the active-ability caster before execution; the premise that the inherited action must be removed is disproved by the implementation.
- **defer — non-action-point ability movement (Blind Hunter):** `Entity.getCanMove`'s non-action-point branch uses ordinary speed. That behavior belongs to the pre-existing Story 5 infrastructure changes in the dirty checkout, not Story 9; follow up in deferred work.
- **false — unsupported future ability filter (Blind Hunter):** all seven current effect cards use the explicit friendly/enemy target rules in `PhobiesAbilityHeal` or `PhobiesAbilityModifier`; no changed Story 9 card configures an unhandled third filter class.
- **patch — exact healing and duplicate detection (Blind Hunter):** current single-target and area-heal tests use targets whose missing Health is below the full heal amount, so they cannot establish the roster values; add runtime assertions with enough missing Health to observe 650, 1,500, and 1,100 once.
- **patch — Clang! Clang! and Helping Hand runtime buffs (Blind Hunter, Verification Gap):** factory values are asserted, but neither effect is resolved on a friendly minion; add runtime assertions for +300 Attack and the one-turn duration on both cards.
- **patch — Pure Adrenaline runtime behavior (Blind Hunter):** add a 1,500-health heal assertion and reject a General target, since current healing execution coverage uses I feel great! only.
- **patch — Group Hug multiple neighbors (Blind Hunter):** current coverage heals only one adjacent minion; add a second adjacent friendly minion and assert both receive the full heal while caster and enemies remain unchanged.
- **patch — target range and class rejection (Blind Hunter):** current runtime coverage omits invalid enemy targets for both friendly buff cards, an ally for Peek-a-booOO!, and out-of-range targets for the range-1/range-2 friendly abilities; add focused rejection cases.
- **patch — effect-card metadata and presentation assertions (Blind Hunter):** factory tests do not yet assert every card's exact description, FX resources, apply sound, and copied skill-card animation/portrait; add these table-driven assertions.
- Reused each Duelyst skill spell's base animation and portrait on its linked ability-effect card, while keeping the Phobies effect id, text, and runtime-only type. Peek-a-booOO! uses the roster's existing `DropLift` caster FX and `Polarity` target FX.

## Design Notes

Group Hug is centered on its caster, affecting only neighboring friendly minions; it does not prompt the player to choose a different center. A single effect card may be linked from more than one unit (Flash Reincarnation's card name) only if its behavior is identical; otherwise keep unique effect IDs and link each owner explicitly.

## Verification

**Commands:**
- `./node_modules/.bin/mocha -t 1000 test/unit/sdk/game/active_abilities.js test/unit/sdk/cards/phobies_factory.js` — expected: all focused effect, linkage, and factory tests pass.
- `./node_modules/.bin/coffeelint app/sdk/cards/factory/phobies/abilities.coffee app/sdk/cards/factory/phobies/neutral.coffee app/sdk/cards/cardFactory.coffee app/sdk/cards/cardsLookup.coffee` — expected: no CoffeeScript lint errors.
- `./node_modules/.bin/eslint --quiet test/unit/sdk/game/active_abilities.js test/unit/sdk/cards/phobies_factory.js` — expected: no JavaScript lint errors.
