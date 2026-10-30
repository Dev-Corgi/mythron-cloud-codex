# Adversarial review — architecture spine

Verdict: **Revise before finalizing.** The spine has the right shared-ruleset direction, but several contracts still permit independently built units to exchange incompatible data or select different rules.

## High — Match entry can disagree on ruleset authority

**Pair:** A Practice UI developer sends `practice-sandbox-hex` with the match request. An API developer selects a ruleset from `GameType.SinglePlayer` or trusts a client-provided ID. Both can claim to follow AD-1's “entry path selects” wording, yet one route can create a legacy match or allow a malicious client to request hex for another mode. Developer Sandbox also shares `GameType.Sandbox` with Sandbox.

**Close:** Name the authoritative selection boundary: the server derives a fixed ruleset ID/version from the validated Practice route; local Sandbox setup derives it from the concrete Sandbox class before setup, with Developer Sandbox explicitly legacy. A client may request a play mode but cannot set the ruleset. Persist the chosen ID/version once, reject an unknown version, and replay by that exact version. Missing ID defaults to legacy only for historical snapshots.

## High — Position contract can split runtime and serialized data

**Pair:** The board developer makes SDK `getPosition()` return `{q,r}`; the card-action developer keeps runtime `{x,y}` and converts only while serializing. Both satisfy the literal “positions serialize as axial” in AD-2. Action payloads and target validation then disagree, although each implementation uses six-neighbor math internally.

**Close:** State that every position in a new-ruleset SDK session, action payload, modifier target, snapshot, and replay is canonical `{q,r}`. Conversion from legacy `{x,y}` and display `(c,k)` occurs only at explicit entry/render adapters. Name the coordinate convention and accepted keys in one shared interface. Keep legacy `{x,y}` untouched.

## High — Deck identity and card eligibility can diverge at boundaries

**Pair:** The deck editor labels a deck `practice`; the API keys eligibility by `practice-sandbox-hex` and treats Sandbox as the same deck type; local Sandbox accepts any nine-card deck. Each complies with “distinct mode identities” and “one allowlist,” yet separate Practice and Sandbox decks are no longer guaranteed.

**Close:** Define stable deck-purpose IDs (`practice`, `sandbox`, `legacy`) as metadata on a saved deck and on a match entry request; each entry rejects a deck with a different purpose. Both new purposes use the same shared card allowlist. The server validates Practice, while the local Sandbox launch validates Sandbox with the same SDK policy. Define whether special card variants are compared by canonical base card ID.

## Medium — Fixed hand slots lack an exchange format

**Pair:** One developer serializes eight array entries with `null` for a spent slot; another serializes only remaining cards plus a stored `slotIndex`. Both preserve stable logical slots but action replay and UI indexing expect different shapes.

**Close:** Choose one eight-slot wire shape, such as a length-eight array with stable indices and `null` for empty positions; playing takes an explicit slot index and clears that slot without splicing. Include the card instance identity needed to avoid replaying a stale slot action.

## Medium — End-turn reserve transfer can occur at incompatible phases

**Pair:** One SDK developer transfers mana before `end_turn` observers; another transfers after end-turn effects and before the next turn. Both meet “when a player ends their own turn,” but modifiers and replay event order can differ.

**Close:** Assign one action/event point for exactly one reserve transfer per ended turn, before or after observers. Tie it to the ending player's ID, not the subsequently current player.

## Medium — The driving Spec and spine use conflicting general coordinates

The Spec still says `(0,2)` and `(8,2)` as starts, while AD-2 says axial `(-2,4)` and `(2,4)`. The user's later choice was to use axial addresses for the left and right center cells. Update `SPEC.md` and `rules-detail.md` to make those addresses explicit, or make the original pair clearly display-column/row labels with a documented conversion. Also preserve the Spec's required implementation order (board → summoning → counterattack → mana → deck/hand) in the spine or its delivery guidance.

## Medium — Fixed Practice bot roster needs a completion criterion

AD-5 conditionally includes the specified bot cards only after auditing, but says nothing about failure. `practice-bot-deck.md` identifies Maw's square `PATTERN_3x3` follow-up. State that Practice cannot ship with a substituted or partially unavailable roster: update Maw's effect to hex targeting, audit all eight cards and general/signature effects, then publish the allowlist. Otherwise the bot implementation can silently change the roster while still claiming it “only includes audited cards.”
