# Epic 1 Context: Play complete Practice and Sandbox matches under the new rules

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Allow players to complete Practice and Sandbox matches using a consistent, match-scoped ruleset with a 45-cell hex battlefield, general-centered summoning, no automatic counterattacks, finite reserve-funded mana, and separate nine-card decks with fixed eight-slot hands. Keep unaffected modes and existing 40-card decks on their current legacy behavior throughout the initial rollout. Implement the changes in the approved order: board, summoning, counterattack, mana, then deck and hand.

## Stories

- Story 1.1: Keep each match's rules consistent
- Story 1.2: Play on a correctly bounded hex battlefield
- Story 1.3: Move and target consistently on hexes
- Story 1.4: See and interact with the hex battlefield
- Story 1.5: Summon beside the general
- Story 1.6: Attack without an automatic counterattack
- Story 1.7: Manage persistent reserve-funded mana
- Story 1.8: Keep conflicting cards out of new-rules matches
- Story 1.9: Create separate nine-card decks
- Story 1.10: Enter matches with valid decks and the fixed Practice bot
- Story 1.11: Start with eight fixed hand slots
- Story 1.12: Finish matches without hand refills or fatigue

## Requirements & Constraints

- Select one immutable, versioned ruleset for each match. Practice's validated server entry and the concrete local Sandbox entry use `practice-sandbox-hex` version `1`; Developer Sandbox and every other mode use `legacy`. Do not infer the ruleset from `GameType.Sandbox`, and do not accept a client-selected ruleset.
- Persist and resolve ruleset identity before board/deck setup and before replay actions. Reject unknown IDs or versions. Snapshots without an ID and old decks without a purpose retain legacy behavior.
- New-rules geometry is a 9-column by 5-row pointy-top hex board. Use axial `{q,r}` positions, one shared six-neighbor topology for movement, targeting, distance, range, adjacency, pathing, and bounds; the generals start at `(-2,4)` and `(2,4)`. Keep legacy `{x,y}` square behavior.
- Enforce general-adjacent summoning and no automatic counterattack in SDK validation/resolution, consistently for prediction, server play, local play, and replay.
- Each player has a 20-point reserve before opening allocation: first player `(reserve, mana) = (17,3)`, second `(16,4)`. On that player's own turn end, transfer `min(3,reserve)` exactly once before publishing `end_turn`. Card play spends spendable mana. New-rules unspent mana persists without a cap or refresh; no other effect grants mana.
- Practice and Sandbox decks have distinct purposes, exactly one general plus eight eligible cards, and must be validated before setup. Existing 40-card legacy decks remain unchanged. New-rules hands are length-eight arrays with stable indices and `null` spent slots; playing clears the selected slot without shifting. No draws, replacements, fatigue, refills, returns, or later hand changes.
- Use one shared SDK allowlist of explicit audited card IDs at editing, Practice API entry, local Sandbox launch, bot setup, generated-card creation, and authoritative action boundaries. Audit effects, modifiers, follow-ups, generated cards, and general/signature effects; variants need their own IDs. The Practice bot must use its specified exact roster at every difficulty, and Maw must use hex neighbors before admission. Do not ship a substituted or incomplete roster.
- Gate user-visible rollout until the complete experience is ready. Preserve behavior in Ranked, Casual, Friendly, Gauntlet, Challenges, Boss Battle, Rift, Developer Sandbox, and other legacy modes.
- Prediction, authoritative play, local Sandbox, and replay must agree; actions, coordinates, mana, hands, and snapshots must serialize and replay deterministically.

## Technical Decisions

- Implement the new rules, topology, and eligibility policy in shared `app/sdk` code used by browser and server. `GameSession` owns match ruleset identity; board and geometry helpers dispatch by ruleset; actions own state changes. API and UI consume the same eligibility contract. No new service, datastore, or infrastructure is required.
- Store new-rules coordinates as axial `{q,r}` throughout SDK, action payloads, modifiers, snapshots, and replay. For rendering, `c = 2q + r`, `k = floor(r/2)`; conversion from `(c,k)` uses `r = 2k + (c mod 2)`, `q = (c-r)/2`. Keep conversion at explicit legacy-input and display adapters.
- Turn-end reserve transfer is performed by `p_endTurn` for its recorded ending player after turn end and before the `end_turn` event. Guard legacy-only refresh, cap, and mana-clear paths by ruleset.
- Validate deck purpose, count, general, and eligibility before the existing `allCardsAvailable` bypass. Apply that same policy at all authoritative and creation boundaries.
- Existing code touchpoints include `app/sdk/board.coffee`, `app/sdk/gameSession.coffee`, `app/sdk/player.coffee`, `app/sdk/gameSetup.coffee`, `app/sdk/cards/deck.coffee`, strikeback modifiers/actions, and `app/common/config.js`; inspect call sites and adjacent tests before deciding exact edits.

## Cross-Story Dependencies

- The sequence is board/topology (Stories 1.2–1.4), summoning (1.5), counterattack (1.6), mana (1.7), then card eligibility, decks, entry, and hand behavior (1.8–1.12). Ruleset binding and persistence (1.1) must be established before those rules can safely dispatch by match.
- Deck creation, entry validation, Practice bot setup, and fixed-hand logic all depend on the same eligibility policy. The fixed bot roster cannot be enabled until its cards, including Maw's hex-neighbor effect, pass the audit.
- Legacy compatibility is a constraint across every story: test and preserve legacy state shape and behavior while new-rules state is introduced.
