---
title: 'Story 14: Unify the General''s Bloodbound ability under the active-ability action'
type: 'refactor'
created: '2026-11-02'
status: 'done'
baseline_commit: '98b3a465'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-unit-stats-active-abilities/active-ability-rules.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-duelyst-2026-10-30/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After Story 8 the General's Bloodbound counters live on its entity, but the ability is still used through a second action type (`PlaySignatureCardAction`) with its own action, validator branch, AI calls, and UI event handling in version 2, which leaves spine AD-7 half done.

**Approach:** In version 2, use `UseActiveAbilityAction` for the General's Bloodbound ability, resolve its effect through the General's current signature spell, and port every version 2 producer and consumer (SDK, server AI, single-player tracking, UI event and reminder code). Saved version 2 matches that recorded `PlaySignatureCardAction` are not supported.

## Boundaries & Constraints

**Always:** Version 2 only. Bloodbound keeps Lockdown 2, Cooldown 2, no mana, one action point, its dedicated Bloodbound slot (identified separately from hand indices), and its existing spell effect, including prismatic Generals and a signature card changed by `PlayerModifierChangeSignatureCard`. `UseActiveAbilityAction` for a General resolves its effect id from the General's current signature card data, is accepted by `CardEligibility` for that id, and after use clears the signature-active flag and generates the next signature card exactly as `PlaySignatureCardAction` did. `Player.actionPlaySignatureCard` returns a `UseActiveAbilityAction` in version 2 so existing callers keep working. Player modifiers and watchers that react to a signature play must still react to the General's ability use in version 2. Legacy and version 1 keep `PlaySignatureCardAction` unchanged, including all existing signature tests.

**Never:** Keep a version 2 path through `PlaySignatureCardAction` or add compatibility for old version 2 recordings. Change Lockdown/Cooldown values, hand-slot ability behavior for units, legacy AI behavior, or the Bloodbound slot layout. Do not edit unrelated AI scoring.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| USE | Version 2 General at 0/0 with a point and valid target | Spell resolves, cooldown 2, one point spent, no mana, next signature card generated | Invalid at counters above 0, silence, 0 points, bad target |
| PRISMATIC | Prismatic General | Prismatic Bloodbound spell resolves; eligibility accepts it | N/A |
| CHANGED_SIGNATURE | Signature changed by a player modifier | The changed spell is the effect | N/A |
| PRODUCER | UI or AI calls `actionPlaySignatureCard` in version 2 | Gets a `UseActiveAbilityAction` | N/A |
| WATCHERS | Player modifier reacting to a signature play | Still fires on the General's ability use in version 2 | N/A |
| AI | Practice bot with Bloodbound ready | Uses it through the new action and tracking logic still works | N/A |
| LEGACY | Legacy or version 1 match | `PlaySignatureCardAction` flow and tests unchanged | N/A |
| OLD_RECORD | Version 2 recording with `PlaySignatureCardAction` | Rejected | Not supported by decision |

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/actions/useActiveAbilityAction.coffee` -- takes `effectCardId` from `sourceUnit.activeAbility`; General needs it from `getSignatureCardData` plus the post-use signature regeneration.
- `duelyst/app/sdk/actions/playSignatureCardAction.coffee`, `duelyst/app/sdk/validators/validatorPlayCard.coffee` (l.20-28 version 2 branch) -- remove the version 2 paths; `validatorExecuteExplicitAction.coffee` whitelist.
- `duelyst/app/sdk/player.coffee` -- `actionPlaySignatureCard` (~l.479), `actionUseActiveAbility`, `getSignatureCardData`, `getIsSignatureCardActive`, `actionGenerateSignatureCard`, `actionActivateSignatureCard`.
- `duelyst/app/sdk/rulesets/cardEligibility.coffee` (~l.56-61) -- `isAllowedRuntimeCard` for `UseActiveAbilityAction`, `isSignatureForPlayer`.
- `duelyst/app/sdk/playerModifiers/*` (FlashReincarnation, ManaModifier*, SpellWatch) and `duelyst/app/sdk/modifiers/modifier.coffee` (~l.1983) -- `instanceof PlaySignatureCardAction` matches.
- Server AI: `duelyst/server/ai/starter_ai.js` (~l.712, 807, 1154), `duelyst/server/ai/phase_ii_ai.js` (many branches on `PlaySignatureCardAction`), `duelyst/server/ai/scoring/phase/phase_summon.js`, `phase_spell.js`; `duelyst/server/single_player.coffee` (~l.1356, 1793, 1850, 2094), `duelyst/server/game.coffee` (~l.1356).
- UI: `duelyst/app/view/Player.js` (~l.809 event mapping), `duelyst/app/view/nodes/cards/SignatureCardNode.js`, `duelyst/app/view/layers/game/GameLayer.js` (`getSignatureCardNode`, `isSignatureCard`), `duelyst/app/ui/views/layouts/game.js` (~l.314, 375), `duelyst/app/view/nodes/cards/BattleLogNode.js`.
- Tests: `test/unit/sdk/game/active_abilities.js` (Bloodbound case), `test/unit/sdk/game/ruleset_gate.js`, `test/unit/sdk/ai/ai.js`, legacy `test/unit/sdk/cards/misc/bloodborn_spells.js`.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/test/unit/sdk/game/active_abilities.js` and new tests -- Bloodbound through the new action: USE, PRISMATIC, CHANGED_SIGNATURE, PRODUCER, WATCHERS, validator rejections, and `PlaySignatureCardAction` rejected in version 2 -- pins the target behavior.
- [x] SDK files above -- General effect resolution, regeneration after use, eligibility, version 2 removal of the old path, watchers -- single action type.
- [x] Server AI, `single_player.coffee`, `game.coffee` -- port branches on `PlaySignatureCardAction` for version 2 and cover with an AI unit test where the bot uses Bloodbound -- bot keeps its ability.
- [x] UI files above -- recognize `UseActiveAbilityAction` from the General wherever `PlaySignatureCardAction` was recognized -- code-level port; screen verification is left to the human.

**Acceptance Criteria:**
- Given a version 2 match, when Bloodbound is used by a player or the bot, then it resolves through `UseActiveAbilityAction` with the same counters, action point, and mana outcome as before.
- Given the legacy signature tests, when run, then they pass unchanged.
- Given `app` and `server`, when searched for `PlaySignatureCardAction`, then each remaining reference is either a legacy/version 1 path or guarded by a non-version-2 check.

## Implementation Notes

- `UseActiveAbilityAction` now resolves a General's effect from the owner's current signature data (`getEffectCardId`), so prismatic Generals and `PlayerModifierChangeSignatureCard` are respected. After use it clears the signature-active flag and generates the next signature card. `CardEligibility` accepts that effect id.
- `PlaySignatureCardAction` lost all version 2 code and `ValidatorPlayCard` rejects it in version 2 (old version 2 recordings are unsupported by decision). `Player.actionPlaySignatureCard` returns a `UseActiveAbilityAction` in version 2, so AI and UI producers are unchanged.
- New `SDK.SignaturePlay.matches` (true for `PlaySignatureCardAction` or a General-sourced `UseActiveAbilityAction`) replaced `instanceof PlaySignatureCardAction` in 12 modifiers and 5 player modifiers, `GameLayer`, `Player.js`, `BattleLog`, `BattleLogNode`, `game.js`, `server/game.coffee`, and `server/single_player.coffee`. A unit hand-slot ability does not count as a signature play.
- Server AI: `phase_ii_ai.js` routes `UseActiveAbilityAction` like the old signature action and picks it in version 2; `starter_ai.js` offers Bloodbound only when the General has a point and is not silenced, and remembers the signature card when the action is rejected.
- Not verified in a running game: all UI edits (`GameLayer`, `Player.js`, battle log, reminders) and the server game-over and single-player bookkeeping are checked by code reading and syntax checks only. The manual Practice check in Verification is still open. The Phase II AI has no unit test.
- Known limit: `GenerateSignatureCardAction` in version 2 only allows the General's own signature id, so a signature changed by a player modifier resolves the changed spell but the slot card is not re-skinned.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence |
|---|---|---|
| Synergize, CannotCastBBS pair, and other signature-play modifiers untested in version 2 | high | Real gap: no test failed when these swaps were disabled. Added Synergize and both CannotCast tests; mutation fails both. |
| starter_ai offers Bloodbound while the General is silenced | medium | New helper omitted silence; added `!general.getIsSilenced()`. |
| Phase II AI has no test | medium | Confirmed; deferred because building that scenario is expensive. Recorded in notes. |
| Server and UI consumers untested | medium | No harness for server game-over or Cocos view code in this repo; left to the manual check. |
| Unit ability reaches `generatePseudoActionFromAction` as a General play | false | That function only receives the master's AI-created branch action, and no AI code creates unit ability actions. |
| Phase II AI offers a signature card that is not ready | false | Same candidate list existed with the old action; the validator rejects it. Not introduced here. |
| Mana modifiers see a fresh effect card instead of the slot card | low | Version 2 Bloodbound costs no mana either way, so discounts have nothing to reduce. |
| `OncePerTurn` owner check binds to one branch | false | Pre-existing precedence, unchanged by the diff. |
| `tileY` dropped in `actionPlaySignatureCard` | false | Version 2 positions are `{q,r}` objects, as in the old version 2 branch. |
| Null session or missing signature data in `getIsGeneralAbility` and regeneration | false | An action always has a session and every General carries signature data; the old code was equally unguarded. |
| Validator not gated to version 2 for generic use of a General | false | A General has no ability state outside version 2, so the existing state check rejects it. |
| Remaining `PlaySignatureCardAction` references unguarded | low | Class and whitelist stay for legacy and version 1; the version 2 rejection runs in the validator first. |
| Style: prototype override in the SpellWatch test, missing blank line | low | Left as is; cosmetic. |

## Verification

**Commands:**
- `cd duelyst && npx mocha --exit -t 3000 test/unit/sdk/game/active_abilities.js test/unit/sdk/game/ruleset_gate.js test/unit/sdk/ai/ai.js test/unit/sdk/cards/misc/bloodborn_spells.js` -- expected: all passing

**Manual checks (no CLI):**
- Run a Practice match in the app: use the General's Bloodbound from the dedicated slot, confirm the slot refreshes, the bot's use animates, and the opponent's view shows the event.
