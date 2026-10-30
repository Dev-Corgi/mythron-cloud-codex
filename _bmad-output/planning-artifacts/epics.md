---
status: final
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - C:/Working/duelyst/_bmad-output/specs/spec-duelyst-rules-overhaul/SPEC.md
  - C:/Working/duelyst/_bmad-output/specs/spec-duelyst-rules-overhaul/rules-detail.md
  - C:/Working/duelyst/_bmad-output/specs/spec-duelyst-rules-overhaul/practice-bot-deck.md
  - C:/Working/duelyst/_bmad-output/planning-artifacts/architecture/architecture-duelyst-2026-10-30/ARCHITECTURE-SPINE.md
---

# duelyst - Epic Breakdown

## Overview

This document breaks down the Practice and Sandbox rules overhaul into implementable epics and stories. The requirements source is the approved SPEC and its companions, with the architecture spine supplying implementation constraints.

## Requirements Inventory

### Functional Requirements

FR1: Practice and Sandbox matches use the new ruleset; Developer Sandbox, Ranked, Casual, Friendly, Gauntlet, Challenges, Boss Battle, Rift, and other modes retain legacy rules.

FR2: A new-rules match has a 9-column, 5-row battlefield of 45 pointy-top hex tiles with odd rendered columns staggered downward.

FR3: New-rules board positions use axial `(q,r)` coordinates, with rendered column `c = 2q + r`, rendered row `k = floor(r/2)`, `0 <= c <= 8`, and `0 <= k <= 4`.

FR4: The first and second players' generals start at axial `(-2,4)` and `(2,4)`, respectively.

FR5: New-rules movement, pathing, attack range, targeting, adjacency, and bounds use the same six axial neighbors: `(1,0)`, `(-1,0)`, `(0,1)`, `(0,-1)`, `(1,-1)`, and `(-1,1)`.

FR6: A unit may be summoned only to an otherwise valid, available tile adjacent to its owner's general; adjacency to another allied unit alone does not permit summoning.

FR7: An attacked unit does not automatically counterattack its attacker in a new-rules match.

FR8: Each player begins with a finite 20-point mana reserve before opening allocation; the first player opens with reserve 17 and spendable mana 3, and the second with reserve 16 and spendable mana 4.

FR9: On each player's own turn end, that player alone transfers `min(3, reserve)` from reserve to spendable mana exactly once; an empty reserve transfers zero.

FR10: Playing a card spends its mana cost from spendable mana; unspent mana persists between turns without a nine-point cap or turn-start refresh.

FR11: New-rules matches do not grant bonus mana from board tiles or other effects outside the reserve-transfer rule.

FR12: Players can create separate Practice and Sandbox decks, each containing exactly one general and eight other eligible cards; existing 40-card decks remain intact and usable in legacy modes without automatic conversion.

FR13: Practice entry accepts only a valid Practice deck, and Sandbox entry accepts only a valid Sandbox deck; each rejects an invalid deck before match setup.

FR14: All eight non-general cards begin in eight fixed hand slots in a new-rules match.

FR15: Playing a card clears only its original hand slot; the other cards keep their slot indices, and no slot shifts or refills.

FR16: New-rules matches have no draw, mulligan, replacement, deck-exhaustion fatigue, or later addition, return, or other change to hand cards or slots.

FR17: Cards or effects conflicting with hex targeting, general-only summoning, no counterattack, reserve-only mana, or fixed hand slots are unavailable in Practice and Sandbox; they create no exception to those rules.

FR18: Practice and Sandbox deck editing, deck entry, generated-card creation, and match setup apply one shared audited card eligibility policy.

FR19: The Practice bot uses its general plus exactly one each of Maw (10979), Bloodtear Alchemist (19052), Golem Metallurgist (19038), Bloodshard Golem (10205), Dragonlark (10001), Flameblood Warlock (19051), Sworn Avenger (10954), and Drybone Golem (10206), with all eight cards in hand at every difficulty.

FR20: Maw's nearby damage follow-up uses hex neighbors in the new modes.

### NonFunctional Requirements

NFR1: Browser prediction, authoritative server play, local Sandbox play, and replay must agree on new-rules action legality and resulting state.

NFR2: New-rules actions, coordinates, mana balances, hand slots, and resulting state must serialize and replay deterministically.

NFR3: Historical match snapshots lacking a ruleset identifier and existing decks lacking a purpose must continue to resolve to legacy behavior.

NFR4: Unknown ruleset IDs or versions must be rejected rather than silently mapped to another ruleset.

NFR5: Legacy modes, existing 40-card decks, and their square-board rules must remain behaviorally compatible during the initial rollout.

NFR6: The UI must accurately show legal hex interactions, opening and changing mana balances, eligible deck choices, and eight stable hand slots.

### Additional Requirements

- Bind an immutable ruleset ID `practice-sandbox-hex` and version `1` to each new match. Derive it server-side from the validated Practice route or from the concrete local Sandbox class before setup. Developer Sandbox and all other entries use `legacy`; clients cannot select the ruleset.
- Persist ruleset ID and version in session and setup snapshots; resolve them before board/deck construction and action replay. Only historical snapshots with no ID default to `legacy`.
- Use shared `app/sdk` topology code for conversion, neighbors, distance, paths, range, and bounds. New-rules SDK/action/modifier/snapshot/replay positions use `{q,r}`; legacy positions use `{x,y}`. Limit conversion to explicit legacy input and display adapters; dispatch all position producers and consumers, including AI, by ruleset.
- Enforce general-adjacent summoning and suppression of automatic counterattacks in SDK action validation and resolution, not only in UI previews.
- Let SDK player and turn actions own reserve and spendable mana. Transfer at `p_endTurn` for its recorded ending player after ending the turn and before publishing `end_turn`. Disable start-turn refresh, nine-mana cap, and unspent-mana clearing only for the new ruleset.
- Give saved decks explicit purposes `practice`, `sandbox`, or `legacy`; default old decks to `legacy`. Validate matching purpose, size, general count, and card eligibility before Practice API or local Sandbox setup, ahead of the current `allCardsAvailable` bypass.
- Represent the new hand as a length-eight array with stable indices and `null` for spent slots. Play actions identify both slot and card instance, then clear the slot without splicing. Apply this to construction, deserialization, mutation, UI, snapshots, and replay.
- Publish one shared SDK allowlist of explicit audited card IDs for both new modes. Audit modifiers, follow-ups, generated cards, and general/signature effects; variants require their own audited IDs. Enforce at deck editing, Practice API entry, Sandbox launch, Practice bot setup, generated-card creation, and authoritative boundaries.
- Admit the exact fixed Practice bot roster only after Maw's nearby effect uses hex neighbors. Do not ship a substituted or partly unavailable roster.
- Implement and integrate in the required order: board, summoning, counterattack, mana, deck and hand. The architecture specifies no new service, datastore, or starter template.

### UX Design Requirements

No UX design contract was found. UI behavior explicitly required by the SPEC and architecture is captured in FR2, FR12–FR16, NFR6, and the additional requirements.

### FR Coverage Map

FR1: Epic 1 - New rules apply only to Practice and Sandbox.
FR2: Epic 1 - Render the 45-tile pointy-top hex board.
FR3: Epic 1 - Use axial coordinates for new-rules positions.
FR4: Epic 1 - Place generals at the specified starting cells.
FR5: Epic 1 - Use one six-neighbor topology for movement, range, targeting, adjacency, and bounds.
FR6: Epic 1 - Restrict summoning to tiles adjacent to the owner's general.
FR7: Epic 1 - Remove automatic counterattacks.
FR8: Epic 1 - Set finite reserves and opening spendable mana.
FR9: Epic 1 - Transfer reserve mana when the ending player ends a turn.
FR10: Epic 1 - Spend card costs and carry forward uncapped mana.
FR11: Epic 1 - Exclude mana grants outside reserve transfer.
FR12: Epic 1 - Create separate valid nine-card Practice and Sandbox decks.
FR13: Epic 1 - Validate a matching deck before each new-mode entry.
FR14: Epic 1 - Start with eight fixed hand slots.
FR15: Epic 1 - Clear only the played card's slot.
FR16: Epic 1 - Remove draws, replacement, fatigue, and later hand changes.
FR17: Epic 1 - Exclude conflicting cards and effects.
FR18: Epic 1 - Apply one audited eligibility policy at every entry and creation boundary.
FR19: Epic 1 - Use the exact fixed Practice bot roster at all difficulties.
FR20: Epic 1 - Make Maw's nearby effect use hex neighbors.

## Epic List

### Epic 1: Play complete Practice and Sandbox matches under the new rules

Players can play on a 45-tile hex board, summon beside their general, attack without automatic counterattacks, manage reserve-funded mana, and use separate nine-card decks with fixed eight-slot hands. Practice uses the specified bot roster; other modes retain their existing rules.

**FRs covered:** FR1–FR20.

**Implementation notes:** Deliver the board, summoning, counterattack, mana, then deck and hand changes in that order. Keep the new ruleset match-scoped and gate its user-visible rollout until the complete experience is ready.

## Epic 1: Play complete Practice and Sandbox matches under the new rules

Players can complete Practice and Sandbox matches on a hex battlefield with general-centered summoning, attacks without automatic counterattacks, persistent reserve-funded mana, and fixed eight-card hands. Legacy modes keep their existing rules.

### Story 1.1: Keep each match's rules consistent (FR1)

As a player,
I want a Practice or Sandbox match to retain its assigned rules when saved or replayed,
So that the match behaves consistently.

**Acceptance Criteria:**

**Given** a validated Practice entry
**When** the server creates its match
**Then** it assigns `practice-sandbox-hex` version `1` before board or deck setup
**And** a client-supplied ruleset cannot override the server's choice.

**Given** the concrete local Sandbox entry
**When** it creates a match
**Then** it assigns the same ruleset and version before setup
**And** Developer Sandbox and other modes instead use `legacy`, regardless of `GameType.Sandbox` alone.

**Given** a match snapshot or replay with a known ruleset ID and version
**When** it is restored or replayed
**Then** the persisted ruleset is resolved before actions run
**And** an unknown ID or version is rejected.

**Given** a historical snapshot with no ruleset ID
**When** it is restored
**Then** it uses `legacy`
**And** its existing square-board behavior remains available.

### Story 1.2: Play on a correctly bounded hex battlefield (FR2–FR5)

As a player,
I want a staggered hex battlefield with generals at its opposite center edges,
So that positions and distances match the new rules.

**Acceptance Criteria:**

**Given** a new-rules match
**When** its board is constructed
**Then** it contains exactly 45 pointy-top cells in nine rendered columns and five rows, with odd columns staggered down
**And** the first and second generals start at `(-2,4)` and `(2,4)`.

**Given** any rendered column `c` from 0 through 8 and row `k` from 0 through 4
**When** the shared topology converts the cell to axial position
**Then** `r = 2k + (c mod 2)` and `q = (c-r)/2`
**And** conversion back yields `c = 2q + r` and `k = floor(r/2)`.

**Given** any new-rules position
**When** neighbors, distance, paths, range, or bounds are computed
**Then** only `(1,0)`, `(-1,0)`, `(0,1)`, `(0,-1)`, `(1,-1)`, and `(-1,1)` are neighbor deltas
**And** no result treats an off-board cell as legal.

**Given** a legacy match
**When** its board is constructed
**Then** it retains its existing square positions and geometry
**And** new-rules axial positions do not replace its `{x,y}` state.

### Story 1.3: Move and target consistently on hexes (FR5)

As a player,
I want movement and targeting to agree with the hexes I see,
So that legal actions are predictable and replay correctly.

**Acceptance Criteria:**

**Given** a new-rules match
**When** SDK actions, modifiers, AI, or server validation produce or consume a position
**Then** they use axial `{q,r}` positions and the shared six-neighbor topology
**And** square-only offsets or diagonals cannot make an action legal.

**Given** a legal or illegal movement, range, or target request at a board edge
**When** the client predicts it and the authoritative action resolves it
**Then** both reach the same legality result
**And** the action payload and replay preserve the same axial target.

**Given** a legacy match or an explicitly supported legacy input adapter
**When** positions are processed
**Then** legacy `{x,y}` positions remain valid only in that context
**And** implicit conversion does not mix coordinate shapes within a new-rules action.

### Story 1.4: See and interact with the hex battlefield (FR2, FR4, FR5)

As a player,
I want the board and action previews to show the actual hex layout,
So that I can choose tiles confidently.

**Acceptance Criteria:**

**Given** a new-rules Practice or Sandbox match
**When** the battlefield renders
**Then** it shows all 45 pointy-top cells in nine columns and five rows with odd columns staggered down
**And** generals appear in the leftmost and rightmost center cells.

**Given** an axial cell or action target from the SDK
**When** the view displays it or the player selects it
**Then** the display adapter maps it to the matching rendered cell and back
**And** highlighted move, attack, and range previews agree with SDK legality.

**Given** a legacy match
**When** its board renders
**Then** the existing square layout and interactions remain available
**And** the hex adapter is not applied to it.

### Story 1.5: Summon beside the general (FR6)

As a player,
I want to summon units beside my general,
So that deployment follows the new positional rule.

**Acceptance Criteria:**

**Given** a new-rules match and an otherwise valid empty tile adjacent to the owning general
**When** the player attempts to summon there
**Then** SDK validation permits the action
**And** the UI marks the tile as a legal summon destination.

**Given** a tile adjacent to an allied unit but not the owning general
**When** a player or effect attempts to summon there
**Then** authoritative validation rejects the destination
**And** client prediction does not show it as legal.

**Given** an occupied, off-board, or otherwise invalid tile beside the general
**When** a summon is attempted
**Then** the existing destination constraints still reject it
**And** no unit is created.

**Given** a legacy match
**When** summon destinations are calculated
**Then** its existing allied-unit rule remains in effect
**And** the new general-only restriction is not applied.

### Story 1.6: Attack without an automatic counterattack (FR7)

As a player,
I want an attack to resolve without a forced return attack,
So that combat follows the new rules.

**Acceptance Criteria:**

**Given** a new-rules match with a valid attack
**When** the attacker deals damage to the defender
**Then** no automatic strikeback action is generated by the defender
**And** attack damage and other non-strikeback effects still resolve normally.

**Given** client prediction, authoritative play, or replay of the same new-rules attack
**When** combat resolves
**Then** each path yields the same health and action history
**And** no card or modifier creates an exception to the no-counterattack rule.

**Given** a legacy match
**When** an attack meets the existing strikeback conditions
**Then** its current counterattack behavior remains available
**And** new-rules suppression is not applied.

### Story 1.7: Manage persistent reserve-funded mana (FR8–FR11)

As a player,
I want mana to accumulate from my finite reserve and remain available until spent,
So that I can plan across turns.

**Acceptance Criteria:**

**Given** a new-rules match at setup
**When** opening balances are assigned
**Then** the first player has reserve 17 and spendable mana 3, and the second has reserve 16 and spendable mana 4
**And** both allocations originate from a 20-point reserve.

**Given** a new-rules player ending their own turn with reserve `R` and spendable mana `M`
**When** `p_endTurn` resolves
**Then** only that recorded ending player transfers `T = min(3,R)` once, ending with reserve `R-T` and mana `M+T`
**And** observers receive those balances before `end_turn` is published.

**Given** a new-rules player with zero reserve or unspent mana above nine
**When** a turn begins or ends
**Then** zero reserve grants no mana and unspent mana persists without a cap or refresh
**And** neither bonus mana tiles nor another effect grants mana outside the reserve rule.

**Given** a playable card with a mana cost
**When** the new-rules player plays it
**Then** that cost is deducted from spendable mana
**And** insufficient spendable mana prevents the play.

**Given** a new-rules player's opening allocation, card spending, or turn-end transfer
**When** the match view updates
**Then** it displays the current spendable mana and reserve for the correct player
**And** the displayed balances agree with SDK state.

**Given** a legacy match
**When** turns or card costs resolve
**Then** its existing mana refresh and cap behavior remain available
**And** reserve-transfer logic is not applied.

### Story 1.8: Keep conflicting cards out of new-rules matches (FR17, FR18, FR20)

As a player,
I want deck choices to contain cards that obey the new rules,
So that card effects do not break a match.

**Acceptance Criteria:**

**Given** candidate cards for Practice or Sandbox
**When** the compatibility audit runs
**Then** each admitted explicit card ID, variant, modifier, follow-up, generated card, and general/signature effect is checked against hex targeting, general-only summoning, no counterattack, reserve-only mana, and fixed hand slots
**And** unaudited or conflicting IDs are excluded from the shared SDK allowlist.

**Given** a card that draws, replaces, returns, adds, or changes hand contents or slots, grants extra mana, counters automatically, or summons outside general adjacency
**When** the policy evaluates it or an action attempts to create it during play
**Then** the shared policy rejects it
**And** its old effect does not create a rule exception.

**Given** an eligible card or an attempted generated-card creation
**When** SDK setup or an authoritative action checks it
**Then** each boundary consults the same allowlist of explicit IDs
**And** an excluded card cannot enter new-rules state through a local blacklist or bypass.

**Given** Maw's nearby damage effect in a new-rules match
**When** it selects nearby targets
**Then** it uses the six-neighbor hex topology before Maw is admitted
**And** legacy behavior remains scoped to legacy matches.

### Story 1.9: Create separate nine-card decks (FR12, FR18)

As a player,
I want separate Practice and Sandbox decks sized for the new rules,
So that I can prepare for each mode without changing my existing decks.

**Acceptance Criteria:**

**Given** the deck editor
**When** a player creates or edits a Practice or Sandbox deck
**Then** it records the matching `practice` or `sandbox` purpose and requires exactly one general plus eight eligible other cards
**And** excluded card IDs cannot be selected.

**Given** an existing deck without a saved purpose
**When** it is loaded
**Then** it resolves to `legacy` without changing its 40 cards
**And** the player can still use it in its existing modes.

**Given** a Practice deck and a Sandbox deck
**When** the player saves or reopens them
**Then** their purposes and card lists remain separate
**And** the editor displays the correct size and eligibility constraints for each purpose.

### Story 1.10: Enter matches with valid decks and the fixed Practice bot (FR13, FR18, FR19)

As a player,
I want match entry to accept the right deck and Practice opponent,
So that a match starts in a valid state.

**Acceptance Criteria:**

**Given** a selected Practice deck
**When** the Practice server route validates match entry
**Then** it accepts only purpose `practice`, exactly one general, eight eligible cards, and the shared eligibility policy before setup
**And** it rejects an invalid deck before the existing `allCardsAvailable` bypass.

**Given** a selected Sandbox deck
**When** the concrete local Sandbox launch validates match entry
**Then** it accepts only purpose `sandbox`, exactly one general, eight eligible cards, and the same policy before setup
**And** an invalid deck cannot construct a new-rules match.

**Given** any Practice bot difficulty and general
**When** its deck is built
**Then** it uses that general plus exactly one each of Maw (10979), Bloodtear Alchemist (19052), Golem Metallurgist (19038), Bloodshard Golem (10205), Dragonlark (10001), Flameblood Warlock (19051), Sworn Avenger (10954), and Drybone Golem (10206)
**And** setup fails if this exact roster is substituted, incomplete, or excluded by the allowlist.

**Given** a legacy mode
**When** its deck is validated for entry
**Then** its existing deck rules remain applicable
**And** the new purpose and allowlist checks do not reject a valid legacy deck.

### Story 1.11: Start with eight fixed hand slots (FR14, FR15, FR19)

As a player,
I want all eight deck cards in stable hand slots from the start,
So that I can see and use my complete new-rules hand.

**Acceptance Criteria:**

**Given** a valid new-rules deck for either player or the Practice bot
**When** match setup creates the hand
**Then** all eight non-general cards occupy indices 0 through 7 in a length-eight array
**And** no opening draw, mulligan, or replacement changes them.

**Given** a new-rules card play identifying a slot and card instance
**When** the authoritative action resolves
**Then** that slot becomes `null` and the other seven indices retain their cards or prior `null` values
**And** a mismatched, empty, or stale slot/card pair is rejected.

**Given** a new-rules hand during rendering, save, restore, or replay
**When** a slot is empty
**Then** its empty position remains visible or represented at the same index
**And** no serialization or UI mutation splices or shifts the array.

**Given** a legacy match
**When** its hand is created and cards are played
**Then** its existing hand size and mutation behavior remain in effect
**And** the fixed eight-slot representation is not imposed.

### Story 1.12: Finish matches without hand refills or fatigue (FR16)

As a player,
I want my fixed hand to remain predictable through the match,
So that ending turns or exhausting cards does not change its contents unexpectedly.

**Acceptance Criteria:**

**Given** a new-rules match after setup
**When** a turn ends or a deck/hand mutation path runs
**Then** no draw, refill, replacement, return, card addition, or slot shift occurs
**And** spent slots remain `null`.

**Given** all eight new-rules hand slots are spent
**When** a turn ends or another action resolves
**Then** no deck-exhaustion fatigue occurs
**And** the player can continue using legal non-card actions.

**Given** a Practice and a Sandbox match using valid nine-card decks
**When** each is played, saved, and replayed through board movement, summoning, attack, mana transfer, and card spending
**Then** both produce deterministic new-rules state with eight stable hand slots
**And** a representative unaffected mode still produces its legacy state and behavior.
