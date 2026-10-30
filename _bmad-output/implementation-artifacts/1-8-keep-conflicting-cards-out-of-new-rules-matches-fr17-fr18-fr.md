---
title: 'Keep conflicting cards out of new-rules matches'
type: 'feature'
created: '2026-10-30'
status: 'done'
route: 'dispatch'
baseline_commit: '9c1f7c5751bd9da3c806ca9a604dd01621111f18'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/1-7-manage-persistent-reserve-funded-mana-fr8-fr11.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Cards that depend on square targeting, non-adjacent summons, counterattacks, extra mana, or mutable hand slots can break new-rules matches.

**Approach:** Define one explicit SDK allowlist for both new-rules modes and enforce it at editing, setup, generated-card creation, and authoritative actions. Admit only audited IDs and variants; use hex neighbors for Maw while preserving legacy behavior.

## Boundaries & Constraints

**Always:** Resolve eligibility by match ruleset, not `GameType.Sandbox`. Audit each admitted ID and its modifiers, follow-ups, generated cards, and general/signature effects against hex targeting, general-adjacent summoning, counterattack, mana, and fixed hand rules. Reject unknown/unaudited IDs through the same policy at every new-rules boundary, before `allCardsAvailable` bypasses. Practice and local Sandbox share the allowlist. Maw uses six-neighbor hex topology only in new-rules matches. The selected initial policy is the exact documented Practice roster (neutral IDs 10979, 19052, 19038, 10205, 10001, 19051, 10954, 10206), compatible canonical general/signature pairs only (general→signature: 1→20174, 23→20175, 51→20301, 223→20179, 254→20304, 323→20181, 401→20182, 527→20185, 558→20306), and audited generated-card dependencies only (20142 FollowupDamage, 43 KingsGuard, 40004 Shadow tile). The generated dependencies are never legal submitted deck choices. No cosmetic or prismatic variant is admitted unless its own exact ID is audited; all other IDs remain unavailable pending a separate audit.

**Never:** Admit conflicting or unaudited cards through decks, generation, or bypasses; create a second blacklist; alter the fixed bot roster; or change legacy behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Audited ID | Explicitly admitted card in Practice or Sandbox | Shared policy accepts it | N/A |
| Conflicting or unknown ID | Submitted/generated ID absent from allowlist | Reject before new-rules state changes | Existing validation/action failure path |
| Variant ID | Skin/prismatic ID not explicitly audited | Reject even if its base ID is allowed | N/A |
| Legacy match | Same ID under legacy rules | Existing behavior remains | N/A |
| Maw follow-up | Hex versus legacy match | Hex uses six-neighbor cells; legacy keeps its pattern | Existing target validation |

</frozen-after-approval>

## Code Map

- `app/sdk/rulesets/rulesetsLookup.coffee`, `gameSession.coffee`, `gameSetup.coffee` -- bind ruleset and build submitted decks/generals; use the ruleset for policy and validate before setup bypasses.
- `app/sdk/gameSetup.coffee` -- materializes submitted player decks and adds generals/signature cards; validate before cards enter setup state and before configuration bypasses.
- `app/sdk/challenges/sandbox.coffee` versus `sandboxDeveloper.coffee` -- local Sandbox is new-rules; Developer Sandbox remains legacy.
- `server/routes/api/me/games.coffee`, `server/single_player.coffee` -- Practice entry and bot setup; preserve server ruleset and documented roster.
- `app/ui/models/deck.js` -- editing checks faction/count/inventory, not eligibility; apply policy to new-rules choices only.
- `app/sdk/gameSession.coffee` and `app/sdk/actions/applyCardToBoardAction.coffee` -- card creation/application and authoritative enforcement; don't block eligible generated dependencies.
- `app/sdk/cards/factory/core/neutral.coffee` defines Maw (10979) with `CONFIG.PATTERN_3x3`; `app/sdk/board.coffee:getHexNeighbors` supplies hex neighbors.
- `C:/Working/duelyst/_bmad-output/specs/spec-duelyst-rules-overhaul/practice-bot-deck.md` is the source of the exact 8 neutral roster IDs. Compatible canonical pairs are F1 1→20174, 23→20175, 51→20301; F3 223→20179, 254→20304; F4 323→20181; F5 401→20182; F6 527→20185, 558→20306. Exclude the other nine pairs because their signature effects conflict with fixed hex rules. Generated dependencies: 20142 (FollowupDamage for Maw/Bloodtear), 43 (KingsGuard from Conscript), 40004 (Shadow tile from Abyssal Scar). They are generation-only, not deck-eligible.

## Tasks & Acceptance

**Execution:**
- [x] `app/sdk/rulesets/cardEligibility.coffee` -- Add the shared ruleset-aware exact-ID allowlist and audited dependencies.
- [x] `app/sdk/gameSetup.coffee`, `server/routes/api/me/games.coffee`, and `app/sdk/challenges/sandbox.coffee` -- Enforce eligibility for Practice and Sandbox deck setup before bypasses; preserve legacy/developer modes and the fixed bot roster.
- [x] `app/ui/models/deck.js` -- Filter new-rules choices through shared policy; preserve legacy editing.
- [x] `app/sdk/gameSession.coffee` and `app/sdk/actions/applyCardToBoardAction.coffee` -- Reject excluded generated/authoritative applications before state changes; retain audited dependencies.
- [x] `app/sdk/cards/factory/core/neutral.coffee` -- Make Maw's follow-up use six-neighbor positions in hex rules and retain its legacy pattern.
- [x] `test/unit/sdk/game/game_setup.js`, `actions_validators.js`, and Maw card tests -- Cover allow/deny, setup bypasses, generated rejection, topology, and legacy behavior.

**Acceptance Criteria:**
- Given a Practice or Sandbox card candidate, when eligibility is evaluated, then only an explicitly audited exact ID and variant is accepted and conflicting or unaudited IDs are rejected.
- Given a submitted deck or bot/setup card, when the new-rules match is constructed, then every card and its dependent effects satisfy the shared policy before setup bypasses run.
- Given an excluded card ID is introduced through a generated-card path or authoritative action, when the action is validated, then it cannot enter new-rules state and no partial card state is applied.
- Given Maw's follow-up runs in a hex match, when nearby targets are selected, then only on-board six-neighbor cells are eligible; in legacy, existing targets remain unchanged.
- Given a legacy or Developer Sandbox match uses any card, when setup and actions run, then existing eligibility and card behavior remain unchanged.

## Implementation Notes


## Spec Change Log


## Review Triage Log

- **medium — patch —** Replay setup previously accepted an unaudited starting-hand ID, and setup board data could admit a signature from another general. `validateSetupData` now checks exact IDs in restored hand/draw data, caps restored hand slots at eight, and checks a starting-board signature against the saved general; focused coverage passes.
- **medium — patch —** Runtime dependency eligibility checked parent identity but not ownership, allowing a mismatched owner dependency through malformed/cross-player actions. The dependency and root card must now share an owner.
- **medium (unverified) — defer —** The Practice endpoint's HTTP 400 rejection lacks a route-level regression test; a helper unit test alone does not prove the endpoint response. Settle with a test posting an excluded deck to `/api/me/games/single_player` and asserting 400.
- **medium — patch —** Restored hand data longer than eight could expand the hand beyond the rendered fixed slots. Setup validation now rejects it; focused coverage passes.
- **false —** A deck with fewer than eight eligible cards can leave empty fixed slots; the intent does not require every slot to be occupied, and empty slots are a supported state after cards are played.
- **medium (unverified) — defer —** More than eight eligible cards can leave excess copies inaccessible in the draw pile under no-draw rules; resolve deck-size policy alongside deck construction rules.
- **medium (unverified) — defer —** Duplicate eligible cards are not constrained by a copy limit; the chosen allowlist policy defines admitted IDs but does not settle copy counts.
- **defer —** English/German/Traditional Chinese fixed-hand labels changed in earlier fixed-hand work; verify fallback or add translations for the remaining locales.
- **defer —** The deck editor policy activates for `purpose`/`deck_purpose` values `practice` and `sandbox`, but those fields are introduced by Story 1.9. Its purpose-aware filter awaits that story's model integration; server/setup/runtime enforcement is active now.
- **defer —** Direct `applyCardToHand`/`applyCardToDeck` methods can mutate fixed hands outside validated actions; this predates Story 1.8 and belongs with fixed-hand action enforcement.
- **defer —** `BottomDeckLayer` rendering and index binding lack a UI-layer test; this concerns the earlier fixed-hand UI change and is outside this story's card eligibility implementation.


## Design Notes

Treat eligibility as a match contract, not a collection label: the same exact-ID decision must hold at entry, setup, and runtime creation. Generated dependencies are audited with their parent effects so enforcement cannot break a card that was itself admitted.

## Verification

**Commands:**
- `node_modules/.bin/mocha --no-config --require coffeescript/register --timeout 10000 --exit <focused eligibility, game setup, action validator, and Maw card suites>` -- expected: all pass.
- Compile changed CoffeeScript files and run CoffeeLint with the repository line-ending rule ignored -- expected: clean.
- `git diff --check` -- expected: clean.
