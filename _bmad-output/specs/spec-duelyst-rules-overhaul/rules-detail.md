# Rule Details and Brownfield References

## Scope

The new rules initially apply only to Practice (`PlayModes.Practice`, which starts a `GameType.SinglePlayer` match) and Sandbox (`PlayModes.Sandbox`, which uses `GameType.Sandbox`). Other play modes retain their existing match rules. The Developer Sandbox path is a distinct play-mode entry and is not included by this initial scope decision.

## Ordered rule changes

1. **Board:** Keep 9 rendered columns and 5 rows, totaling 45 pointy-top hex tiles, with odd columns staggered downward. Store tile positions as axial `(q,r)`. Rendered column `c = 2q + r` ranges from 0 to 8; rendered row `k = floor(r/2)` ranges from 0 to 4. For each `(c,k)`, `r = 2k + (c mod 2)` and `q = (c-r)/2`. Recalculate movement, attack range, and adjacency with axial six-neighbor geometry. The first player's general starts at `(-2,4)` and the second player's at `(2,4)`, the leftmost and rightmost center cells.
2. **Summoning:** A valid summon destination must be next to the owning general. Being next to another allied unit alone grants no summon location.
3. **Counterattack:** Taking an attack does not cause an automatic return attack.
4. **Mana:** Each player has reserve `R = 20` before the opening allocation. The first player starts with `(R, M) = (17, 3)` and the second with `(16, 4)`, where `M` is spendable mana. When a player ends their own turn, only that player transfers `T = min(3, R)`, then sets `R = R - T` and `M = M + T`. If `R = 0`, `T = 0`. Playing a card reduces `M` by its cost. Unspent `M` carries forward and has no nine-point cap.
5. **Deck and hand:** A Practice or Sandbox deck has one general plus eight other cards. Players create these decks separately; existing 40-card decks remain intact for other modes and are not auto-converted. All eight new-deck cards begin in eight fixed hand slots. Playing one empties that slot without shifting or refilling the others. No card is added or returned to hand after setup, and hand contents or slots never change for another reason. Remove draws, replacement, and deck-exhaustion fatigue in the new modes. Cards or effects that would create, add, return, or otherwise change hand contents or slots are unavailable there; a separate hand cap is unnecessary because occupancy only decreases.

Existing cards are temporarily unavailable if their effects conflict with the new rules, including effects that depend on draw, replacement, fatigue, counterattack, additional mana outside the reserve transfer, or summons outside general-adjacent tiles. They are not exceptions to the rules above. An implementation audit must identify the affected card IDs before deck validation and match entry can reject them reliably.

## Existing implementation touchpoints

- `duelyst/app/common/config.js` defines the 9×5 board, eight-offset range and spawn patterns, four-offset movement pattern, nine-mana cap, six-card hand cap, five-card starting hand, and 40-card deck size. The old movement pattern in code is four orthogonal offsets, despite the source request describing eight-direction old movement.
- `duelyst/app/sdk/board.coffee` derives spawn positions from every allied unit and uses square-grid dimensions and position maps.
- `duelyst/app/sdk/modifiers/modifierStrikeback.coffee` implements counterattack behavior; attack and modifier paths also refer to it.
- `duelyst/app/sdk/gameSession.coffee` increments and refreshes mana at turn start. `duelyst/app/sdk/player.coffee` and mana actions apply the current cap.
- `duelyst/app/sdk/gameSetup.coffee` builds the starting hand; `duelyst/app/sdk/cards/deck.coffee` handles hand slots, draws, and replacement.

These paths identify current behavior for implementation planning. They do not limit the changes to those files.
