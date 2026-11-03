# Special ability card asset kit

`concept_phoenix_fire_v1.png` is the reference concept. `preview_phoenix_fire_assets_v3.png` is the actual asset composition using the original spell background, original Phoenix Fire atlas art, project Lato fonts, and separate counter layers.

- Left: lockdown, closed padlock, violet, sample value 2.
- Right: cooldown, hourglass, cyan/teal, sample value 1.
- Original Duelyst spell-card layout, Phoenix Fire art, title, and effect text supplied as reference.

Prompt: Preserve the original Duelyst Phoenix Fire card layout, metal frame, cyan hex/circuit lines, arcane circle and silver-bordered pixel-art skill icon. Replace the left yellow sword stat with a violet closed-padlock lockdown counter (2); replace the right red shield stat with an icy cyan hourglass cooldown counter (1). Equal hierarchy and circle size, original painted beveled game UI material, no extra labels, transparent exterior.

This is a separate ability-card asset folder. The approved unit-card baseline remains in `../phobies_unit/`.

## Production files

- `ability_card_frame.png` / `ability_card_frame@2x.png`: 226 x 296 / 452 x 592. Exact copies of original neutral_spell frames, including alpha.
- `components/lockdown_ring.png` and `@2x`: violet, 44 x 44 / 88 x 88, no baked numeral.
- `components/cooldown_ring.png` and `@2x`: cyan, same dimensions and hierarchy.
- `components/lockdown_icon.png` and `@2x`: padlock, 20 x 26 / 40 x 52, transparent outside.
- `components/cooldown_icon.png` and `@2x`: hourglass, same artboard sizes.
- `ability-layout.json`: authoritative positions, font sizes, colors, atlas slice, and sample data. Coordinates are 2x pixels, top-left origin; halve for normal size.
- `ability-config.js`: generated from the JSON for preview.html; do not edit directly.
- `sources/ability_components.png`: original generated component atlas. The builder crops it, trims transparent glow fringe, normalizes ring geometry, and preserves icon proportions inside transparent artboards.

Both ring centers share y=360 and mirror about card center x=226: left x=104 and right x=348. Attached icon centers are x=61 and x=391. The counters are lockdown/cooldown, not attack/health. Their numbers, labels, effect text, and skill art remain independent dynamic layers. The blue exterior is only a screenshot backdrop; frame/component PNGs retain transparency.

## Rebuild

Python with Pillow and Chrome/Edge are used by the following commands:

```powershell
python -B C:/Working/duelyst/duelyst/app/resources/card_ui/phobies_ability/build_assets.py
& C:/Working/duelyst/duelyst/app/resources/card_ui/phobies_ability/render_preview.ps1
```

Component generation used built-in image_gen: two empty equal-sized violet/cyan stat rings, standalone silver/amethyst padlock and silver/cyan hourglass, painted beveled Duelyst material, transparent exterior, no numerals or text. Frame, skill atlas, and fonts are original project resources.

This kit is not yet wired into the game's CardNode/resource loader. Use the separate layers for integration, not the flattened preview screenshot. Future visual revisions should receive a new preview filename to avoid stale desktop image caches.

The former SPELL subtitle is replaced by uppercase `LEVEL N`, centered beneath the name. Both card types now use the former SPELL style: 18px Lato Regular, #9bced8 (2x coordinates). Edit sample.level in ability-layout.json to change the value.
