---
title: 'Story 5: Build the hand-slot active ability structure'
type: 'feature'
created: '2026-11-02'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'be5f9a134cf1fc286300eb113cb1fbdc3645e8a3'
context:
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Cards have no per-unit active ability lifecycle, so a living unit cannot grant a spell-like hand-slot ability with persistent Lockdown and Cooldown. General Bloodbound Spells also still use the legacy ready toggle instead of the active-ability counters required in Practice and Sandbox.

**Approach:** Add generic per-card ability definitions and per-instance counter state, then connect them to unit deployment, fixed hand slots, spell effect execution, action points, owner-turn countdown, silence, and death. Add the Phoenix Fire placeholder to Planar Scout and adapt each general's Bloodbound Spell in its existing dedicated slot.

**Boundaries & Constraints**

**Always:** Enable this behavior only in Practice/Sandbox (`practice-sandbox-hex` version 2); other modes retain current cards and Bloodbound behavior. Ability definitions identify an existing spell effect and its target range, plus base Lockdown and Cooldown; defaults are 0 and 1, and Cooldown is at least 1. On deployment, Lockdown starts at its base and Cooldown at 0. Both counters gate use; use spends 1 AP, no mana, and resets Cooldown to its base. At the end of its owner's turn each nonzero counter drops by one to a floor of zero. A hand-slot ability occupies the summoning unit's original slot, remains associated with that unit while it lives on the field, and empties on death. Silence disables use but preserves the counters; removing silence restores use. Planar Scout grants Phoenix Fire with Lockdown 1/Cooldown 1. Each General's Bloodbound Spell is represented as an ability with Lockdown 2/Cooldown 2 and no mana cost in its dedicated slot; its initial countdown begins at match start.

**Never:** Add card UI or detail-view changes (Story 6/7); shift or add hand slots; create new spell effects; expose AP or ability counters outside the active ability state; alter mana/costs or signature-card behavior outside Practice/Sandbox; discard a silenced ability's counters; leave ability use available when its granting unit is dead or absent.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| PLACEHOLDER | Planar Scout with Phoenix Fire, L1/C1, enters play | Its source hand slot presents the ability data with lockdown 1, cooldown 0; after its owner's end turn it is ready | Not usable while either counter is nonzero |
| USE | Living unsilenced ability owner, both counters 0, at least 1 AP | Existing spell effect resolves with its own target rules; costs 1 AP and no mana; cooldown becomes base | Invalid target, silence, dead/missing owner, or zero AP rejects use without consuming state |
| COOLDOWN | Used ability with base cooldown N | At each owner end turn, cooldown decreases by 1 to floor 0; opponents' turns do not change it | Cannot use until both counters are 0 |
| HAND_SLOT | Unit is played from hand slot N and remains alive | Ability is associated with N without moving any other card; death clears it | A dead or removed unit cannot retain a usable slot ability |
| SILENCE | Ability owner is silenced, counters are nonzero or zero | Ability remains associated and counters unchanged, but use is disabled; silence removal re-enables it | No counter reset on either transition |
| BLOODBOUND | General at match start; dedicated BBS slot selected | General ability has L2/C2, no mana cost, uses 1 AP, and reuses its current BBS effect | Legacy BBS flow and costs remain unchanged outside v2 |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/entities/entity.coffee`, `duelyst/app/sdk/entities/unit.coffee` -- Story 4 AP API and summon exhaustion; attach serializable ability instance state to the owning unit and initialize it at board entry.
- `duelyst/app/sdk/cards/card.coffee` and card factories under `duelyst/app/sdk/cards/factory/` -- card data cloning/serialization and definitions; Planar Scout is in `factory/core/neutral.coffee`, Phoenix Fire in `factory/core/faction2.coffee`.
- `duelyst/app/sdk/player.coffee`, `duelyst/app/sdk/gameSession.coffee` -- dedicated signature-card slot and end/start-turn lifecycle; reuse the signature effect data while keeping ability counters distinct from legacy ready toggles.
- `duelyst/app/sdk/actions/playCardFromHandAction.coffee`, `playCardAction.coffee`, `playSignatureCardAction.coffee` and `duelyst/app/sdk/validators/validatorPlayCard.coffee` -- hand-slot selection, spell resolution, and validation; active abilities need a validated no-mana path that preserves fixed slots and AP charging.
- `duelyst/app/sdk/modifiers/modifierSilence.coffee`, `duelyst/app/sdk/modifiers/modifier.coffee` -- silence lifecycle and modifier cleanup; keep counters outside ordinary removable modifiers.
- `duelyst/test/unit/sdk/game/` -- add focused ability state, lifecycle, action, compatibility, and Bloodbound tests alongside existing game/action suites.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/entities/entity.coffee`, `duelyst/app/sdk/entities/unit.coffee`, `duelyst/app/sdk/cards/card.coffee` -- add generic ability definition and serialized per-instance Lockdown/Cooldown/slot state; initialize from card data at deployment.
- [x] `duelyst/app/sdk/actions/`, `duelyst/app/sdk/validators/validatorPlayCard.coffee` -- implement ability-use action and validation with spell target rules, silence/death/readiness gates, one AP, and zero mana.
- [x] `duelyst/app/sdk/gameSession.coffee`, `duelyst/app/sdk/player.coffee` -- associate/clear the unit ability's original hand slot and decrement counters at the owner's end turn only.
- [x] `duelyst/app/sdk/cards/factory/core/neutral.coffee`, `duelyst/app/sdk/cards/factory/core/` faction definitions and signature-card handling -- configure Planar Scout and each General's Bloodbound Spell for v2 while preserving all other modes.
- [x] `duelyst/test/unit/sdk/game/` -- verify defaults, initialization, use/refusal, AP and mana, countdown boundaries, fixed slot, silence/death, BBS, serialization, and legacy behavior.

**Acceptance Criteria:**
- Given an ability owner enters play, when ability state initializes, then its base Lockdown and zero Cooldown are serialized with the card instance.
- Given a living, unsilenced ability is ready and has AP, when used on a valid target, then its spell effect resolves, 1 AP is spent, no mana is spent, and cooldown resets to base.
- Given either counter is positive, the unit is silenced/dead, the target is invalid, or AP is zero, when use is attempted, then it is rejected without consuming ability state or resources.
- Given an ability counter is positive, when its owner's turn ends, then that counter decreases by one to zero; opponent turns do not decrement it.
- Given a unit is played into hand slot N, when it is alive, silenced, unsilenced, or killed, then ability display data stays bound to N, silence preserves counters, and death clears the slot.
- Given a Practice/Sandbox v2 match, when Planar Scout or a General is inspected through SDK state, then its ability metadata and counters match the Phoenix Fire L1/C1 or Bloodbound L2/C2 contract.
- Given a legacy, v1, or other-mode match, when a spell or Bloodbound Spell is used, then existing costs, readiness, and behavior are unchanged.

## Implementation Notes

- Active ability state is serialized with each entity; hand-slot lookup resolves only living board entities. Active ability and signature spell uses are restricted to Practice/Sandbox v2.
- Signature card data is copied before v2 ability metadata and zero mana cost are applied, preserving the General's source data for legacy modes.

## Verification

**Commands:**
- `cd duelyst && ./node_modules/.bin/mocha -t 1000 test/unit/sdk/game/active_abilities.js test/unit/sdk/game/game_active.js test/unit/sdk/game/actions_validators.js test/unit/sdk/game/unit_stats.js` -- 25 passing.
- `git diff --check` -- passed (only Git line-ending notices).

## Review Triage Log

| Finding | Verdict and evidence | Route |
| --- | --- | --- |
| Validator explicit-action branch indentation could detach the new action type. | **false** — it is part of the same `if / else if` chain as the neighboring action checks and the CoffeeScript suite loads and executes it. | rejected |
| Reconstructed on-board entities could lose active ability state. | **false** — `activeAbilityState` is included in entity cloning and copy keys, and the entity serializer already preserves the corresponding instance fields. | rejected |
| An ability initialized without a hand index cannot be found in a slot. | **false** — the implemented granting card is played from hand and supplies its source hand index; no current definition grants an ability through a deployment without a hand slot. | rejected |
| Removing a living unit during movement could clear its ability. | **false** — movement updates the unit location without `removeCardFromBoard`; that removal path represents leaving the board, including death or transformation. | rejected |
| A failed spell application could consume AP and cooldown. | **false** — validation checks spell type and target before execution, and runtime eligibility checks the effect card against the source ability before `_execute` spends resources. | rejected |
| Signature metadata could mutate shared General card data and leak a zero cost to legacy behavior. | **medium** — the General returns its source data object, so direct metadata assignment could persist. Player signature data now copies the source object and ability metadata before applying v2 changes. | patch, fixed |
| Test coverage does not cover every general or legacy signature use. | **false** — this is a coverage suggestion without evidence of incorrect behavior; existing legacy signature flow remains unchanged, and the signature action tests verify the general v2 route. | rejected |
| Signature Cooldown decrement was not verified across owner and opponent turns. | **medium** — prior tests stopped immediately after setting Cooldown to 2, so removal of its end-turn decrement would pass. Added assertions for owner decrement, opponent stability, and the zero floor. | patch, fixed |

