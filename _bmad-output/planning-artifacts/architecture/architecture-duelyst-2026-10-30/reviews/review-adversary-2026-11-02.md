# Adversarial review of ARCHITECTURE-SPINE.md (AD-1..AD-8), 2026-11-02

Verdict: the spine is sound on versioning and geometry ownership, but it leaves several shared-data shapes, one state owner, and the turn-end order unspecified, so two compliant teams can still build incompatible pieces.

Grounding in code: `gameSession.coffee` `p_endTurn` currently (a) decrements entity counters AND calls `currentPlayer.decrementSignatureAbilityCounters()` (player-level state, which AD-7 forbids), (b) runs before the `end_turn` event, (c) gates reserve transfer on `getRulesetId() is "practice-sandbox-hex"` (inline ID check, not the AD-1 helper, and true for v1 and v2). `p_startTurn` calls `refreshExhaustion` directly, a turn-start mutation that AD-3 does not allow for. `consumeMethronPoint*Authorization` exists with no AD.

## Pairs

### P1 CRITICAL - Turn-end order inside p_endTurn is unspecified (AD-3)
Team A (mana story) puts the reserve transfer first, then publishes `end_turn`. Team B (abilities story) decrements counters before the event, as the code does today. Team C (Methron story) needs capture and control damage AFTER turn-end effects ("remaining alive through turn-end effects"), which means after `end_turn` is published, so it cannot live inside the pre-event part of `p_endTurn`. AD-3 lists only reserve transfer and counter decrement as turn-end state; Methron capture and deficit damage are neither an action nor listed, so each team puts them somewhere different (inside p_endTurn, an end_turn modifier, or a follow-up action). Consequences: a unit that dies to poison/turn-end damage still captures or not; a General killed by control damage vs. reserve already transferred; a Cooldown-1 ability decremented before a turn-end effect resets or silences it.
Tighten AD-3: define one ordered turn-end pipeline: (1) decrement counters, (2) publish `end_turn` and resolve turn-end effects, (3) Methron capture then deficit damage as an explicit SDK action queued by `p_endTurn`, (4) reserve transfer, with the pipeline owned by one function and the ending player recorded.

### P2 CRITICAL - Ability card in a hand slot vs. fixed 8-slot array (AD-4 vs AD-7)
Team A (deck/hand, AD-4) serializes hand as a length-8 array of card instances or `null`, cleared on play. Team B (ability, AD-7) must "display" the ability card in slot N while the unit lives. One writes the ability card into the array (serialization, replay, `null` semantics change; play-card action could fire it and charge/clear), the other keeps it as a UI projection over `activeAbilityState.slotIndex`. AD-7 also says use is a separate action that "resolves through an existing spell card", but the slot shows a card a player may drag through the play-card path. Two entry paths for one ability.
Tighten AD-4/AD-7: the hand array never holds ability cards (it stays `null` at slot N); the slot view is a derived projection from `activeAbilityState`, and the only legal way to use it is `UseActiveAbilityAction`, with the play-card action rejecting ability cards.

### P3 HIGH - Two owners of General ability state (AD-7 vs existing signature-card state)
AD-7 says the General ability lives on the General entity with "no player-level ability state". Existing code keeps Bloodbound cooldown on `Player` (`decrementSignatureAbilityCounters`, signature card actions: Activate/Play/Update/GenerateSignatureCard). A story that obeys AD-7 adds entity state; a story touching the existing Bloodbound UI/actions/AI keeps player state. The AD also says state carries "the fixed hand-slot index" but the General has the dedicated Bloodbound slot, not a hand slot; the index shape for it is undefined. The General can also be replaced (swapGeneral) or silenced.
Tighten AD-7: name the migration: in v2 the existing signature-card actions are bypassed/removed in favor of `UseActiveAbilityAction`, the Bloodbound slot is a distinguished slot identifier (e.g. `"bloodbound"`) in `activeAbilityState`, and `Player` ability counters are deleted for v2.

### P4 HIGH - v2 coordinate mapping is not defined (AD-2 vs map-layout.md)
AD-2 mandates `{q,r}` for v2 but its only concrete conversion is the v1 45-cell odd-column rule. `map-layout.md` defines positions as zero-based (row,column) with odd ROWS shifted right and says "preserve the existing coordinate system". Team A (board) derives `{q,r}` from (row,col) as odd-r; Team B (Methron/Wall setup) hard-codes positions from the table by a different axial convention; a replay or AI written against one disagrees with the other. Also unspecified: whether a hole is "in bounds" (AD-2 says addressable without tile, map spec says not a rendered tile), so bounds, `getTileAtPosition`, and movement filters can disagree.
Tighten AD-2: publish a normative v2 table (row,col) -> `{q,r}` with the odd-r formula and a single `isOnBoard` (true for holes) vs `hasTile` (false for holes) pair owned by the topology module.

### P5 HIGH - Action-point refresh and exhaustion sit outside AD-3's mutation rule (AD-3 vs AD-6)
AD-3 says turn-boundary state changes happen only in `p_endTurn`. AP refresh at owner's turn start is done in `p_startTurn` (`refreshExhaustion`) with an inline `getIsPracticeSandboxV2()` branch, contrary to AD-6 ("Entity accessors only; no branching on version outside"). Team A puts refresh in `p_startTurn`; Team B (ability story) assumes it is part of the end-turn pipeline so a unit gets AP when counters tick. Also: does Use-ability require `AP > 0` through the same accessor as move/attack (spells vs. units: summoned units are exhausted, so a fresh unit's ability is blocked by AP even if Lockdown is 0 - spec silent), and do AP spend on ability happen before or after the effect resolves (effect can kill the caster or silence it)?
Tighten AD-3/AD-6: add `p_startTurn` as the second permitted turn-boundary mutation point with the AP refresh implemented inside `Entity.refreshActionPoints` (version dispatch inside the accessor), and state that ability use needs AP >= 1 and spends it before the effect resolves.

### P6 MEDIUM - Silence vs counters (AD-7 vs AD-3)
Spec: silence "keeps its counters"; AD-7 only says use requires no silence; AD-3 decrements counters in `p_endTurn` for all units. Team A decrements unconditionally (silenced units keep ticking); Team B skips silenced units (frozen). Also decrementing a dead unit mid-pipeline, and a unit killed at turn end (state "cleared when the unit leaves the board").
Tighten AD-7: counters decrement for every living unit of the ending player regardless of silence (or freeze while silenced - pick one) and Lockdown/Cooldown are never cleared by silence.

### P7 MEDIUM - Version gate drift (AD-1 vs live code)
`p_endTurn` and `p_startTurn` already branch on `getRulesetId() is "practice-sandbox-hex"` without the version, so the mana rules silently apply to v1 and v2 alike, and v1 replays now differ from the original v1 package if AD-3 changes later. AD-1 forbids inline ID comparisons but defines no helper for "ID without version"; mana changes are described as ruleset-wide.
Tighten AD-1: define `isPracticeSandboxV1` and `isPracticeSandbox` helpers, state which AD-3 behaviors are v1+v2 versus v2-only, and add a replay test per saved v1 fixture.

### P8 MEDIUM - Area resolver vs spell area effects (AD-8)
AD-8 says one resolver computes targets, but spell area effects (e.g. existing `getAffectedPositions`/`ApplyCard` patterns) currently build target lists independently, and "AttackAction calls it" does not cover `SpellAction`, modifiers that deal area damage, or AI preview. The Wall-under-target exception needs the target's own position, but entry points that pass a position list (not a target) cannot say who the target is; Wall damage priority (enemy occupant before Wall) is a direct-attack rule while area effects hit both, and the resolver contract does not return entity IDs.
Tighten AD-8: the resolver takes `(source, centerOrAxis, radius, kind)` and returns an ordered list of entity IDs (units and Walls) plus the supporting-Wall exclusion; direct-attack priority is a separate `resolveDirectTarget` in the same module, and every spell/modifier area path and AI previews must use it.

### P9 MEDIUM - Methron Points: no owner for point state (not covered by any AD)
Control state (neutral/p1/p2) per point, its serialization, who captures and how it is replayed has no AD. Team A stores it on `Board` tiles, Team B on `GameSession`, Team C as a modifier on a tile entity. Existing `consumeMethronPoint*Authorization` hacks show the shape is already drifting.
Tighten with a new AD-9: control state is a v2 `GameSession` field keyed by `{q,r}`, mutated only by the Methron capture action and deficit-damage action from P1's pipeline, serialized in snapshots.

### P10 LOW - Walls as entities and AD-5 audit
Walls are neutral entities sharing a position with a flying/phasing unit; the spine says nothing about owner id, entity-limit checks, whether `getEntityAtPosition` returns one or two, or Wall health/death in replay. Tighten AD-2 or a new AD: `Board` offers `getUnitAt` and `getWallAt` separately and a single `getEntitiesAt` returning both.
