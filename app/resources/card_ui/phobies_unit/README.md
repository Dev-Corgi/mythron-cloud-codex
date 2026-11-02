# Approved card UI baseline

The user approved the geometry in `preview_astral_crusader_geometry_v3.png`. The current render is `preview_astral_crusader_geometry_v4.png`, applying the subsequently requested larger LEVEL 1 subtitle. Read `C:/Working/duelyst/CARD_UI_HANDOFF.md` before making changes.

## Current files

- `preview_astral_crusader_geometry_v4.png`: current full-card render; LEVEL N is 18px Lato Regular in #9bced8, matching the ability card and original SPELL subtitle.
- `frame_geometry.py`: authoritative coordinate-based frame builder.
- `frame_geometry.svg`, `frame-geometry.json`: generated geometry exports; edit the Python source, not these outputs.
- `unit_card_frame.png` / `unit_card_frame@2x.png`: 226 x 296 / 452 x 592 frames.
- `preview_frame_guides.png`: frame with geometric alignment guides.
- `card-layout.json`: authoritative dynamic card positions and sample card values.
- `card-config.js`: generated browser-readable copy of card-layout.json.
- `preview.html`: original sprite atlases, fonts, icons, and text composed over the frame.
- `icons/`: active exported movement, attack (melee, ranged, area, arc), health, range, cooldown assets.
- `rarity/`: five active hexagonal crystal colors, normal 30 x 13 and 2x 60 x 26.
- `sources/`: five required raw icon/crystal sheets. Raw sheets are build inputs; use exported icons, not unused cells on the sheets.

## Rebuild on Windows

Dependencies: Python with Pillow and CairoSVG; Chrome or Edge for the preview.

```powershell
python -B C:/Working/duelyst/duelyst/app/resources/card_ui/phobies_unit/build_assets.py
& C:/Working/duelyst/duelyst/app/resources/card_ui/phobies_unit/render_preview.ps1
```

The renderer replaces the approved preview path; use a new versioned preview filename when proposing a future visual change so the desktop image cache does not show an old render.

The source geometry is symmetric about x=226. Four stat centers are (77,136), (77,214), (77,292), (77,370), with radius 36, ring width 4, pitch 78. Rarity center is (226,432), top-left (196,419). Frame canvas dimensions match the original front, but its rebuilt symmetric alpha silhouette is not an exact copy of the original alpha mask. Original back dimensions remain 226 x 297 / 452 x 594.

This pack is not connected to the game CardNode renderer yet. The preview is a standalone composition, not evidence of in-game integration.
