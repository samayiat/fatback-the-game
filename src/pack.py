"""Packs art/ into src/atlas.png + src/atlas.json.\n\nFeet sit on row 70 of each 92px cell and the crown on row 23 — the generator\nis consistent about this, and game.html depends on it (FOOT=70, HEAD=47).\nIf you regenerate art with different framing, re-measure those two numbers.\n"""
from PIL import Image
import json, os, base64, io

import os
ROOT=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),"art")
S=92
COLS=10

# (key, path)
entries=[]
def add(key, path):
    entries.append((key, os.path.join(ROOT,path)))

F="This_character_is_5_11_._He"
for d in ["south","south-east","east","north-east","north","north-west","west","south-west"]:
    add(f"hero.rot.{d}", f"{F}/rotations/{d}.png")
for name,cnt,folder in [("walk",6,"Walking"),("punch",6,"Cross_Punch"),("drink",6,"Drinking"),("jump",8,"Jumping"),("swag",8,"Scary_Walk")]:
    for i in range(cnt):
        add(f"hero.{name}.{i}", f"{F}/animations/{folder}/east/frame_{i:03d}.png")
for i in range(6):
    add(f"hero.punchS.{i}", f"{F}/animations/Cross_Punch-8c2c64c6/south/frame_{i:03d}.png")
for i in range(4):
    add(f"hero.walkS.{i}", f"{F}/animations/Walking-deb204dd/south/frame_{i:03d}.png")

V="This_character_is_a_6_3"
for d in ["south","south-east","east","north-east","north","north-west","west","south-west"]:
    add(f"vamp.rot.{d}", f"{V}/rotations/{d}.png")
for i in range(4):
    add(f"vamp.walk.{i}", f"{V}/animations/Walking/west/frame_{i:03d}.png")
for i in range(4):
    add(f"vamp.kick.{i}", f"{V}/animations/Hurricane_Kick/west/frame_{i:03d}.png")

K="Smoking_a_cigarette."
for d in ["south","south-east","east","north-east","north","north-west","west","south-west"]:
    add(f"smoke.rot.{d}", f"{K}/rotations/{d}.png")

# the women outside the clubs — 8-way rotations each. w0..wN keyed by index.
WOMEN=["Keisha","Marisol","Simone","Tiana","Nova","Mei","Camila","Priya"]
for wi,Wn in enumerate(WOMEN):
    for d in ["south","south-east","east","north-east","north","north-west","west","south-west"]:
        add(f"w{wi}.rot.{d}", f"{Wn}/rotations/{d}.png")

# environment props (92x92)
PROPS=["dumpster","hydrant","mailbox","sign"]
for prop in PROPS:
    if os.path.exists(os.path.join(ROOT,f"props/{prop}.png")):
        add(f"prop.{prop}", f"props/{prop}.png")

FOOT=70   # matches game.html: feet sit on this row of the 92px cell

FIG_H=44   # target figure height in px — just under the men's ~46, regardless of source export size

def reframe(im):
    """The women come from PixelLab at varying export sizes (136 / 180 / 184px)
    with the figure filling most of the frame — dropped straight in they tower
    over the 5'11 hero and their feet land below the FOOT baseline. Crop to the
    actual figure, scale it to a FIXED target height (so every woman is the same
    scale no matter her export size), and seat the feet on row FOOT so spr()
    places them like every other sprite."""
    a=im.getchannel("A"); bb=a.getbbox()
    if not bb: return im.resize((S,S), Image.LANCZOS)
    fig=im.crop(bb)
    f=FIG_H/fig.height                       # normalize to target height, not a fixed factor
    nw,nh=max(1,round(fig.width*f)),max(1,round(fig.height*f))
    fig=fig.resize((nw,nh), Image.LANCZOS)
    cell=Image.new("RGBA",(S,S),(0,0,0,0))
    cell.paste(fig, ((S-nw)//2, FOOT-nh), fig)   # centered, feet on the baseline
    return cell

def is_woman(key): return len(key)>1 and key[0]=="w" and key[1].isdigit()

n=len(entries)
rows=(n+COLS-1)//COLS
sheet=Image.new("RGBA",(COLS*S,rows*S),(0,0,0,0))
index={}
for i,(key,path) in enumerate(entries):
    im=Image.open(path).convert("RGBA")
    if is_woman(key): im=reframe(im)
    elif im.size!=(S,S): im=im.resize((S,S), Image.NEAREST)
    cx,cy=(i%COLS)*S,(i//COLS)*S
    sheet.paste(im,(cx,cy))
    index[key]=[cx,cy]

OUT=os.path.dirname(os.path.abspath(__file__))
sheet.save(os.path.join(OUT,"atlas.png"),"PNG",optimize=True)
open(os.path.join(OUT,"atlas.json"),"w").write(json.dumps(index,separators=(",",":")))
sz=os.path.getsize(os.path.join(OUT,"atlas.png"))
print(f"  {n} frames -> atlas.png {sheet.size[0]}x{sheet.size[1]}, {sz//1024} KB")
