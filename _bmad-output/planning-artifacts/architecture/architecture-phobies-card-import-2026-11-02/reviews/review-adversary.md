# Adversarial review: Phobies Card Import spine (AD-10..AD-16)

Stance: find pairs of stories or developers who each obey every AD literally and still build incompatible things. Each finding names the pair, the divergence, and the fix. Severity: S1 = wrong or broken game, or data loss; S2 = rework or desync risk; S3 = inconsistency.

Verdict: NOT READY to build from. The spine is strong on where cards live (AD-10, AD-12) but nearly silent on runtime semantics of the 16 actives: damage source, embedded actions vs action points, targeting vocabulary, duration, determinism. Seven S1 holes.

---

## S1 findings

### F1. Embedded move/attack vs the AD-6 action-point gate (Story 8 vs 6/7/9; AD-6 vs AD-11)
AD-6: only Entity accessors decide whether a unit may move or attack; validators and modifiers never branch on AP. AD-11: ability use spends one AP; embedded move/attack carry `source=ability` and spend nothing more.
- Dev A (Caw Claw) spends the AP at ability use, then runs the embedded MoveAction/AttackAction. The unit now has 0 AP; validators call the Entity accessor, which says no; the embedded action is rejected. To make it work A adds a `source=ability` bypass inside the validators, violating AD-6.
- Dev B (Bull Rush) puts the bypass inside the Entity accessor. Two mechanisms; one breaks stunned/rooted units (F2).
- Third variant: spend AP after the embedded action. A unit with exactly 1 AP is accepted by one story and rejected by another; a failed child leaves AP spent differently.
Fix (new AD): validate the whole chain once up front through the Entity accessor; AP spent in the parent before children run, atomically; one named exemption point in Entity that waives only the AP check (not silence, stun, root, provoke); an illegal child makes the parent illegal.

### F2. Embedded move/attack vs silence, Lockdown, stun, Gotcha "cannot move" (Story 8 vs Story 7)
AD-7 covers silence/Lockdown/Cooldown for ability use only. Gotcha (Story 7) stops an enemy moving for 2 turns.
- Dev A implements Gotcha with a rooting-style modifier; Dev B's embedded move (Caw Claw, Bull Rush) never consults it, so a Gotcha'd Cassowary or Rook still moves via ability. Or it does, and the expected "move" semantics diverge.
- Can a stunned or frozen unit use an ability? AD-7 only says silence.
Fix: one AD listing the gating set for ability use and for embedded actions; name the single modifier for "cannot move" (reuse, AD-15) and its duration rule (F7).

### F3. Damage source attribution for ability/spell damage (Story 4 Lifegain vs 5 passives vs 6-9)
AD-14 says Lifegain counts ability damage. AD-7/AD-11 resolve the ability through a spell card; in this SDK spell damage has the spell/player as action source, not the unit.
- Story 4 hooks deal-damage with `source === this`. Story 6 (Monty, Flameblood Warlock has Lifegain) builds a damage spell sourced by the effect card, so Lifegain never fires; or Story 6 invents a `sourceUnit` field that Story 7 (Raising Hell, Red Synja has Lifegain) names differently.
- Counter Attack (Story 5): when Monty hits Zappy, who receives the 35%: the Murder Wing, the player, nobody? Body Count "directly kills": do embedded-attack kills count (they are real attacks per AD-11)? Methron control damage has no unit source at all.
Fix (new AD): every damage action carries `sourceEntity` (the unit for ability damage); a table of source types (attack, ability, reflect, environment) and which passives respond to each.

### F4. Walls and neutral entities in "enemy/friendly/adjacent/minion" (Stories 5, 7, 9; AD-9, AD-11)
AD-9: Walls are ownerless neutral entities. Area and beam effects hit "enemy" units.
- Dev A tests `owner !== caster owner`; an ownerless Wall counts as enemy, so Special Delivery damages Walls. Dev B tests owner is the opposing player and excludes them. Both defensible.
- Terrorform Walls are "targetable by both teams": can Monty hit one? Does damage to a 2000-HP Wall feed Lifegain (Lifegain units farming Walls)?
Fix: shared predicates (`isEnemyUnit`, `isFriendlyUnit`, `isMinion`, `isGeneral`, `isWall`) with a table per effect class; state whether Wall damage is "damage dealt".

### F5. "Minion" vs "unit"; General in or out (Stories 6, 7, 9; roster text vs Phobies)
Phobies says "enemy unit" or "friendly unit"; the roster's Duelyst text says "minion", which in Duelyst excludes the General. SPEC says Phobies wins; AD-14 says word text per roster.
- Dev A (Special Delivery, Poof!, Raising Hell!, Behold) hits enemy Generals (Phobies "units"; 6000 HP Generals are the point). Dev B (Monty, Pure Adrenaline) excludes Generals because the text says minion. Group Hug and Cupcake: can they heal your General?
Fix: per-ability explicit target class table ("minion" or "minion or General") and derive text from it.

### F6. Allowlist roles miss Walls, Bloodbound spells, generated cards (Stories 2/10 vs 9; AD-12 vs AD-5, AD-7, AD-9)
AD-12 replaces the list "in full" with two roles; parent AD-5 applies the allowlist at generated-card creation.
- The Wall card/entity (setup and Terrorform) is neither `deckable` nor `abilityEffect`; Terrorform's create-Wall is rejected at generated-card creation while setup placement bypasses it through another path.
- The General's Bloodbound Spell (AD-7 same model) is an effect card outside the "16"; reset in full kills it. "Generals" is undefined: six primaries or alt generals too.
Fix: third non-deckable role (world/generated) for Walls, Methron Points, Bloodbound spells; an explicit generals id list; which creation path checks which role.

### F7. Timed effects: duration clock and Peek-a-booOO! (Stories 6, 7, 8, 11)
Roster: "+300 this turn" (Cupcake, Clang, Helping Hand), Gotcha "2 turns", Peek: Phobies `effect_duration=2` but the Duelyst text says "-300 Attack" with no duration (permanent). No AD says whose turn end clears these.
- Dev A clears "this turn" buffs at any `end_turn`, Dev B at the modifier owner's turn end; "2 turns" is the victim's two turns or two global turns. Parent AD-3 limits turn-end changes in `p_endTurn`, so a new duration clock has no legal home; reuse existing duration modifiers.
- Peek: the mechanic implementer (Story 6, Phobies wins: 2 turns) and the text writer (Story 11: permanent) disagree.
Fix: AD for timed modifiers: reuse existing `durationEndTurn`-style mechanism (AD-15), define "turn", "this turn", "N turns" in v2 alternating flow, fix Peek's duration and text.

### F8. Ability range and shape have no home (Stories 6-9 vs AD-7)
AD-7 ability is `{effectCardId, lockdown, cooldown}`. Roster has range 1/2/3, "adjacent tiles", "2 tiles away in line of sight". Dev A puts range in the effect card's validator, Dev B adds a fourth ability field (breaking AD-7 shape and snapshots), Dev C hard-codes it in the new action. The card view (Story 11) cannot show range uniformly. Metric undefined: hex distance, path distance, or line of sight.
Fix: range is part of the effect card's targeting spec, in AD-2 hex distance, with a named line-of-sight rule from AD-8; list per active.

### F9. Lifegain list vs bot deck (spec data conflict, Story 4 vs Story 10)
`card-roster.md` lists eight Lifegain cards, excluding Crossbones. `practice-bot-deck.md` annotates Crossbones with Lifegain. Story 4 follows the roster, Story 10's data follows its note.
Fix: one shared id list for the eight, a test asserting attachment on those and non-attachment on the other 27, correct the bot-deck note.

---

## S2 findings

### F10. Rounding and what "damage dealt" means (Story 4 vs 5; AD-14, Deferred)
Lifegain's post-defense vs raw choice is deferred to the implementer; Counter Attack's 35% is not deferred, so Story 5 picks alone.
- Overkill (500 into 100 HP: 250 vs 50), barrier/shield, Heart Attack +400 applied before or after Lifegain/reflect.
- Multi-target (Raising Hell!): floor per hit or of the sum; cap at missing Health per hit or per action.
- Order of Lifegain, reflect, and death.
Fix: define "damage dealt" (final applied amount, per damage action instance), floor per instance, one shared scaling helper used by both, explicit ordering; remove the Deferred item.

### F11. Counter Attack recursion; confusion with the ruleset's "no counterattack" (Story 5)
Reflect between two Zappys loops. Do reflect kills count for Body Count; does reflect count as damage for Lifegain? A dev may disable Zappy's passive in v2 because the ruleset "suppresses automatic counterattacks" (parent AD-3).
Fix: reflect is a distinct source type that never retriggers Counter Attack, Lifegain or Body Count; state Counter Attack is unaffected by AD-3 suppression.

### F12. Rage and Heart Attack timing (Story 5)
"As soon as your heart falls to 3000": event on General damage vs polled at turn start; if Rogue Warden is summoned with the General already at 2000, does it buff immediately; permanent after healing above 3000. The literal 3000 (and 400, 300) is a number AD-13 says not to embed. Heart Attack: only AttackAction on the General, or any damage including area hits?
Fix: check on every damage/heal to own General and at summon; values as card data.

### F13. Silence/dispel vs permanent passives (Stories 4/5; AD-7)
Duelyst silence strips modifiers: Lifegain, Body Count's accumulated +200s, Rage, Counter Attack. AD-7 models silence only as counter pause. Nobody decides if Phobies passives are silenceable.
Fix: state they are ordinary silenceable modifiers (or not); accumulated buffs live on the same modifier.

### F14. Deck purge: owner, trigger, store, and conflict with "reject" (Story 10 vs 2; AD-12 vs SPEC CAP-7)
SPEC CAP-7: such decks are rejected by validation. AD-12: deleted automatically. Different, one irreversible. Who deletes: server API, migration, or client store (local Sandbox decks are client-side)? Trigger: deploy, login, list load, launch (a deck vanishing mid-flow)? Scope: only `practice`/`sandbox` purposes, never `legacy`; old decks default to `legacy`. A future allowlist change would delete again.
Fix: choose delete or reject (recommend reject plus one-time idempotent cleanup), name module, trigger, scope.

### F15. Who registers ids in the allowlist, and ordering (Story 2/3/6-9/10)
Story 2 skeleton, Story 3 creates 35 ids, Stories 6-9 create 16 effect ids, Story 10 "makes deckable the 35". Either every story edits the list or Story 10 does everything, so earlier stories cannot run in a real match and the load-time validation of the bot list fails before Story 10. The done checkpoint is last yet effect cards need allowlisting to be usable.
Fix: the story that creates a card registers it; Story 10 only removes old ids and purges; test that every Phobies-set card is in exactly one role.

### F16. Pool exclusion vs deck editor, id lookup, ownership (Story 2 vs 10/11; AD-10 vs AD-12)
AD-10 excludes the set from every pool; SPEC says "lookups" too. The Practice/Sandbox editor, bot setup, replay deserialization and the client resource cache must resolve these ids. Dev A removes the set from card lookup and the editor is empty; Dev B keeps it. Inventory ownership counts (`allCardsAvailable` bypass in parent AD-4) unmentioned.
Fix: separate enumeration pools (excluded) from id resolution (always works); editor source is `deckable`, bypassing ownership.

### F17. AI and abilities (no story)
Rock Pulverizer with Caw Claw is in the bot deck. No story says whether the bot uses `UseActiveAbilityAction`, or that AI code tolerates null hand slots plus ability views under hex dispatch.
Fix: say the bot never uses abilities this epic and must not throw, or add a story.

### F18. Push, Bull Rush path, Behold beam: geometry and determinism (Stories 7, 8, 9; AD-8, AD-2)
- AD-8 covers ranged/lobbed/area; beam, push, dash are outside it. Stories 7, 8, 9 each extend the resolver or write private geometry in parallel.
- Bull Rush "prefers enemy tiles" with no tiebreak among equal paths; if the client computes the path and the payload holds only the destination, client and server may damage different units. Through Walls, friendly units, Methron Points, holes?
- Push: direction is the axial delta away from the caster (not pixels); blocked by Wall, unit, edge, hole: damage still dealt? Does it trigger capture?
- Beam: length (to edge or range 2), stopped by Walls, friendly fire?
Fix: add beam/dash/push to the resolver contract before Stories 7-9 start; AD-2 delta order as deterministic tiebreak; payload carries the chosen path or destination plus the deterministic rule; define blockers.

### F19. Serialization of new actions and `source=ability` (Stories 6-9, replay)
Nothing says whether embedded move/attack are child actions in the stream or inline calls. Dev A logs children with indices, Dev B logs only the parent: replays and later action indices diverge. Terrorform-created Walls need deterministic entity/card index assignment on client and server.
Fix: all consequences are SDK child actions in the existing stream referencing the parent; every new action/spell kind registered with a serialization round-trip test.

### F20. FX ownership collision (Stories 6-9 vs 11; AD-16)
Stories 6-9 tell devs to attach caster/target FX; Story 11 also does "per-skill FX and sfx". Two owners. The roster's unresolved "0 · Impact" (Pupabomb in Story 7, Koan of Horns in Story 8) gets picked independently. Thunderbomb's caster FX is the ModifierBlastAttack effect: attaching that modifier for visuals changes gameplay, breaking "client-only". Which entity carries the skill icon: unit card (Story 3 "icon") or effect card (Story 11)?
Fix: FX and sound fields belong to the effect card and are filled by its creating story; Story 11 renders only; one decision resolves "0 · Impact"; forbid modifier-attached FX that change state; name the icon carrier.

### F21. Reveal animation vs replay, spectators, hidden hand (Story 11; AD-16 vs AD-7)
The hand slot holds `null`; the effect card is a derived view. The reveal must derive from the serialized action plus card data on every client; headless server and replay ignore it; animation time must not gate the authoritative queue.
Fix: presentation runs off the action event after state mutation, never inside execute.

### F22. v2 config vs literals and stale snapshots (Story 1 vs 9, 5; AD-13)
AD-13 bans inline numbers; AD-11 and roster text hard-code 2000 Wall HP; Story 9 says 2000. Dev A reads `config.wallHealth`, Dev B follows the literal. Where General health is applied is unspecified (card HP, setup modifier, session hook). No mechanism rejects old snapshots at resume; "owner purges" is manual.
Fix: effect cards reference config keys; one setup point for General health; a ruleset config revision stored in the snapshot, mismatches rejected.

---

## S3 findings

- F23. Stat gaps: `—` ATK with `none` attack, Rusty `ranged` with blank range, Jar Cannon `lobbed`; AD-6 has defaults (melee, 1) but no `none` or `lobbed` in its list. Define explicit enums and the Rusty range.
- F24. Negative/zero attack: Peek -300 on a 200-ATK unit; clamp at 0; whether a 0-ATK unit can attack.
- F25. Stacking of Clang!, Helping Hand and Cupcake +300: additive or replace.
- F26. `[PB]` prefix: card detail, editor, replay log and effect-card names may call raw name accessors; name the accessor, forbid name-based lookups, state whether effect cards get the prefix.
- F27. Story file collisions: Kron is edited by Stories 3, 4 and 9; Story 3 owns the factory file, so name the owner per region (stats: 3; `ability` field: the effect-card story; modifiers: 4/5) and explicit order.
- F28. Developer Sandbox / legacy rejection: which layer rejects (allowlist, validator, deck purpose); Dev A in PlayCardAction only, Dev B at deck load only, leaving Developer Sandbox spawn open.
- F29. Lifegain heal: is it a heal action (heal-watch hooks, replay entry) or a direct HP set.

---

## Recommended new or tightened ADs

1. AD-17 Ability execution contract (F1, F2, F19).
2. AD-18 Damage attribution and passive trigger table, reflect recursion guard (F3, F11, F12, F13).
3. AD-19 "Damage dealt" and rounding semantics; remove the Deferred item (F10).
4. AD-20 Target vocabulary and per-ability target class and range spec (F4, F5, F8).
5. AD-21 Timed-effect clock; fix Peek duration (F7).
6. AD-22 Resolver extension for beam, push, dash with deterministic tiebreak and payload path (F18).
7. Tighten AD-12: third role, generals list, purge vs reject owner/trigger/scope, id registration ownership, enumeration vs resolution (F6, F14, F15, F16).
8. Tighten AD-13: config keys in effect cards, one General-health point, config revision in snapshot (F22).
9. Tighten AD-16: FX owned by the effect-card story, no state-changing FX modifiers, "0 · Impact" decision, presentation after state (F20, F21).
10. Data fixes: Lifegain list vs bot deck, Peek duration text, `none`/`lobbed` enums (F9, F7, F23).
