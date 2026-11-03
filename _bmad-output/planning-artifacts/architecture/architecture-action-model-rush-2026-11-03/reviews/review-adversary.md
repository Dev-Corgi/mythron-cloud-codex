# Adversary review: Action Model and Rush spine

Verdict: NOT READY as final. The ADs name the right direction but leave five seams where two compliant implementers diverge. Closing them takes tightened ADs, not redesign.

Evidence base: `app/sdk/entities/entity.coffee` (~498-660), `actions/useActiveAbilityAction.coffee`, `actions/setExhaustionAction.coffee`, `modifiers/modifierTransformed.coffee`, `modifiers/modifierFirstBlood.coffee`, `validators/validatorEntityAction.coffee`, `validators/validatorPlayCard.coffee`, `gameSession.coffee` ~1412, `entities/unit.coffee` ~33, `server/ai/starter_ai.js`, `view/layers/game/handAbilitySlot.js`, SPEC CAP-1/CAP-2.

## F1 (High) Ability-origin bypass: embedded move/attack vs the spent slot

Pair: Story A (Entity/validators) vs Story B (UseActiveAbilityAction, move-and-strike abilities).
- AD-18 says Entity decides readiness "only from movesMade and attacksMade". The original non-AP lines (`!getIsExhausted() and getHasMovesLeft() ...`) ignore the `isAbilityOrigin` parameter. Today's `isAbilityOrigin` bypass exists only inside the AP branch that AD-18 deletes.
- AD-19 says embedded actions "skip recordMove and recordAttack". It does not say they skip the readiness check. `UseActiveAbilityAction._execute` calls `recordActiveAbilityUse()` BEFORE `super()`, so attacksMade is already 1 and `getIsExhausted()` is true when the embedded move/attack reaches `ValidatorEntityAction` (`source.getCanMove(isAbilityOrigin)` / `getCanAttack(isAbilityOrigin)`).
- A restores the original expressions (compliant). B keeps record-before-execute (compliant). Result: every move-then-strike ability (the 51012-51014 family, Bull Rush dash steps, General abilities that move) is rejected or no-ops.

Tightening (new AD-19b): `getCanMove(isAbilityOrigin)` / `getCanAttack(isAbilityOrigin)` keep the parameter; when true they ignore exhaustion and slot counters and check only speed (`getSpeedForAbilityOrigin`), ATK/reach and attack type. Pin the order: the slot is validated, recorded once, then embedded actions run with `isAbilityOrigin`; or recorded after sub-actions resolve. State which.

## F2 (High) Two ability gates: getCanUseActiveAbility vs getCanAttack

Pair: validator story vs AI/UI story.
- AD-19: gate is "the same Entity accessor family as getCanAttack, plus AD-7". Real call sites of `getCanUseActiveAbility` / `recordActiveAbilityUse`: `validatorPlayCard:53`, `UseActiveAbilityAction._execute`, `starter_ai.js:538,765`, `handAbilitySlot.js:81`. The spine never says whether they survive, what they check, or whether ATK>0 / reach>0 apply.
- Implementer A: `getCanUseActiveAbility = getCanAttack()`; an ATK 0 or reach 0 unit with an ability loses it. Implementer B: `!getIsExhausted() and getHasAttacksLeft()`. Both are "family".
- Buffed `getAttacks()` > 1: rule `attacksMade < getAttacks()` permits ability then attack, which the SPEC forbids. Battle pets (`getIsUncontrollableBattlePet` always has attacks left) get unlimited abilities.
- `UseActiveAbilityAction._execute` has its own inlined guard that silently returns, duplicating the validator.

Tightening (AD-19c): one accessor `getCanUseActiveAbility`; state its exact expression; explicitly no ATK/reach requirement; decide the attacks>1 and battle-pet cases; `recordActiveAbilityUse` is deleted and replaced by `recordAttack(false)`; the validator is the sole gate and `_execute` only asserts. Name all four call sites.

## F3 (High) AD-20 "exhaustion actions are the only way" contradicts the code

Pair: Story A (turn start/summon) vs Story B (everything else).
- Direct calls today: `gameSession.coffee:1414-1416` `entity.refreshExhaustion()`, `unit.coffee:33` `@applyExhaustion()`, `swapUnitAllegianceAction:40`, `gameSetup:172,288`, `challenge.coffee:360`. The actions merely wrap `Entity.refreshExhaustion/applyExhaustion`.
- A takes the AD literally: turn start and summon dispatch Refresh/ApplyExhaustionAction, injecting new actions into the action stream (indices, replays, event order). B leaves direct calls. Both claim compliance.
- Turn start is also v2-gated: v2 refreshes only the current player's entities, original refreshes all. AD-20 says "owner's turn start"; the spine does not say to keep or drop the `getIsPracticeSandboxV2()` branch. A deletes it (original restored), B keeps it. Observable for stun/summon timing of enemy units.

Tightening (rewrite AD-20): `Entity.refreshExhaustion/applyExhaustion/setExhausted` are the only mutators; Exhaustion actions are wrappers used by modifiers; the listed direct call sites are legal and unchanged. State explicitly whether turn start refreshes only the new current player's entities (branch kept behind the v2 helper) or all entities.

## F4 (Medium-High) Transform/building state-copy shapes

Pair: transform-site story vs building story.
- `ModifierTransformed.createContextObject(exhausted, movesMade, attacksMade, actionPoints, actionPointsSpentThisTurn, options)` is positional, with about 13 call sites (modifiers, spells, emblem, `modifierBuilding`). AD-18 removes the fields but not the signature. A deletes both params (shifts `options`), B passes `undefined` placeholders. Mixed sites silently misassign `options`.
- `getBuildingTransformState` returns carried state in v2 and a FRESH ready state otherwise. After the v2 branch is removed, is the surviving behavior fresh (original) or carried (current v2)? Unspecified; opposite readiness for a completed building.
- Rush ordering: `ModifierTransformed.onApplyToCard` copies the old unit's exhausted/moves/attacks while `ModifierFirstBlood.onActivate` refreshes (via `RefreshExhaustionAction`, which also zeroes moves/attacks). Inherent modifier order decides whether a unit transformed into Rock Pulverizer on its summon turn is ready. AD-21 is silent.

Tightening: AD-18 adds the exact new signature `createContextObject(exhausted, movesMade, attacksMade, options)` and a same-change sweep of all sites; building uses carried OR fresh (choose; delete `getBuildingTransformState` if fresh); AD-21 states the Transformed copy applies last and wins.

## F5 (Medium) AD-21 "delete effect 51012 if no other card references it": undefined reference scope

Pair: Rush story vs validator/UI cleanup.
- References to 51012 outside card factories: `validatorEntityAction._isPhobiesMovementAttack` ([51012,51013,51014]), `PhobiesCollectionCardVisual.js:40`, `cardsLookup` (`CawClaw`), `test/unit/view/phobies_collection_card_visual.js`. One implementer counts only factory references and deletes the lookup/effect; the other leaves it. Deleting breaks the UI map and hex validator; keeping leaves dead data that the SPEC wants retired only when unused.
- Rush `onActivate` gates on `getHasActedThisTurn`, which AD-18 rewrites; its post-AP meaning is not stated.

Tightening: AD-21 enumerates the reference search (factory, validator constants, view maps, tests) and states the outcome in one change. Pin `getHasActedThisTurn = movesMade != 0 or attacksMade != 0` (ability counts through attacksMade). Also state that Rush `onActivate` must not clear stun exhaustion (current unconditional RefreshExhaustionAction does).

## Minor
- Convention "slot access only via accessors" is violated by `starter_ai.js:1668` reading `.attacksMade` directly; list it as an AI migration item.
- AD-22: removal of `SetExhaustionAction` AP fields and the `restoreActionPointState?` call, plus `STAT_CARD_DATA_KEYS`, changes the action-stream shape; say so.
- `setMovesMade` also raises attacksMade to movesMade-1 (celerity coupling); AD-18 describes only the attack-raises-move half.
