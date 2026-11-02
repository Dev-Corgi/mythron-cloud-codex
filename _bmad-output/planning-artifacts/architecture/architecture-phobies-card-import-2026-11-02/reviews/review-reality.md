# Reality Review — Phobies Card Import Spine

Scope: spine decisions checked against `duelyst/app/sdk` (submodule), `cards-data.json`, `fx_composites.json`. Method: grep/read of real files plus a script comparing roster rows to cards-data.json.

**Verdict: Mostly sound. Two high-severity gaps and several medium ones. Stats, sfx and FX ids verify; repo layout/registration and a few behavior claims need correcting before stories are cut.**

## Confirmed (matches the code or data)

- `ModifierHealSelfWhenDealingDamage` exists (`app/sdk/modifiers/modifierHealSelfWhenDealingDamage.coffee`), heals 100%, registered in `modifierFactory.coffee`, used in `core/neutral.coffee` and `misc/bosses.coffee`. An optional ratio parameter with default 1.0 is a viable, default-preserving extension.
- `ResolveMethronPointControlDamageAction` exists; the 2-per-point value is inline (`setDamageAmount(2 * controlDifference)`), as AD-13 says. v2 gate `gameSession.getIsPracticeSandboxV2()` exists.
- `UseActiveAbilityAction` exists (`sourceUnitIndex`, `getEffectCardId` reading `activeAbility.effectCardId`). Ability model has `effectCardId`, `lockdown`, `cooldown` (plus a `useRange` noted in `card.coffee` that AD-7 omits).
- The allowlist module is `app/sdk/rulesets/cardEligibility.coffee` (fits Structural Seed dir `app/sdk/rulesets/`). It already holds `BOT_ROSTER_IDS`, `NEUTRAL_CARD_IDS`, `validateDeck`, `getPracticeBotRoster`, and a branch allowing an ability's `effectCardId` as a runtime card. Consumers: server `create_single_player_game`, `routes/api/me/decks`, `routes/api/me/games`, `data_access/users`, `sdk/challenges/sandbox`, `ui/models/deck.js`, `deck_select_single_player.js`, `deck_select_sandbox.js`. One shared list for bot, presets and editor is plausible.
- Entity setters exist: `setMovementType` (walk/fly/phase), `setAttackType` (melee/ranged/lobbed/area), `setReach`, `setSpeed`, `setActionPoints`, `spendActionPoint`, `setDamage`. Roster vocabulary maps exactly.
- `rulesets/hexAttackGeometry.coffee` is the AD-8 resolver (ranged, lobbed, area, Wall obstruction).
- `FactionFactory.starterDeckForFactionLevel` and per-faction `starterDeck` exist; `ui/views/composite/deck_select.js` (~line 219) calls it.
- Roster vs `cards-data.json`: all 35 rows resolve; mana (`keys`), HP, ATK, movement type/range, attack type/range, Lockdown (`unlocking`), Cooldown (blank = 1), passive/active names all match, no discrepancies. Active/passive numbers (550, 1400, 425, 650, 300, 1500, 1100, 450, 350, 600, 550, 500, Wall 2000, Counter 0.35, regen 400, Rage 300, Heart Attack 400, Body Count 200) match.
- sfx: all 13 `apply` sounds in the roster match the real `setBaseSoundResource` of the named original spell cards.
- FX ids: every composite id in the roster lookup exists in `fx_composites.json` (including both Fireblazer / HailstoneHowler entries). The inline `0 · Impact` ids for Fire and Ice exist. `FX.Modifiers.ModifierBlast` and `FX.Cards.Faction3.Blast` exist as code FX (`modifierBlastAttack.coffee`, `data/fx.js`), not in the composites file, as the roster states.

## Findings

### F1 (High) — "one factory file each" under `cards/factory/phobies/` does not fit repo layout or registration
Existing factories are one file per set and faction (`factory/wartech/faction5.coffee`), each holding many cards in a `cardForIdentifier` chain, each manually required and chained in `cards/cardFactory.coffee`. A new set also needs a `cardSetLookup.coffee` id, a `cardSetFactory.coffee` entry (with `enabled`, orb/shop fields), ids in `cardsLookup.coffee` (with prismatic/skin derivation in `cardsLookupComplete.coffee`), and name/i18n handling. The spine lists none of these. Per-card files would be a new style, contradicting AD-15. Recommend one set file (or one per faction used), registered in `cardFactory.coffee`, and add the lookup/set-factory registration to the Structural Seed.

### F2 (High) — Pool exclusion is under-specified; real pools are generic and variants auto-multiply
Pools come from `GameSession.getCardCaches()` grouped by `getCardSetId`, `getIsLegacy`, prismatic status; there are ~284 usages of cache and hidden/legacy getters across sdk, ui and server. AD-10 requires exclusion "at the pool" for eight listed consumers but names no mechanism or file. Not addressed: new cards automatically gain prismatic/skin id variants (`+1,000,000` offsets in `cardsLookupComplete`), creating extra ids the allowlist must reject. The single `[PB] ` display-name point is also unlocated (names are i18next keys or literals on `card.name`). Recommend naming one gate (e.g. a Phobies-set flag honored in `getCardCaches`) and a test enumerating every pool consumer.

### F3 (Medium) — Allowlist is not the two-role structure described; "replaces in full" is larger than stated
Current module also has `GENERAL_SIGNATURE_IDS`, `GENERATED_DEPENDENCY_IDS` (20142, 43, 40004, each tied to specific source cards), and the ability-effect rule "effect id equals the owning unit's `effectCardId`", which is stricter than a flat `abilityEffect` list and should be kept. Planar Scout (10019) is deckable with a dev placeholder ability (`core/neutral.coffee:177`); the spec retires it but the spine does not list its removal. `validateDeck` today rejects; automatic deletion of saved decks is new behavior with no existing hook (`users.coffee:748` only validates), so it needs a named place.

### F4 (Medium) — Lifegain on ability damage is unconfirmed
The existing modifier heals in `onBeforeAction` when `action.getSource() == @getCard()`, using raw `getTotalDamageAmount()` and capping at `getDamage()`. AD-14 says ability damage counts. `UseActiveAbilityAction` sets `@_private.source = sourceUnit` on the play action, but whether the spell's child `DamageAction`s report the unit as `getSource()` was not verified (spells in the repo typically use the spell card or an explicit `setSource`). Needs a test or an explicit rule. The "post-defense or raw" deferral can be closed now: existing code uses the total damage amount before application.

### F5 (Medium) — v2 constants live in unrelated inline sites; General health has no single site
Wall health is inline `card.maxHP = 10` in the shared tile definition (`cards/factory/misc/tiles.coffee`); General health is `card.maxHP = 25` inline in each faction's General (`core/factionN.coffee`); Methron damage is inline in the action. AD-13 says "match setup reads the config", but the overrides must be applied in `gameSetup.coffee` (the v2 branch near the wall creation) through Entity accessors, not by editing factories. `rulesets/` has no config file yet, so adding one there is plausible. State that Terrorform Wall HP and neutral Wall HP share one config value.

### F6 (Medium) — Several AD-11 mechanisms have no existing hook; AD-8 is extended, not reused
No `source=ability` concept, no push/dash/beam kinds, and no "move or attack without spending an action point" path exist in `MoveAction`/`AttackAction`/`PlayCardAction`. The spine admits new kinds, but its claim that beam uses the AD-8 resolver is not true today: `hexAttackGeometry.coffee` covers ranged, lobbed and area only. Zappy's Counter Attack has a candidate reuse (`ModifierTakeDamageWatchDamageAttacker`); confirm it is damage-reflect, since v2 has no counterattack.

### F7 (Low) — Roster data issues
- Rusty: Phobies `attack_range` and `damage` are blank; roster says `ranged` with no range. Should read "none" (or be confirmed).
- The 8-card Lifegain ("Undead") list cannot be verified from `cards-data.json`: no Undead/race field exists (only `passive_lifesteal` on other cards: Suckee, Alastor, Whuffalo). The source of the list is unconfirmed.
- Beauty: data says Targeted AOE Attack, splash Yes, range 2; roster treats the basic attack as ranged single target (already a stated assumption).
- FX table lists Koan of Horns caster as "Cryonic Potential" without the `· Spell Cast` suffix used in the lookup. The lookup row "0 · Impact: Unresolved" contradicts the inline Fire/Ice ids already given for Pupabomb and Koan of Horns, which do resolve.
- Pupabomb caster FX uses Ironcliffe Guardian rather than the spell's own `FX.Cards.Spell.Pupabomb`; deliberate, but verified only by id existence.

### F8 (Low) — Misc
- `git submodule status` shows the `duelyst` path with a leading `-` (not initialized per the parent) although files are present; confirm the submodule pointer intended for story commits.
- Preset starter decks belong in the Practice/Sandbox deck selects (`deck_select_single_player.js`, `deck_select_sandbox.js`, which already call `CardEligibility.getPracticeGeneralIds()`), not in `FactionFactory`, which legacy modes keep.
- Frontmatter `binds` cites AD-1..AD-9, which are parent IDs; fine as inherited, but numbering overlaps with this spine's AD-10+.
