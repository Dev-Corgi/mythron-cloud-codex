# Reality-check review: Duelyst Action Model and Rush spine

Lens: every committed decision verified against the repo (no new technology is named, so no version research was needed). Paths are relative to `C:\Working\duelyst\duelyst`. Read-only review; no tests were run.

Verdict: SOUND WITH CORRECTIONS. Most named symbols exist as claimed. AD-18 and AD-19 under-enumerate the action-point surface, AD-19 names the wrong ability API, and AD-21's "delete 51012 only if unreferenced" runs into hard-coded references.

## Confirmed

- `actionPoints`, `actionPointsSpentThisTurn` exist (entity.coffee:57-58) and are in `STAT_CARD_DATA_KEYS` (line 46).
- `getUsesActionPoints` (545, delegates to `getIsPracticeSandboxV2`), `spendActionPoint` (564), `restoreActionPointState` (602), `getBuildingTransformState` (609) exist.
- `recordMove` / `recordAttack(isAbilityOrigin)` exist (580/585), called from actions/moveAction.coffee:54 and actions/attackAction.coffee:61. `isAbilityOrigin` lives on Action (action.coffee:17).
- Original coupling exists: `setAttacksMade` raises `movesMade` to at least `attacksMade` (524); `setMovesMade` raises `attacksMade` to at least `movesMade - 1` (498-503).
- Original `getIsExhausted` expression is present in the non-AP branch (631): `getExhausted() or !getHasAttacksLeft()`.
- `ModifierFirstBlood` is the Rush modifier (rush_name/rush_def i18n), using `RefreshExhaustionAction` / `ApplyExhaustionAction`. `SetExhaustionAction`, `RefreshExhaustionAction`, `ApplyExhaustionAction` all exist in app/sdk/actions.
- Phobies 50004 is Rock Pulverizer, mana 2, 650 HP, 425 ATK, melee, reach 1 (cards/factory/phobies/neutral.coffee:17); `ACTIVE_ABILITY_BY_CARD_ID[50004] = effectCardId 51012` (line 64).
- "The one v2 helper" is real: `getIsPracticeSandboxV2` (gameSession.coffee:908, entity.coffee:541), used widely.

## Findings

### F1 (High) AD-18 removal list is incomplete; callers outside entity.coffee that AD-18 would miss

AD-18 names five symbols plus "their callers". The actual surface:

- Entity-internal, not named: `getActionPoints`, `setActionPoints`, `getHasSpentActionPointThisTurn`, `setHasSpentActionPointThisTurn`, `getIsOutOfActionPoints`, `getCanUseActiveAbility`, `recordActiveAbilityUse`, plus AP branches in `getHasMovesLeft`, `getHasAttacksLeft`, `getCanMove`, `getCanAttack`, `getHasActedThisTurn`, `getIsExhausted`, `setExhausted`, `refreshExhaustion`, `applyExhaustion`.
- Outside entity.coffee:
  - validators/validatorEntityAction.coffee:36 calls `source.getIsOutOfActionPoints()` in the AttackAction branch.
  - actions/setExhaustionAction.coffee: fields `actionPoints` / `actionPointsSpentThisTurn`, `setActionPoints`, `setActionPointsSpentThisTurn`, and a `restoreActionPointState?` call (line 49).
  - modifiers/modifierTransformed.coffee: positional `createContextObject(exhausted, movesMade, attacksMade, actionPoints, actionPointsSpentThisTurn, options)` (24-44). Removing the two params shifts `options`, so all call sites must change together.
  - 12 transform call sites pass `getActionPoints()` / `getHasSpentActionPointThisTurn()`: modifierBuilding (via `getBuildingTransformState`, lines 80-81), modifierDyingWishTransformRandomMinion, modifierEndTurnWatchTransformNearbyEnemies, modifierEnemyStunWatchTransformThis, modifierKillWatchAndSurviveScarzig, modifierMyAttackOrCounterattackWatchTransformIntoEgg, modifierSummonWatchTransform, spellAspectBase, spellIllusoryIce, spellTempTransform, spellTransformSameManaCost, playerModifierEmblemEndTurnWatchLyonarSmallMinionQuest.
  - Callers of the ability-gate AP family: actions/useActiveAbilityAction.coffee:47 (`getCanUseActiveAbility`, `recordActiveAbilityUse`), validators/validatorPlayCard.coffee:53, view/layers/game/handAbilitySlot.js:81, server/ai/starter_ai.js:538 and :765.
  - Tests that will break: test/unit/sdk/game/{unit_stats,basic,active_abilities,action_point_accessors,ruleset_gate}.js, test/unit/sdk/ai/ai.js, test/integration/misc/utils_game_session.js (`general.setActionPoints(4)`), test/unit/view/hand_ability_slot.js. `action_point_accessors.js` is a whole file to delete.
- Not found: any AP caller in worker/, server/ai beyond starter_ai.js, Player.js, GameLayer.js, gameSession.coffee, EntityNode.js (they matched only via `activeAbilityState`).

### F2 (High) AD-19 names the wrong ability API and its gate may block 0-ATK units

The ability path today is `getCanUseActiveAbility()` plus `recordActiveAbilityUse()` (which calls `spendActionPoint`), not `recordAttack`. The spine says abilities call `recordAttack` and gate on "the same accessor family as `getCanAttack`". `getCanAttack` requires `getATK() > 0`, `getReach() > 0` and attack type not `none` (entity.coffee:536-539). Roster ability users with 0 ATK or `none` attack type include Ion 50001, Healing Mystic 50005, Borean Bear 50009 and Chaos Elemental 50013. Reusing `getCanAttack` verbatim would silently disable their abilities. The spine should say the ability gate is the slot test (not exhausted, attack slot available) without the ATK/reach/attackType clauses. Also, `getCanMove/getCanAttack(isAbilityOrigin)` currently bypass the AP check for embedded actions (validatorEntityAction passes the flag); the slot branch needs an equivalent bypass, or embedded moves/attacks after the ability consumes the slot will be rejected. The spine only says embedded actions skip recording, not that they skip the readiness check.

### F3 (Medium) AD-21 "delete 51012 only if unreferenced" understates live references

51012 is used outside the factory entry:

- validators/validatorEntityAction.coffee:55 (`_isPhobiesMovementAttack` list `[51012, 51013, 51014]`).
- server/ai/card_intent/phobies_abilities.js:45 and :80 (`PA.CawClaw` intent and scoring).
- ui/views2/collection/PhobiesCollectionCardVisual.js:40.
- cards/factory/phobies/abilities.coffee:198 and :430 (`PhobiesCawClaw`, text "Knucklestorm").
- cards/cardsLookup.coffee:1216 (`CawClaw: 51012`).

No other card maps to 51012, so deletion is allowed, but the story must clean all of these. Naming mismatch: cardsLookup calls 50004 `Cassowary` and 51012 `CawClaw`; "Rock Pulverizer" is only the display name in neutral.coffee (original card id 19026, `Cards.Neutral.RockPulverizer`, used in test/unit/sdk/ai/bosses.js), so grepping `RockPulverizer` finds the wrong card. There is no standalone "factory entry": it is a ROSTER row plus an `ACTIVE_ABILITY_BY_CARD_ID` row, and the modifiers block has no Rush push yet. Card 50004 is also in `LIFEGAIN_CARD_IDS` (consistent with "Lifegain untouched").

### F4 (Medium) Rush semantics partly asserted, not verified

- `ModifierFirstBlood.onActivate` refreshes exhaustion only when the card was applied by an action executed this turn and `!getHasActedThisTurn()`. Stun is enforced by `ModifierStunned` invalidating move/attack actions (modifierStunned.coffee:48-51), not through exhaustion, so "stun still applies" holds; "other exhaustion sources" is unconfirmed.
- `getHasActedThisTurn` (entity.coffee:575) has an AP branch and is called from modifierFirstBlood.coffee:31 and modifierPseudoRush.coffee:26. It is absent from AD-18's list. After removal it reverts to `movesMade != 0 or attacksMade != 0`, which counts ability use only if abilities go through `recordAttack` (AD-19). Rush correctness depends on that; state it.
- No existing test covers 50004 summon-turn behavior (only test/unit/misc/practice_ui_paths.js lists the id).

### F5 (Low) Minor

- Deferred item on snapshots: `STAT_CARD_DATA_KEYS` does not include `exhausted`, `movesMade`, `attacksMade`; they travel through `SetExhaustionAction` / `ModifierTransformed` only, so the AD-22 reliance should be verified in the story (the spine already defers it).
- `getIsUncontrollableBattlePet` carve-outs in `getHasMovesLeft` / `getHasAttacksLeft` / `getIsExhausted` are not mentioned; they stay in the non-AP path and are unaffected.
- `unit_stats.js:143` asserts the AP keys in `getCardDataKeysForCopy`, so AD-22 key removal needs that test updated.

## Not verified

- Runtime behavior (no tests run).
- Whether any persisted snapshots/replays beyond test fixtures exist.
