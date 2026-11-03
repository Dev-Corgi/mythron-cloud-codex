# Rubric review: Action Model and Rush spine

Verdict: REVISE (sound direction; two claims contradict the current code and two divergence points are unfixed).

Code verified: `app/sdk/entities/entity.coffee`, `actions/{attack,move,useActiveAbility,setExhaustion}Action.coffee`, `validators/validatorEntityAction.coffee`, `validatorPlayCard.coffee`, `modifiers/modifierFirstBlood.coffee`, `server/ai/starter_ai.js`, `view/layers/game/handAbilitySlot.js`.

## Findings

### F1 (High) AD-19 "embedded actions skip recordMove/recordAttack" is not ratification; it contradicts today's code and names no call site
- `moveAction.coffee:54` always calls `entity.recordMove(@getIsAbilityOrigin())`. `attackAction.coffee:60` explicitly records when `!implicit or isAbilityOrigin`. Today `isAbilityOrigin` only skips `spendActionPoint`. The counters still increment (`entity.coffee:580-587`).
- Once AP is removed (AD-18), the flag has nothing left to skip. An implementer who keeps the call sites ends with embedded moves and attacks consuming the slot. That is exactly what CAP-1 forbids, and the spine does not say it must change.
- Fix: state that `moveAction`/`attackAction` stop calling record for ability-origin actions, or that `recordMove`/`recordAttack` return early on the flag. Pick one owner; the Consistency Conventions row is currently unenforceable.

### F2 (High) Ordering hazard between spending the attack slot and validating embedded actions is undecided
- `useActiveAbilityAction._execute` records use (`recordActiveAbilityUse`) before `super()` runs the embedded actions. Embedded actions are validated through `getCanMove(true)` / `getCanAttack(true)` (`validatorEntityAction.coffee:25,42`).
- Today the `isAbilityOrigin` argument bypasses the AP gate. If the AP branches are deleted per AD-18 and the flag is not kept as a slot-gate bypass, the unit that just spent its attack slot fails `!getIsExhausted() and getHasAttacksLeft()` and its own embedded dash and strike are rejected.
- The spine never says what `isAbilityOrigin` means inside `getCanMove`/`getCanAttack` after the change. This is a real divergence point for validators, UI and AI. Decide it: the flag bypasses the slot gate, but keeps the speed/ATK/reach checks.

### F3 (Medium-High) AD-19 gate "same accessor family as getCanAttack" is ambiguous and would wrongly bind abilities to ATK/reach/attackType
- `getCanAttack` also requires `ATK > 0`, `reach > 0` and `attackType != "none"` (`entity.coffee:536-539`). Reusing it as the ability gate would block 0-ATK or attackType-none units from using abilities. Two implementers can pick differently.
- Fix: name the exact predicate, e.g. `!getIsExhausted() and getHasAttacksLeft()` (a new `getCanSpendAttackSlot`), plus the AD-7 conditions. `getCanUseActiveAbility`, `recordActiveAbilityUse`, `getIsOutOfActionPoints` and `getHasActedThisTurn` are not named as keep, rename or remove. Callers are in `validatorPlayCard.coffee:53`, `useActiveAbilityAction.coffee:47`, `handAbilitySlot.js:81` and `server/ai/starter_ai.js:538,765`.

### F4 (Medium) AD-18 "decides readiness only from movesMade and attacksMade, default one and one" skips `getMoves()`/`getAttacks()`
- `getHasMovesLeft`/`getHasAttacksLeft` compare against buffed `getMoves()`/`getAttacks()`, and special-case `getIsUncontrollableBattlePet` (`entity.coffee:511-513,532-534,628`). The spine neither ratifies nor excludes these. Whether an extra-attack or extra-move buff is honored is therefore open, and Deferred is silent.
- Related: the coupling claim is accurate but incomplete. `setAttacksMade` raises moves to at least attacks (`entity.coffee:520-524`) as stated. `setMovesMade` also raises attacks to `moves - 1`, the "celerity" rule that blocks a second move without an attack. Spec says "a second move rejected"; this works only via `getMoves()==1`, which makes the buffed-count question matter.

### F5 (Medium) AD-21 Rush mechanism has unlisted interactions
- `ModifierFirstBlood.onActivate` dispatches `RefreshExhaustionAction` only if `!getHasActedThisTurn()` and the unit was applied on the current turn. `refreshExhaustion` also resets `movesMade`/`attacksMade`. `deactivateRushIfNeeded` re-exhausts on dispel, silence or removal the same turn. `ModifierInvalidateRush` exists.
- "Stun and other exhaustion sources still apply" is not guaranteed by `refreshExhaustion`. The spine should bind the test for stun-on-summon and silence-same-turn. `getHasActedThisTurn` is rewritten by AD-18 and the Rush modifier depends on it, but it is not mentioned.
- `validatorEntityAction._isPhobiesMovementAttack` hardcodes `[51012, 51013, 51014]`. If 51012 is deleted (AD-21), that list must be updated; the spine does not mention it. Card 50004 mapping (`phobies/neutral.coffee:64`) and ID 51012 (`cardsLookup.coffee:1216`) were confirmed; no other card uses 51012.

### F6 (Low-Medium) Convention vs. reality on "no direct writes to movesMade/attacksMade"
- `SetExhaustionAction`, `ModifierTransformed`, `ModifierPseudoRush` and `ModifierSpawnedFromEgg` call `setMovesMade`/`setAttacksMade` directly through public setters. This is legitimate under AD-20 but the Slot access convention says "only accessors and record*". Clarify that the exhaustion actions and transform state copy are the permitted writers.
- AD-22 relies on a Deferred verification ("discarded snapshots carry exhausted/movesMade/attacksMade"). That is acceptable but it is a gate for a decision, not a deferral; make it an explicit precondition of the first story.

## Checklist summary
| Item | Result |
| --- | --- |
| Divergence points fixed | Partial: F1, F2, F3 |
| Rules enforceable | AD-18, AD-20, AD-22 yes; AD-19 no (F1-F3); AD-21 partly |
| Deferred cannot cause divergence | OK, except the F4 `getMoves/getAttacks` gap and F6 |
| Tech verified | N/A (no external tech named) |
| Ratifies brownfield | Coupling claim and `isAbilityOrigin` skip claim: coupling true; skip false (F1) |
| CAP-1/CAP-2 and spec constraints | Covered. Two-story split, "only Rock Pulverizer changed" and Lockdown/Cooldown unchanged are in Capability map/AD-21/AD-19 |
| New ADs vs inherited | No contradiction; supersessions of AD-6/AD-7 are explicit and scoped |
| Altitude dimensions | Structural Seed omits `app/view/layers/game/handAbilitySlot.js` and `test/` helpers; AI path `server/ai/` is correct |
