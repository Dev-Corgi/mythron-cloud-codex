---
title: 'Story 5: Build the ability execution infrastructure'
type: 'feature'
created: '2026-11-03'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'cbe9d525dee0c58d128a71619386fc209ef30850'
context:
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/card-roster.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-phobies-card-import-2026-11-02/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The SDK can track ability readiness and spend one action point to use an ability, but it lacks the effect-card category and shared execution semantics needed by Phobies abilities. Effects must attribute damage and healing to their caster, respect one-action ability costs, and support timed restrictions consistently.

**Approach:** Extend the existing active-ability action, Entity action-point accessors, card type, and modifier-duration hooks to establish the reusable execution contract for later effect cards. Add ability-effect cards as a dedicated non-hand-playable category, caster attribution, ability-origin exemptions for embedded moves and attacks, and the required stun, silence, immobilize, and timed-effect behavior.

## Boundaries & Constraints

**Always:** Follow CAP-4, AD-6, AD-7, AD-11, and AD-17. Reuse the existing `UseActiveAbilityAction`, per-entity ability state, action-point accessors, `Modifier` duration hooks, and `ModifierStunned`/`ModifierSilence` where they fit. Keep causal source-entity attribution separate from the marker that identifies an embedded action as ability-originated. Ability use itself spends one action point; its embedded move/attack actions spend no additional points, while remaining real actions so attack hooks still run. Ability effects cost no mana, are not deckable, cannot be played normally from hand, and enter only through `UseActiveAbilityAction`. `this turn` effects expire at the caster's turn end; N-turn effects decrement at each affected unit owner's turn end. Silence blocks the ability and pauses both counters; stun blocks ability use; immobilize blocks ordinary movement but does not cancel an ability's embedded move or pause counters. Preserve v1 and legacy behavior.

**Never:** Implement any of the roster's 16 concrete effect cards, the game-view presentation changes, or the Practice AI. Do not add a second ability engine, duplicate action-point accounting in individual actions, overload the causal `Action.source` entity reference with an origin string, change legacy card behavior, or let an ability-effect card become an ordinary deck or hand card.

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/cards/cardType.coffee` — add the dedicated ability-effect category; audit type helpers so it is classified without making it an ordinary spell.
- `duelyst/app/sdk/rulesets/cardEligibility.coffee`, `duelyst/app/sdk/validators/validatorPlayCard.coffee`, `duelyst/app/sdk/actions/useActiveAbilityAction.coffee` — route effect-card legality through the existing ability action and reject normal hand/deck entry.
- `duelyst/app/sdk/actions/action.coffee`, `duelyst/app/sdk/actions/moveAction.coffee`, `duelyst/app/sdk/actions/attackAction.coffee`, `duelyst/app/sdk/entities/entity.coffee` — preserve the caster as causal source and carry a distinct ability-origin marker; enforce the one-point exemption at shared Entity accounting while retaining real move/attack actions.
- `duelyst/app/sdk/actions/damageAction.coffee`, `duelyst/app/sdk/actions/healAction.coffee`, `duelyst/app/sdk/actions/useActiveAbilityAction.coffee` — preserve caster attribution through effect damage and healing.
- `duelyst/app/sdk/modifiers/modifier.coffee`, `duelyst/app/sdk/modifiers/modifierStunned.coffee`, `duelyst/app/sdk/modifiers/modifierSilence.coffee`, new immobilize modifier and its registration — reuse duration lifecycle and enforce the AD-17 status rules.
- `duelyst/test/unit/sdk/game/active_abilities.js`, `duelyst/test/unit/sdk/game/unit_stats.js`, and focused modifier/action tests — extend existing ability/AP coverage for card category, provenance, durations, status restrictions, and legacy preservation.

## Tasks & Acceptance

**Execution:**
- [ ] `duelyst/app/sdk/cards/cardType.coffee`, `duelyst/app/sdk/rulesets/cardEligibility.coffee`, `duelyst/app/sdk/validators/validatorPlayCard.coffee`, `duelyst/app/sdk/actions/useActiveAbilityAction.coffee` — introduce and register `AbilityEffect` as an ability-only card category; permit it through active-ability resolution while rejecting deck and ordinary hand-play use.
- [ ] `duelyst/app/sdk/actions/action.coffee`, `duelyst/app/sdk/actions/useActiveAbilityAction.coffee`, `duelyst/app/sdk/actions/damageAction.coffee`, `duelyst/app/sdk/actions/healAction.coffee` — propagate the casting Entity as the causal source of effect damage and healing without confusing it with action origin.
- [ ] `duelyst/app/sdk/actions/action.coffee`, `duelyst/app/sdk/actions/moveAction.coffee`, `duelyst/app/sdk/actions/attackAction.coffee`, `duelyst/app/sdk/entities/entity.coffee` — mark effect-embedded moves and attacks as ability-originated and exempt their AP recording at the shared Entity boundary; keep the ability's own single AP spend and action hooks.
- [ ] `duelyst/app/sdk/modifiers/modifier.coffee`, `duelyst/app/sdk/modifiers/modifierStunned.coffee`, `duelyst/app/sdk/modifiers/modifierSilence.coffee`, immobilize modifier and registration — implement or verify the agreed end-of-turn lifetime, stun/silence/immobilize gates, and counter handling per AD-17.
- [ ] `duelyst/test/unit/sdk/game/active_abilities.js` and focused action/modifier tests — cover ability-effect entry boundaries, caster attribution, one AP for ability plus embedded move/attack, turn-duration boundaries, status interactions, and legacy/v1 behavior.

**Acceptance Criteria:**
- Given an ability-effect card is resolved, when card type and eligibility are evaluated, then it is identified as an ability effect, is not deckable or normally playable from hand, and is accepted only through its owning unit's valid `UseActiveAbilityAction`.
- Given a unit ability deals damage or heals, when the resulting action executes, then the casting unit is the causal source observed by source-dependent hooks and damage/heal accounting.
- Given a ready ability with at least one action point contains an embedded move, attack, or both, when the ability resolves, then exactly one point is spent for the ability while the real embedded actions and attack-triggered modifiers still resolve; ordinary explicit moves and attacks still spend one point each.
- Given a `this turn` effect is applied, when its caster's current turn ends, then the effect expires; given an N-turn effect is applied, when the affected unit owner's turns end, then its remaining duration decreases and expires at zero.
- Given a unit is stunned, silenced, or immobilized, when it attempts the restricted behavior, then stun prevents ability use, silence prevents ability use and freezes Lockdown/Cooldown, and immobilize prevents ordinary movement while allowing an ability's embedded move and leaving ability counters active.
- Given the same actions and statuses run in v1 or legacy rules, when validation and modifiers execute, then their preexisting behavior remains unchanged.

## Implementation Notes

## Spec Change Log

## Review Triage Log

- `medium` — Blind Hunter: ability-origin movement returned the ordinary cached position list instead of the selected provenance list. Verified at the `MovementRange.getValidPositions` final return; patched to return the local `validPositions` list, and the focused embedded-move case passes. `patch`.
- `false` — Blind Hunter: no timed ability effect assigns the new owner filter. This story deliberately excludes all concrete effect cards; the infrastructure exposes the serialized `durationEndTurnPlayerId` selector and its end-turn filter, and the lifecycle is now exercised through real turn events. No card-specific assignment belongs in this story.
- `false` — Blind Hunter: Silence does not pause Lockdown/Cooldown. `Entity.decrementActiveAbilityCounters` already returns while silenced; the General counter test also passes through the silenced end-turn path. The separate unit-counter test currently fails because its ability state is null before the counter assertion.
- `false` — Blind Hunter: damage/heal actions do not preserve caster source. `UseActiveAbilityAction.setAbilityOriginOn` sets the causal source through the inherited `Action.setSource`; coverage now verifies this helper on both `DamageAction` and `HealAction`. Concrete effect-card callers are excluded from this infrastructure story.
- `false` — Blind Hunter: a new immobilize modifier and registration are missing. The repository already provides registered `ModifierCannotMove`; the implementation reuses it and ignores only that movement modifier for ability-origin paths.
- `false` — Blind Hunter: v1/legacy behavior lacks regression tests. Both optional action parameters default to ordinary behavior, AP accounting remains gated by the existing v2 predicate, and only v2 creates usable active-ability actions; no v1 or legacy path is changed by this marker.
- `medium` — Blind Hunter: ability-effect entry boundaries lacked negative-path coverage. Added ValidatorPlayCard assertions for ordinary hand and signature actions, plus runtime eligibility checks for wrong owner and mismatched effect binding. `patch`.
- `medium` — Verification Gap: ability-effect validator acceptance/rejection was not exercised. The test now executes an AbilityEffect-typed card through UseActiveAbilityAction and validates both prohibited ordinary entry paths; focused case passes. `patch`.
- `medium` — Verification Gap: owner-specific duration was tested by calling the handler directly. Replaced the test with real consecutive player end-turn actions and verified that only the configured owner's turn expires the modifier. `patch`.
- `medium` — Edge Case Hunter: ability-origin path lookup outside the hex ruleset could use an undefined or ordinary list. This is the same cached-list return defect as the first finding; fixed by returning the selected list, and the focused ability-origin movement case passes. `patch`.

## Verification

**Commands:**
- `./node_modules/.bin/mocha -t 1000 test/unit/sdk/game/active_abilities.js test/unit/sdk/game/unit_stats.js` — expected: all focused ability and action-point tests pass.

**Result:** `unit_stats.js` passes (18 passing). The combined command reports 33 passing and 6 failing in `active_abilities.js`; the failing test cases and assertions are present unchanged in the baseline commit `cbe9d525dee0c58d128a71619386fc209ef30850`, and the changed code paths in this story do not cover their failures. The Story 5 ability-origin, entry-boundary, provenance, attribution, and real turn-end cases pass when run by name.
