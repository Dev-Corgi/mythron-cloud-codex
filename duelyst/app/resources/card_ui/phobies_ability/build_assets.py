"""Reproducible ability-card component exports; original game art stays intact."""
from pathlib import Path
import json
import shutil
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent
RESOURCES = ROOT.parents[1]
OUT = ROOT / 'components'
OUT.mkdir(exist_ok=True)
sheet = Image.open(ROOT/'sources/ability_components.png').convert('RGBA')


def export(image, name, size, circle=False):
    target=(size[0]*4,size[1]*4)
    if circle:
        image=image.resize(target,Image.Resampling.LANCZOS)
    else:
        image.thumbnail(target,Image.Resampling.LANCZOS)
        board=Image.new('RGBA',target,(0,0,0,0))
        board.alpha_composite(image,((target[0]-image.width)//2,(target[1]-image.height)//2))
        image=board
    alpha = image.getchannel('A')
    if circle:
        mask=Image.new('L',image.size,0)
        ImageDraw.Draw(mask).ellipse((0,0,image.width-1,image.height-1),fill=255)
        alpha=ImageChops.multiply(alpha,mask)
    else:
        # Discard generated glow fringe rather than baking a colored cloud
        # into the component; the painted dark silhouette remains intact.
        alpha=alpha.point(lambda a: 0 if a<64 else a)
    image.putalpha(alpha)
    image.resize(size,Image.Resampling.LANCZOS).save(OUT/f'{name}@2x.png')
    image.resize((size[0]//2,size[1]//2),Image.Resampling.LANCZOS).save(OUT/f'{name}.png')


export(sheet.crop((75,42,645,612)),'lockdown_ring',(88,88),circle=True)
export(sheet.crop((728,42,1298,612)),'cooldown_ring',(88,88),circle=True)
export(sheet.crop((211,672,513,1080)),'lockdown_icon',(40,52))
export(sheet.crop((873,692,1147,1080)),'cooldown_icon',(40,52))

for suffix in ('','@2x'):
    shutil.copyfile(RESOURCES/f'card_backgrounds/neutral_spell{suffix}.png',
                    ROOT/f'ability_card_frame{suffix}.png')

config=json.loads((ROOT/'ability-layout.json').read_text(encoding='utf-8'))
(ROOT/'ability-config.js').write_text('// Generated from ability-layout.json.\nwindow.ABILITY_CARD_CONFIG = '+json.dumps(config,indent=2)+';\n',encoding='utf-8')
