# Rubric Review: Phobies Card Import Architecture Spine

Reviewer: rubric walker (reviewer-gate good-spine checklist). Spine, parent spine, SPEC, card-roster and practice-bot-deck read in full. Code spot-checked under `duelyst/app/sdk`. No spine or spec file was edited.

## Verdict

Sound and mostly well-scoped, but not ready to hand down as final. Three high findings (no-attack units, allowlist model vs. the real module, deck auto-deletion vs. the spec) and several medium divergence points need a fix or an explicit Deferred entry. Coverage of CAP-1..CAP-7 is complete in the map. Inherited ADs are mostly honored; supersessions are explicit for AD-9 but not for AD-1's immutability.

## Checklist walk

| Checklist item | Result |
| --- | --- |
| Fixes real divergence points, misses none | Partial: see H1, H4, M1, M2, M5 |
| Every Rule enforceable and prevents its divergence | Partial: AD-10 (pool exclusion, display name), AD-11 (play-card, AP bypass), AD-14 (scope) |
| Nothing in Deferred lets two units diverge | Mostly; Lifegain basis is a mild exception (M4) |
| Ratifies rather than contradicts the codebase | Partial: setters claim, allowlist shape, v1/v2 id check (H2, H4, L2) |
| Covers every CAP | Yes (CAP-1..7 mapped); CAP-1 "none" attack and CAP-7 "rejected" are mis-specified (H1, H3) |
| No new AD weakens an inherited AD | AD-13 changes the "immutable ruleset" premise without saying so (M3); AD-12 "replaces in full" vs parent AD-5/AD-4 (H2) |
| Altitude dimensions decided/deferred/open | Test fixture source, id allocation, resource/build registration silent (M2, M6) |

## Findings

### High

**H1. No-attack units are not decided (divergence point; CAP-1).**
Roster has "none" attack type for BOOM, Cupcake, Rusty, KABOOM (and empty ATK for Doctor-style ability-only units). `Entity.setAttackType` (`entities/entity.coffee:390`) accepts only `melee|ranged|lobbed|area`; there is no "none". The spine's AD-10 says stats are set "with existing Entity setters" and says nothing about how an attack-less unit is represented (ATK 0? a can-attack flag through the Entity accessor per AD-6? a new type?). Each story author for those four cards will pick differently, and the choice touches AD-6 (Entity accessors are the sole authority on acting), the AI, and the card UI. Rusty's roster row also reads `ranged ` with a blank range and no ATK; flag it in the roster. Fix: add a Rule (in AD-10 or a new AD) fixing the representation, owned by Entity, plus the Rusty roster correction.

**H2. The "two-role allowlist replacing the previous list in full" does not match the real module (AD-12 vs `rulesets/cardEligibility.coffee`).**
The module has more categories than `deckable` and `abilityEffect`: `GENERAL_SIGNATURE_IDS` (Bloodbound spells legal at runtime per general, `isSignatureId`), `GENERATED_DEPENDENCY_IDS` (20142, 43, 40004, gated by root card ids 10979, 19052, 20301, 20181), Wall and Methron Point tiles, and effect legality that today is decided by `UseActiveAbilityAction.getEffectCardId` on the source unit, not by a list role. "Replaces in full" can drop signatures, tiles and dependency rules, or leave two sources of truth for ability effects (list role vs `unit.activeAbility.effectCardId`). Also `isNewRules` compares ruleset id only (version ignored), so a full replacement also changes legality for saved or replayed `practice-sandbox-hex` v1 matches, which parent AD-1 says are never reinterpreted. Fix: enumerate the roles that survive (signature, generated dependency, tile, general) and state that the 35 cards' own generated dependencies are audited per parent AD-5; state that each `effectCardId` must be in `abilityEffect` (validated at load) and is the single source; state the v1 replay behavior (or route through `getIsPracticeSandboxV2` per parent AD-1).

**H3. Automatic deletion of saved decks contradicts the spec and the parent (AD-12).**
SPEC CAP-7 says existing decks with removed cards "are rejected by validation". AD-12 says they are "deleted automatically". That is a permanent data deletion the spec did not ask for, and it conflicts with the parent's stance that existing decks stay untouched (AD-4, Compatibility convention). Fix: reject at validation (the existing `validateSavedDeck` already returns invalid) and leave deletion, if wanted, to the project owner as a separate decision.

**H4. Stat-setting claim and verification fixture do not match the codebase (AD-10, AD-6 reuse).**
AD-10 says "Stats are set with existing Entity setters". In the repo, HP and ATK are plain factory properties (`card.maxHP = N`, `card.atk`), movement distance and range are `speed` and `reach`, and only `setMovementType` and `setAttackType` are setters (`entity.coffee:376,390`). There is no `setMaxHP`/`setATK`/`setMana`. Authors will follow either reading. Fix: name the actual mechanism (factory properties plus the two type setters). Separately, the stat test "compares all 35 cards to `cards-data.json`", which per the roster lives at `C:\Working\PhobiesGallery\cards-data.json`, outside the repo. A test that depends on an external path will not run in CI or for other contributors. Fix: vendor a fixture (or generate a repo-owned snapshot) and state its location and refresh rule.

### Medium

**M1. Ability-sourced embedded actions and attribution are under-specified (AD-11, AD-14, AD-6).**
Cassowary (move + attack for one AP), Mr Tramples (dash), Beauty (beam) rely on actions with `source=ability` that "spend no further points". AD-6 says modifiers, actions and validators never branch on AP; only Entity accessors decide. The spine does not say how an embedded action bypasses AP without branching (a single Entity-owned "ability-sourced" path is the obvious one). It also does not say that damage dealt by an effect spell has the caster unit as `DamageAction` source, which is exactly what `ModifierHealSelfWhenDealingDamage` checks (`action.getSource() == @getCard()`), what Body Count needs, and what CAP-6's "including its active abilities" requires. Effect spell cards would otherwise be the source. Fix: add both rules to AD-11. Also state whether reflected Counter Attack damage can itself be reflected, trigger Lifegain, or be a "counterattack" under AD-3 (naming clash with the suppressed automatic counterattack).

**M2. Pool exclusion has no single enforcement point (AD-10, CAP-2).**
"Every legacy card pool ... excludes the Phobies set at the pool" names eight pools but no shared predicate. `CardFactory` already has a central filter (`cardFactory.coffee:231`, `getIsHiddenInCollection() and getIsAvailable()`), and `CardSet` (`cardSetLookup.coffee`) has no Phobies member yet. Separate edits per pool is the classic way to miss one. Also "never leak into ... lookups" conflicts with needing id lookup in v2 matches; state that lookup by id works but pool enumeration excludes. Fix: one shared exclusion predicate keyed on the new `CardSet.Phobies`, used by all pools, with a test enumerating every pool; state the lookup-versus-pool distinction.

**M3. AD-13 silently weakens the parent's immutable-ruleset paradigm.**
The parent paradigm and AD-1 persist ID and version once so a match replays under fixed rules. AD-13 changes General health, Methron damage and Wall health under the same `practice-sandbox-hex` v2 (spec says no new version), with no per-match constant storage and an owner purge of old saves. That is a defensible choice (spec mandates it), but it is a supersession of AD-1's premise and should be listed in the Inherited table as changed, as AD-9's values are. Also `ResolveMethronPointControlDamageAction` hard-codes `2 *` and `tiles.coffee:83` hard-codes `maxHP = 10` in the shared Wall factory used by v1; the spine should say that the factory reads the config only for v2 (via the AD-1 helper) so v1 keeps 10.

**M4. Lifegain basis deferred (Deferred item 2).**
Current modifier heals in `onBeforeAction` using `getTotalDamageAmount()`, so the existing behavior is a pre-damage heal on computed amount. Deferring "post-defense or raw" to implementation is low-risk only because one modifier serves all eight cards; record the existing basis as the default and require the ratio change not to alter it, or decide it. Also note the modifier needs a `createContextObject`-style parameter and `modifierFactory` registration (three existing references) for the ratio to serialize.

**M5. Effect cards "not playable through play-card" vs the real flow.**
`UseActiveAbilityAction` extends `PlayCardAction` and runs through the play-card validator path (`validatorPlayCard.coffee`, `isAllowedRuntimeCard` `sourceAction instanceof UseActiveAbilityAction` branch). The Rule should say "not playable by a player-submitted PlayCardAction; legal only as the card of a UseActiveAbilityAction from the owning unit", otherwise the validator is ambiguous.

**M6. Operational and build envelope silent.**
Not stated, decided or deferred: card id range reservation for 35 + 16 new cards and which lookup files register them (cardsLookupComplete, resource packs), where the one display-name point lives, and how the existing view-layer Phobies code (`GameLayer.js` keys `usePhobiesUnitFace` on ruleset id; `PhobiesCollectionCardVisual.js`) relates to the new card set (it may overlap or conflict with AD-10/AD-16). Parent defers deployment and version skew; the spine should say it inherits that, since new card data on a skewed client would break v2 matches.

### Low

- L1. Frontmatter `binds` lists `AD-1..AD-9` as bound; they are inherited, fine, but `CAP-7 -> AD-4` in the map is odd (AD-4 is the 8-slot hand; the bot roster rule is AD-5).
- L2. `isNewRules` compares id only; AD-1 requires the single `getIsPracticeSandboxV2` helper. Existing debt, but AD-12 touches the module and should not extend it.
- L3. Attack presentation for imported units (ranged projectiles, area-attack visuals, unit attack sounds) is not covered by AD-16, which covers ability FX only; "sprite" copied from the original may not carry attack FX.
- L4. Heart Attack and Rage: whether ability damage counts for the +400 and the Rage threshold check timing are left to stories; cheap to decide with M1.
- L5. The `0 · Impact` FX in the roster is unresolved; AD-16 handles it by requiring a report, which is acceptable.

## Spot checks against the codebase

| Claim | Result |
| --- | --- |
| `ModifierHealSelfWhenDealingDamage` heals the damage dealt, capped at missing Health | Confirmed (`onBeforeAction`, caps with `getDamage()`); used in `core/neutral` and `bosses`, so default ratio 1.0 preservation matters |
| `UseActiveAbilityAction` with `effectCardId` and `activeAbilityState` | Confirmed; extends `PlayCardAction`, costs one AP via `recordActiveAbilityUse`, effect id from unit `activeAbility.effectCardId` |
| AD-5 allowlist module | Exists as `rulesets/cardEligibility.coffee`; shape differs from AD-12 (H2) |
| Entity setters for stats | Only partly (H4) |
| `getIsPracticeSandboxV2` helper | Exists on `Entity` and `Rulesets`; `cardEligibility.isNewRules` bypasses it (L2) |
| Wall 10 Health, Methron `2 *` | Confirmed inline in `tiles.coffee` and `resolveMethronPointControlDamageAction.coffee`; AD-13 is needed |
| New `Phobies` card set | `CardSet` ends at `Coreshatter: 8`; needs a new member |

## Recommended disposition

Autofix: H4 wording, M5 wording, L1. Discuss with the owner: H1, H2, H3, M1, M2. Add to Deferred or Open: M6, L3, L4.
