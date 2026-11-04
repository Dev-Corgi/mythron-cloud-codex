# Phobies import implementation audit

Scope: all 15 entries in `../specs/spec-phobies-card-import/stories.yaml`, compared with the import SPEC, roster, architecture AD-10–17, current code and existing tests. Baseline is the current `cardimplement` revision recorded by the repair spec. No historical frozen story intent is edited.

## Confirmed defects and repair evidence

1. `sdk/cards/factory/phobies/abilities.coffee`: Raising Hell inherits the self-destruct one-shot hook and kills Red Synja. Existing `active_abilities.js` tests explicitly assert that erroneous death. Keep its area damage and caster attribution, remove only inherited self-killing, and assert caster survival.
2. Gotcha rejects Generals in both its `canTargetGeneral` flag and effect guard, contrary to AD-17. Permit enemy Generals; preserve ally/range restrictions and two affected-owner turn ends.
3. `sdk/validators/validatorEntityAction.coffee` rejects embedded attacks at zero AP before consulting `getCanAttack(isAbilityOrigin)`. A root ability using the last point therefore loses Caw Claw/Bull Rush/Smashface attacks. Honor validated provenance, never arbitrary client flags. Test all three from one AP with final zero points.
4. `neutral.coffee` card 50032 has Lockdown 0 instead of source/roster 1. Compare all 16 ability metadata rows rather than a hand-selected subset.
5. Caw Claw/51012 copies Flash Freeze art; Knucklestorm's real symbol is `Cards.Spell.Kindle` in `coreshatter/faction2.coffee`. `PhobiesCollectionCardVisual.js` additionally substitutes a melee icon for 51012 and Divine Bond for Aperion's Claim/51007. Actual atlases are `iconKindleIdle` and `iconGreaterGoodIdle`; use real atlas frame data, never guessed substitutes. Other 15 effect source mappings match the roster.
6. `sdk/actions/phobiesPushAction.coffee` changes the victim's position, but `GameLayer._showActionForGame` never handles this action. Capture the victim's pre-push coordinate in serializable action data and replay movement on the target node, preserving caster provenance. The prior generic MoveAction fallback cannot cover this action.
7. FX resource lists do not correspond to engine event lookup. `DATA.dataForIdentifiersWithFilter` resolves a single map per event from the last matching resource, so combining full spell maps chooses the wrong caster side. Pupabomb and movement skill lists resolve no cast/applied effects at all. Create aliases from existing leaves in `app/data/fx.js`; no new assets. `GameLayer._showAction` currently sets both spell source and target FX to the effect center, so unit ability caster FX must instead use a captured pre-effect caster position.
8. `starter_ai.js::_findBestUnitAbilityAction` scores generic target positions without validating source-aware actions. Terrorform occupied/hole cells and Behold off-axis enemies can win, repeat as invalid and cause EndTurn despite legal alternatives. `view/Player.js::showCardTiles` highlights the same illegal generic positions. Share legal target selection backed by non-emitting SDK action validation and use it in both consumers.
9. `cardEligibility.coffee` accepts all 18 Generals in v2 but retains only nine signature pairs. Add the remaining canonical pairs for v2, preserving the v1 map: 101→20176 Blink, 123→20177 Arcane Heart, 152→20302 SwordsBBS, 201→20178 Wind Shroud, 301→20180 Shadowspawn, 355→20303 SacrificeBBS, 418→20183 Seeking Eye, 449→20305 EggBBS, 501→20184 Warbird. Derive current signature ownership from the General's canonical data rather than accepting another General's card.
10. New General runtime paths need scoped dependencies: Blink's FollowupTeleport, Arcane Heart's Heartseeker 108, Wind Shroud's Iron Dervish 225, Shadowspawn's Wraithling 315, Sacrifice's SpawnEntity/Husk 20058/346, and EggBBS's Egg/Ripper 411/442. Preserve ownership and causal-parent restrictions; never broadly allow arbitrary token creation. SwordsBBS generates hand cards and Seeking Eye draws: the import SPEC explicitly says conflicting abilities remain unavailable until reconciled. Keep those two unusable without consuming counters/AP/mana; do not invent new fixed-hand behavior.
11. Story 1 audited only names ending in BBS. Missing v2 scaling: Roar +2 ATK→+200; Afterglow heal3→300; Overload +1 ATK→+100; Abyssal Scar damage1→100; Warbird damage2→200; Kinetic Surge +1/+1→+100/+100 for current-turn and future summons. DebuffBBS and SacrificeBBS already scale. Sites include `spellApplyModifiers`, `spellHeal`, `spellDamage`, `spellKineticSurge`, `spellApplyPlayerModifiers`. Scale effect magnitudes only; durations, counts, spawned-token base stats and ordinary/legacy spell uses stay unchanged. Warbird also builds legacy `{x,y}` targets from a hex General and needs axial geometry.
12. PB models are explicitly added to `ui/collections/cards.js` for the intentional PB browse tab. The crafting branch in `views2/collection/cards_collection.js` admits them in All Cards alongside distinct original IDs, so ID deduplication cannot remove those lookalikes. Exclude PB from legacy crafting through the shared card-pool policy, retaining explicit PB browsing and Practice/Sandbox deck editing.
13. `test/unit/view/entity_node_move_fallback.js` caches a mocked EntityNode globally. Running the whole view suite yields 69 passing and a TileNode setup failure (`EntityNode.extend is not a function`). Restore module cache/global state so suites pass together.
14. Fourteen existing `active_abilities.js` failures use retired Golem Metallurgist/Planar Scout deployment fixtures. Replace fixture roles with eligible imported units while preserving the original state, hand-slot, silence, timing and General assertions. Do not waive failures or weaken contracts.

## FX source leaves

All paths below are under the real exported `FX` object. Assign caster/target events explicitly; verify actual DATA resolution and coordinates, not just nonempty identifier strings.

| Skill | Caster source | Target source |
|---|---|---|
| Pupabomb | Cards.Faction1.IroncliffeGuardian.UnitAttackedFX | Modifiers.ModifierGenericDamageFire.ModifierTriggeredFX[0].impactFX |
| Flash Reincarnation | Cards.Spell.Amplification.SpellCastFX | Cards.Spell.DampeningWave.SpellAppliedFX |
| Flash Freeze | Cards.Neutral.Fireblazer.UnitAttackedFX | Cards.Spell.BlindingSnowstorm.SpellAppliedFX |
| Boulder Hurl | create Cards.Spell.DropLift.SpellAppliedFX; remove Cards.Spell.ArtifactDefiler.SpellAppliedFX | none |
| Knucklestorm / Spiral Counter | Factions.Neutral.UnitSpawnFX | existing real attack reactions |
| Phoenix Fire | Factions.Neutral.UnitSpawnFX | Cards.Spell.PhoenixFire.SpellAppliedFX |
| War Surge | Cards.Spell.WarSurge.SpellCastFX | none (native map has no SpellAppliedFX; confirmed during repair) |
| Koan of Horns | Cards.Spell.CryonicPotential.SpellCastFX | Modifiers.ModifierGenericDamageIce.ModifierTriggeredFX[0].impactFX |
| Blindscorch | Cards.Spell.DropLift.SpellCastFX | Cards.Spell.Polarity.SpellAppliedFX |
| Holy Immolation | Cards.Spell.FollowupDamage.SpellAppliedFX | existing damage reactions |
| Aperion's Claim | Cards.Spell.AperionsClaim.SpellCastFX | Cards.Spell.AperionsClaim.SpellAppliedFX |
| Thunderbomb | Cards.Faction3.Blast.UnitPrimaryAttackedFX | existing beam attack presentation |

`FX.Modifiers.ModifierBlast` does not exist. Do not silently substitute a different named effect.

## Coverage and limits

| Stories | Audit outcome |
|---|---|
| 1 | Config/setup/Methron/Wall values correct; incomplete signature scaling/hex handling found |
| 2 | Attack type none and guard present |
| 3–4 | 35 standalone IDs/stats/set/pool exclusion match source; metadata/icon gaps found |
| 5 | Last-point exemption defect; existing silence/stun/counter wiring present |
| 6 | Played-card classifier and opponent-only reveal connected; FX placement gaps found |
| 7–8 | All 6 passive and 2 Lifegain tests pass; hooks and attribution inspected |
| 9–12 | Target/duration/geometry inspected; concrete effect defects listed above |
| 13 | Candidate legality defect found |
| 14 | Shared eight-card roster/presets/purge ownership correct; General expansion and crafting leak found |
| 15 | Wrong art and unresolved FX found; prior done status did not establish live gameplay verification |

Baseline effect suites: 40 passing, 14 failing. No live client playback or sound observation was available in this audit. A build and integrated automated checks are required; do not claim manual visual verification.

Raising Hell's Phobies prose says distance-two line of sight, its display prose says straight line, and its approved Story 10 uses direct-delivery/Wall geometry without an axis constraint. Preserve existing geometry in this repair; this contradictory requirement needs a separate decision. Rage triggering on initial summon while the General is already below threshold is also not explicit; no speculative behavior change.

The later action-model/Rush SPEC creates future stories and explicitly excludes implementation in that run. Do not implement those new features as import regression fixes.
