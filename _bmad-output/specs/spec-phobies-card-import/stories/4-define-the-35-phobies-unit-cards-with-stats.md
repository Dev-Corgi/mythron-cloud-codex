---
title: 'Story 4: Define the 35 Phobies unit cards with stats'
type: 'feature'
created: '2026-11-03'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '62787f84401d39c1f5e1331ee9137d1702e82f2d'
context:
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-phobies-card-import/card-roster.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-phobies-card-import-2026-11-02/ARCHITECTURE-SPINE.md'
  - '{project-root}/PhobiesGallery/cards-data.json'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Phobies set and eligibility boundary exist, but its 35 reserved IDs do not resolve to playable unit definitions. The Practice/Sandbox v2 card roster needs Phobies-derived stats while preserving Duelyst identity and assets.

**Approach:** Define each imported card as an independent neutral Unit with its reserved Phobies ID, original Duelyst name and animation/portrait resources, Phobies mana/health/attack/movement/range values, and a persistent reference to its original Duelyst card ID. Register the full roster with the existing eligibility module and verify every imported stat against the checked-in PhobiesGallery source data.

## Boundaries & Constraints

**Always:** Follow SPEC.md CAP-1 and AD-10/AD-12. Use `card-roster.md` as the approved mapping of Phobies units to Duelyst names/assets and interpreted stats. Set `factionId` to Neutral and `cardSetId` to Phobies. Use `setSpeed`, `setReach`, `setMovementType`, and `setAttackType`; map source Walking/Flying/Bypassing to `walk`/`fly`/`phase`. Use attack type `none` for ability-only units. Store the mapped Duelyst source card ID on the imported card as serialized `originalCardId`; do not persist or copy the source card definition. Keep `[PB] ` prefixing at the shared Phobies display-name boundary. Register all 35 IDs in the existing eligibility module. The existing source snapshot has blank numeric values; normalize those deliberately in the parity test and assert the roster's no-attack interpretation.

**Never:** Add or copy Duelyst abilities/passives, rarity progression, art, or unrelated eligibility behavior. Do not change source Duelyst card definitions. Do not make imported cards available in legacy collections or pools.

</frozen-after-approval>

## Code Map

- `duelyst/app/sdk/cards/factory/phobies/neutral.coffee` — replace the placeholder with the 35 factory definitions; use existing card factory resource references only for the mapped original name/portrait/animation data, and populate Phobies stats on newly constructed Units.
- `duelyst/app/sdk/cards/cardsLookup.coffee` — reserved IDs and roster order are already defined; preserve those IDs and ordering.
- `duelyst/app/sdk/cards/card.coffee` — add a public serialized `originalCardId` property with a null default if needed for the required source-card link.
- `duelyst/app/sdk/rulesets/cardEligibility.coffee` — register all 35 IDs in its existing explicit allowlist; preserve the v1/v2 and legacy pool boundaries.
- `duelyst/test/unit/sdk/cards/phobies_factory.js` — assert every card's ID, source link, set/faction, and all imported stats against `PhobiesGallery/cards-data.json`, using the approved roster map for movement/attack interpretations.
- `duelyst/test/unit/sdk/game/card_eligibility.js` — replace the Story 3 placeholder assertion with a real factory-resolution and Phobies set assertion.

## Tasks & Acceptance

**Execution:**
- [x] `duelyst/app/sdk/cards/factory/phobies/neutral.coffee` — define exactly IDs 50001–50035 as new neutral Units; map every source ID, name, and existing Duelyst animation/portrait resource from `card-roster.md`; assign Phobies mana, max HP, attack (zero for blank), movement speed/type, and attack reach/type.
- [x] `duelyst/app/sdk/cards/card.coffee`, `duelyst/app/sdk/cards/factory/phobies/neutral.coffee` — expose and populate a serialized `originalCardId` link without copying source definitions or changing source cards.
- [x] `duelyst/app/sdk/rulesets/cardEligibility.coffee`, `duelyst/test/unit/sdk/game/card_eligibility.js` — verify the pre-existing explicit allowlist contains every roster ID and test direct resolution while preserving the existing eligibility rules.
- [x] `duelyst/test/unit/sdk/cards/phobies_factory.js` — compare the 35 definitions' mana, health, damage, movement and attack stats to the repository snapshot, asserting the roster's explicit conversions for blanks, Bypassing, and Targeted AOE.

**Acceptance Criteria:**
- Given any reserved ID from 50001 through 50035, when CardFactory resolves it, then it returns a newly constructed Unit with that ID, Neutral faction, Phobies set, the mapped Duelyst name/resources, and the matching `originalCardId`.
- Given any imported card, when its stats are read, then mana equals Phobies `keys`, max health equals `health`, attack equals `damage` (blank means zero), movement speed equals `move_range`, and movement type maps Walking/Flying/Bypassing to walk/fly/phase.
- Given a card with an attack, when its attack stats are read, then its attack value, attack type, and range match the approved roster; Targeted AOE maps to `area`, lobbed remains `lobbed`, and blank attacks use `none` with zero damage.
- Given a Phobies card is serialized and deserialized, when its source link is read, then `originalCardId` remains the mapped Duelyst card ID.
- Given v2 deck eligibility or legacy pool filtering is evaluated, when a Phobies card is encountered, then the existing Story 3 allowlist and legacy exclusions continue to behave as specified.
- Given the factory parity test runs against the checked-in source snapshot, when all roster entries are checked, then all 35 cards pass without skipping or filtering any fixture row.

## Verification

**Commands:**
- `./node_modules/.bin/mocha -t 1000 test/unit/sdk/cards/phobies_factory.js test/unit/sdk/game/card_eligibility.js`
  - Result: 13 passing (495ms)

## Spec Change Log

## Review Triage Log

- high — `neutral.coffee` used `setDamage` for the Phobies attack stat; that setter records received damage while `getATK` reads `atk`, leaving imported units at zero attack and zero current HP. Fixed by setting `atk` and keeping received damage at zero; the focused suite verifies both values.
- medium — `phobies_factory.js` accepted any positive `originalCardId`, so a valid but incorrect source card could pass presentation parity. Fixed with exact source ID and canonical Duelyst name expectations for all 35 cards.
- false — the resource-presence concern is resolved for required sprites, which are now asserted non-null. Missing portrait resources on these minions are expected: existing portrait setters are used for General factories, while the imported minions inherit only the resource values present on their originals.
- medium — fixture-derived attack expectations did not independently assert the approved roster's special attack types/ranges. Fixed by adding explicit per-card attack type/range tuples and cross-checking them against source snapshot fields.
- medium — an unresolved mapped Duelyst card could have returned an incomplete Phobies card. Fixed by throwing at the lookup boundary; the parity test also resolves every mapped source and verifies its sprite.
- medium — verification-gap review independently found the source-ID/name mapping assertion gap above. Same root cause and fix as the second finding; exact pairs are now asserted for all imported cards.
