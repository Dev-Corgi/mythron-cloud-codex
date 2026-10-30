# BMAD architecture rubric and input reconciliation

Verdict: **Needs targeted fixes before finalization.** The spine covers all five capabilities and most cross-component invariants, but it still conflicts with its driving Spec and leaves two mode-specific boundaries ambiguous.

## High

1. **Source coordinates contradict AD-2.** `SPEC.md` CAP-1 and `rules-detail.md` still call the general starts `(0,2)` and `(8,2)` without saying these are legacy display indices. AD-2 makes persisted axial starts `(-2,4)` and `(2,4)`. A builder using the Spec alone will place units differently from one using the spine. Update those two inputs to identify the new axial addresses and, if useful, show the display indices in parentheses. This is a user-approved change from stored `(x,y)` to axial, so it must not remain an implicit override.

2. **Sandbox validation owner is misstated.** AD-4 says “Server entry validation is authoritative,” while `rules-detail.md` says Sandbox is local and AD-5 separately calls for local Sandbox launch checks. State the authority per entry path: API/server for Practice, SDK local launch for Sandbox; both call the same eligibility policy and reject before setup. Otherwise the Sandbox path can bypass a validation responsibility because no server handles its match entry.

## Medium

3. **Ordering requirement is missing.** `SPEC.md` explicitly requires board → summoning → counterattack → mana → deck and hand. The spine maps capabilities but never binds this rollout or implementation sequence. Add it as a convention or a short rule so downstream epics cannot integrate in a conflicting order.

4. **Non-card mana sources need an explicit boundary.** `rules-detail.md` forbids additional mana outside reserve transfer; existing `GameSetup` creates bonus mana tiles. AD-5 audits cards and AD-3 controls turn mana, yet neither makes it clear that setup tiles and other non-card grants are disabled or guarded in new matches. Extend AD-3 to cover bonus mana tiles and all SDK mana-grant paths.

5. **In-match card eligibility enforcement is incomplete.** AD-5 audits generated cards, but says to apply the allowlist at editing, entry, local launch, and bot setup. An admitted card may generate another card at runtime. Require the shared policy at generated-card creation too, or require the allowlist audit to prove closure over every generated card. The former is safer and leaves no path for a hidden effect to break the fixed-hand or summon rules.

## Low

6. **The stack seed is omitted but appropriately deferred in a brownfield system.** Existing runtime/package versions are owned by `package.json`; the architecture does not propose a new dependency. No change required.

7. **No new infrastructure is a useful operational statement.** Clarify that game snapshot/replay format must carry ruleset identity and axial positions through the existing Firebase transport, including older snapshot fallback. AD-1 and Structural Seed nearly cover it; this is optional polish.

## Coverage

- CAP-1: AD-1 and AD-2 cover board topology, coordinates, movement/range/adjacency. Source conflict remains.
- CAP-2: AD-2, AD-3, and AD-5 cover general-only summoning and incompatible cards.
- CAP-3: AD-3 and AD-5 cover automatic counterattack removal.
- CAP-4: AD-3 covers reserve, turn transfer, persistence; bonus mana source gap remains.
- CAP-5: AD-4 and AD-5 cover separate decks, fixed slots, bot roster, and card exclusion; Sandbox authority gap remains.
