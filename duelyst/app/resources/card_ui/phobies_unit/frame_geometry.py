"""Coordinate-defined frame. Raster texture is material only, never geometry."""
import base64
import io
import json
import math
import random
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent
W, H = 452, 592
AXIS = 226
STAT_CENTERS = [(77, 136 + 78 * i) for i in range(4)]
SLOT_CENTER = (226, 432)
SLOT_SIZE = (60, 26)


def polygon(points):
    return ' '.join(f'{x},{y}' for x, y in points)


def export():
    original = Image.open(ROOT.parents[1] / 'card_backgrounds/neutral_unit@2x.png').convert('RGBA')
    # A non-repeating grain field sampled from genuine upper metal. Avoid
    # repeating a thin strip, which also repeats its horizontal bevel edge.
    rng = random.Random(1701)
    sample = original.crop((160, 5, 292, 11)).convert('RGB')
    colors = list(sample.getdata())
    metal = Image.new('RGB', (452,592))
    metal.putdata([colors[rng.randrange(len(colors))] for _ in range(452*592)])
    metal = metal.filter(ImageFilter.GaussianBlur(.35))
    wear = ImageDraw.Draw(metal)
    for _ in range(75):
        x,y=rng.randrange(452),rng.randrange(592)
        length=rng.randrange(2,9)
        wear.line((x,y,x+length,y-length),fill=(104,112,122),width=1)
    data = io.BytesIO()
    metal.save(data, format='PNG')
    texture = base64.b64encode(data.getvalue()).decode()
    outer = [(14,2),(438,2),(450,14),(450,560),(430,580),(264,580),
             (254,590),(198,590),(188,580),(22,580),(2,560),(2,14)]
    inner = [(22,16),(128,16),(146,34),(306,34),(324,16),(430,16),
             (436,22),(436,550),(418,568),(272,568),(254,550),
             (198,550),(180,568),(34,568),(16,550),(16,22)]
    slot = [(200,415),(252,415),(269,432),(252,449),(200,449),(183,432)]
    inset = [(206,419),(246,419),(256,432),(246,445),(206,445),(196,432)]
    # One seamless hex lattice, shared by every internal area.
    hexes = []
    radius = 13
    dy = math.sqrt(3) * radius
    for col in range(-1, 26):
        for row in range(-1, 30):
            cx = col * radius * 1.5
            cy = row * dy + (col % 2) * dy / 2
            pts = [(round(cx + radius * math.cos(math.radians(a)),3),
                    round(cy + radius * math.sin(math.radians(a)),3)) for a in range(0,360,60)]
            hexes.append(f'<polygon points="{polygon(pts)}"/>')
    definitions = f'''<defs>
      <linearGradient id="navy" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#183e50"/><stop offset=".5" stop-color="#102c3d"/><stop offset="1" stop-color="#091c2b"/></linearGradient>
      <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#59616d"/><stop offset=".3" stop-color="#303b4b"/><stop offset="1" stop-color="#121c2b"/></linearGradient>
      <linearGradient id="bevel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7c8b98"/><stop offset=".55" stop-color="#364957"/><stop offset="1" stop-color="#0b1725"/></linearGradient>
      <linearGradient id="cyan" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#85dce5"/><stop offset=".5" stop-color="#4c9cae"/><stop offset="1" stop-color="#377588"/></linearGradient>
      <radialGradient id="well" cx=".4" cy=".3" r=".8"><stop stop-color="#0d2634"/><stop offset="1" stop-color="#020910"/></radialGradient>
      <pattern id="grain" width="452" height="592" patternUnits="userSpaceOnUse"><image width="452" height="592" href="data:image/png;base64,{texture}"/></pattern>
      <clipPath id="inside"><polygon points="{polygon(inner)}"/></clipPath>
      <clipPath id="outside"><polygon points="{polygon(outer)}"/></clipPath>
    </defs>'''
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="452" height="592" viewBox="0 0 452 592">', definitions,
        f'<polygon points="{polygon(outer)}" fill="url(#metal)" stroke="#050c16" stroke-width="2"/>',
        f'<rect width="452" height="592" fill="url(#grain)" opacity=".65" clip-path="url(#outside)"/>',
        f'<polygon points="{polygon(outer)}" fill="none" stroke="url(#bevel)" stroke-width="1"/>',
        '<path d="M4 20 V558 L23 577 H188 L198 587 H254" fill="none" stroke="#88909a" stroke-opacity=".38" stroke-width=".7"/>',
        '<path d="M448 20 V558 L429 577 H264 L254 587" fill="none" stroke="#030a13" stroke-width="1.2"/>',
        f'<polygon points="{polygon(inner)}" fill="url(#navy)" stroke="#020c17" stroke-width="4"/>',
        '<g clip-path="url(#inside)" fill="none" stroke="#4f94a6" stroke-width=".6" opacity=".13">',*hexes,'</g>',
        f'<polygon points="{polygon(inner)}" fill="none" stroke="url(#cyan)" stroke-width="1.25"/>',
        # A consistent title band and rules well; common field remains beneath.
        '<path d="M118 35 V76 L134 92 H418 L428 82" fill="none" stroke="url(#cyan)" stroke-width="1.25"/>',
        '<path d="M121 108 V397 L106 412 M420 108 V397 L405 412" fill="none" stroke="#387b91" stroke-width="1"/>',
        '<g fill="none" stroke="url(#cyan)" stroke-width="1.25" stroke-linejoin="miter">',
        '<path d="M24 432 L34 422 H101 L111 432 H183 M269 432 H341 L351 422 H418 L428 432"/>',
        '<path d="M24 446 V540 L42 558 H180 M272 558 H410 L428 540 V446"/>',
        '</g>',
        '<g fill="#68b7c8"><circle cx="121" cy="108" r="1.4"/><circle cx="420" cy="108" r="1.4"/><circle cx="106" cy="412" r="1.4"/><circle cx="405" cy="412" r="1.4"/></g>']
    for index, (x,y) in enumerate(STAT_CENTERS):
        low, high = [('#8d650d','#fae29a'),('#900c29','#ff8d9c'),('#23667c','#bceef4'),('#4e2d89','#d5bdff')][index]
        parts.append(f'''<defs><linearGradient id="ring{index}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="{high}"/><stop offset=".45" stop-color="{low}"/><stop offset=".7" stop-color="{high}"/><stop offset="1" stop-color="{low}"/></linearGradient></defs>
          <circle cx="{x}" cy="{y}" r="40" fill="#07131e" stroke="url(#bevel)" stroke-width="1.5"/>
          <circle cx="{x}" cy="{y}" r="38.5" fill="none" stroke="#020a13" stroke-width="2"/>
          <circle cx="{x}" cy="{y}" r="36" fill="url(#well)" stroke="url(#ring{index})" stroke-width="4"/>
          <circle cx="{x}" cy="{y}" r="33.6" fill="none" stroke="#b9d1d8" stroke-opacity=".35" stroke-width=".6"/>''')
    parts.extend([f'<polygon points="{polygon(slot)}" fill="url(#metal)" stroke="#050e18" stroke-width="3"/>',
        f'<polygon points="{polygon(slot)}" fill="none" stroke="url(#cyan)" stroke-width="1.25"/>',
        f'<polygon points="{polygon(inset)}" fill="#050e19" stroke="url(#bevel)" stroke-width="1.5"/>', '</svg>'])
    svg = ''.join(parts)
    (ROOT/'frame_geometry.svg').write_text(svg,encoding='utf-8')
    cairosvg.svg2png(bytestring=svg.encode(),write_to=str(ROOT/'unit_card_frame@2x.png'),output_width=452,output_height=592)
    cairosvg.svg2png(bytestring=svg.encode(),write_to=str(ROOT/'unit_card_frame.png'),output_width=226,output_height=296)
    # Review guides use the very same coordinates as the native SVG.
    guide = svg.replace('</svg>', '<g fill="none" stroke="#ff6287" stroke-width=".6" stroke-dasharray="3 3"><path d="M226 0V592 M77 94V412 M0 432H452"/>' + ''.join(f'<path d="M28 {y}H122"/>' for _,y in STAT_CENTERS) + '</g></svg>')
    cairosvg.svg2png(bytestring=guide.encode(),write_to=str(ROOT/'preview_frame_guides.png'),output_width=904,output_height=1184)
    (ROOT/'frame-geometry.json').write_text(json.dumps({'canvas':[452,592],'axis':226,'outer':outer,'inner':inner,'statCenters':STAT_CENTERS,'statRadius':36,'statRingWidth':4,'statSpacing':78,'slotOuter':slot,'slotInset':inset,'slotCenter':SLOT_CENTER},indent=2)+'\n')


if __name__ == '__main__':
    export()
