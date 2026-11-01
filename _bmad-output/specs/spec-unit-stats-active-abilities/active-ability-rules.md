# Active Ability Rules

Detail for CAP-4 and CAP-5 of `SPEC.md`.

## State

Each ability instance has `lockdown` and `cooldown` counters (integers ≥ 0) and a base cooldown. Both counters are 0 → ready.

- At appearance in hand (unit placed on field): exactly one counter is nonzero.
- On use: cooldown resets to its base value; the ability then waits out cooldown.
- Counter decrement timing: open (see SPEC Open Questions).

## Hand-slot lifecycle

1. Unit card sits in slot N. Playing it empties slot N (fixed-slot rule).
2. While the unit is alive on the field, slot N displays the ability card.
3. Ability unusable while either counter > 0; usable like a spell otherwise, constrained to that ability's own target range.
4. Unit leaving the field removes the ability from slot N (exact fate on death/silence open).

## Counter display

| Counter | Ring | Icon | Number color |
|---|---|---|---|
| Lockdown | violet | closed padlock | `#e8b9ff` |
| Cooldown | cyan | hourglass | `#7be6f5` |

Show only the nonzero counter. Layout, sizes, and positions are authoritative in `duelyst/app/resources/card_ui/phobies_ability/ability-layout.json`; the unit card uses `phobies_unit/card-layout.json`. Ability card subtitle: uppercase `LEVEL N` beneath the name.

## Stat icons (unit card)

Attack type: melee sword, ranged bow, area bomb. Movement type: walk boots, fly wings, phase ghost. Icons in `card_ui/phobies_unit/icons/`.

## Detail view

Reuse the existing card-inspect layout (card plus related card). For an ability-bearing unit the related position holds the ability card instead of a spell card.

## Integration status

Both asset kits are standalone previews and not yet wired to CardNode or the resource loader. Verify integration in the running game, not in the preview HTML.
