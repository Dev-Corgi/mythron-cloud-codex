# Active Ability Rules

Detail for CAP-4 and CAP-5 of `SPEC.md`.

## State

Each ability instance has `lockdown` and `cooldown` counters (integers ≥ 0) and a base cooldown. Both counters are 0 → ready.

- Base values: each ability defines a base lockdown and base cooldown. At appearance (unit placed on field) lockdown = base lockdown and cooldown = 0, so at most one counter is nonzero; cooldown takes its base only after the first use.
- On use: cooldown resets to its base value; the ability then waits out cooldown.
- Decrement: at the end of the owning player's turn, each nonzero counter drops by 1 (floor 0). Defaults when an ability sets none: lockdown 0, cooldown 1. Using an ability costs no mana.
- Structure: ability definitions (effect spell, lockdown, cooldown, use range) attach to a card through a generic field, so adding a card with a unique ability needs no engine change.
- General: each general's Bloodbound Spell is an active ability, Lockdown 2, Cooldown 2, no mana. It uses the existing dedicated Bloodbound slot, not a hand slot, and counts from match start.
- Dev placeholder: Planar Scout (`Cards.Neutral.PlanarScout`) gets Phoenix Fire, lockdown 1, cooldown 1.

## Hand-slot lifecycle

1. Unit card sits in slot N. Playing it empties slot N (fixed-slot rule).
2. While the unit is alive on the field, slot N displays the ability card.
3. Ability unusable while either counter > 0; usable like a spell otherwise, constrained to that ability's own target range.
4. Unit death empties slot N. Silence disables the ability (shown but unusable); silence removal re-enables it. While silenced, Lockdown and Cooldown do not decrease at turn end; they resume from the same values when silence ends.

## Counter display

| Counter | Ring | Icon | Number color |
|---|---|---|---|
| Lockdown | violet | closed padlock | `#e8b9ff` |
| Cooldown | cyan | hourglass | `#7be6f5` |

Show only the nonzero counter. Layout, sizes, and positions are authoritative in `duelyst/app/resources/card_ui/phobies_ability/ability-layout.json`; the unit card uses `phobies_unit/card-layout.json`. Ability card subtitle: uppercase `LEVEL N` beneath the name.

## Stat icons (unit card)

Attack type: melee sword, ranged bow, lobbed arc (`attack_arc.png`), area bomb. Movement type: walk boots, fly wings, phase ghost. Icons in `card_ui/phobies_unit/icons/`.

## Detail view

Reuse the existing card-inspect layout (card plus related card). For an ability-bearing unit the related position holds the ability card instead of a spell card.

## Integration status

Both asset kits are standalone previews and not yet wired to CardNode or the resource loader. Verify integration in the running game, not in the preview HTML.

## Action points

Units have 2 action points per turn (Phobies-style), replacing one move plus one attack in Practice and Sandbox. Move, attack, and ability use each cost 1, in any combination. Points refresh to 2 at the start of the owner's turn. A newly summoned unit starts exhausted (0 points) and gets 2 at its owner's next turn start. The existing exhausted state equals 0 action points; no separate action-point display yet. Abilities always have Cooldown ≥ 1.
