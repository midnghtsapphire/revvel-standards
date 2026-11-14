#!/usr/bin/env python3
"""Builds cover.png (1280x720) and thumbnail.png (600x600) for the three products from the finished deliverables."""
import os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(HERE, "..")
sys.path.insert(0, HERE)
from listing import *
import hula_art as h
TMP = "/workspace/balls/.tmp/lst"; os.makedirs(TMP, exist_ok=True)
def img(src, style): return f'<img src="{U(src)}" style="position:absolute;{style}">'
def shadow(): return "box-shadow:10px 10px 0 #19C3B1;border:4px solid #FFF4E0;"
# ---------- booklet
bk = os.path.join(P, "make-github-gorgeous-booklet"); pdf = os.path.join(bk, "make-github-gorgeous-booklet.pdf")
for pg in (1, 4): subprocess.run(["pdftoppm", "-r", "70", "-f", str(pg), "-l", str(pg), "-png", "-singlefile", pdf, os.path.join(TMP, f"bk{pg}")], check=True)
vis = img(os.path.join(TMP, "bk4.png"), "right:50px;top:150px;width:320px;transform:rotate(6deg);" + shadow()) + img(os.path.join(TMP, "bk1.png"), "right:250px;top:90px;width:330px;transform:rotate(-5deg);" + shadow())
os.makedirs(os.path.join(bk, "listing"), exist_ok=True)
cover(os.path.join(bk, "listing", "cover.png"), "PIXEL GUIDE · 24 PAGES", ["Make GitHub", "Gorgeous"], "Themes, profile READMEs, static SVG magic, and a palette that passes contrast.", "$9", ["Free tools only", "Copy-paste snippets", "Light + dark"], vis, extra_css="300")
thumb(os.path.join(bk, "listing", "thumbnail.png"), ["MAKE", "GITHUB", "GORGEOUS"], "$9", sprite_svg(h.AUKY, h.AUKY_L, 7) + sprite_svg(h.HULA, h.HULA_L, 7), "24-PAGE PDF")
# ---------- readme kit
rk = os.path.join(P, "hula-arcade-readme-kit"); a = os.path.join(rk, "assets")
vis = img(os.path.join(a, "preview-hero.png"), "right:40px;top:60px;width:470px;transform:rotate(4deg);clip-path:inset(0 0 40% 0);" + shadow()) + img(os.path.join(a, "preview-dashboard.png"), "right:240px;top:300px;width:360px;transform:rotate(-4deg);clip-path:inset(0 0 52% 0);" + shadow())
os.makedirs(os.path.join(rk, "listing"), exist_ok=True)
cover(os.path.join(rk, "listing", "cover.png"), "GITHUB PROFILE README KIT", ["Hula Arcade", "README Kit"], "3 layouts, pixel banners, badges, and free GitHub Actions for a snake and stats.", "$15", ["Light + dark", "Static SVGs", "Free lite version"], vis, extra_css="330")
thumb(os.path.join(rk, "listing", "thumbnail.png"), ["HULA", "ARCADE", "README KIT"], "$15", sprite_svg(h.HIBISCUS, h.HIB_L, 9) + sprite_svg(h.HULA, h.HULA_L, 7) + sprite_svg(h.AUKY, h.AUKY_L, 7), "3 LAYOUTS")
# ---------- palette kit
pk = os.path.join(P, "hula-arcade-dev-palette-kit"); a = os.path.join(pk, "assets")
vis = img(os.path.join(a, "preview-day.png"), "right:70px;top:330px;width:500px;" + shadow() + "transform:rotate(3deg);") + img(os.path.join(a, "preview-night.png"), "right:40px;top:70px;width:500px;" + shadow() + "transform:rotate(-3deg);")
os.makedirs(os.path.join(pk, "listing"), exist_ok=True)
cover(os.path.join(pk, "listing", "cover.png"), "VS CODE · TERMINAL · PROMPT", ["Hula Arcade", "Dev Palette"], "One measured palette for your editor, terminal, and prompt. Dark and light.", "$19 Pro", ["VS Code + Cursor", "Windows Terminal", "Starship + oh-my-posh"], vis, extra_css="330")
sw = "".join(f'<div style="width:70px;height:70px;background:{c}"></div>' for c in ("#1B1F4B", "#FFD23F", "#19C3B1", "#D81B60", "#FFF4E0", "#B8A1FF"))
thumb(os.path.join(pk, "listing", "thumbnail.png"), ["HULA", "ARCADE", "DEV PALETTE"], "$19 PRO", f'<div style="display:flex;flex-wrap:wrap;width:230px;border:4px solid #FFF4E0">{sw}</div>' + sprite_svg(h.AUKY, h.AUKY_L, 8), "FREE DARK THEME")
for d in (bk, rk, pk):
    for f, s in (("cover.png", (1280, 720)), ("thumbnail.png", (600, 600))): print(d.split("/")[-1], f, check(os.path.join(d, "listing", f), s))
