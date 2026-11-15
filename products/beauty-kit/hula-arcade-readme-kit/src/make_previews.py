#!/usr/bin/env python3
"""Renders PNG previews of each layout (a GitHub-like page; snake is a drawn mock because the real one is made by Actions on GitHub)."""
import os, re, sys, shutil, html
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, ".."); B = os.path.join(ROOT, "build", "pro", "hula-arcade-readme-kit-pro")
sys.path.insert(0, os.path.join(HERE, "..", "..", "_shared")); sys.path.insert(0, os.path.join(HERE, "template", "scripts"))
import hula_art as h
from render import html_to_png
from markdown_it import MarkdownIt
import pixel_stats
OUTDIR = os.path.join(ROOT, "assets"); os.makedirs(OUTDIR, exist_ok=True)
def mock_snake(light):
    u = 12; cols, rows = 53, 7
    bg = h.C["cream"] if light else h.C["ink"]
    dots = ["#EFD9B4", "#FFC9A3", "#FFA07A", "#E8578A", "#B5124F"] if light else ["#252A63", "#127E78", "#19C3B1", "#B8A1FF", "#FFD23F"]
    sn = h.C["navy"] if light else h.C["cream"]
    import random; rnd = random.Random(7)
    b = [f'<rect width="{cols*u+2*u}" height="{rows*u+2*u}" fill="{bg}"/>']
    for c in range(cols):
        for r in range(rows):
            lv = 0 if rnd.random() < .45 else rnd.randint(1, 4)
            b.append(f'<rect x="{u+c*u+1}" y="{u+r*u+1}" width="{u-2}" height="{u-2}" rx="2" fill="{dots[lv]}"/>')
    for k in range(14): b.append(f'<rect x="{u+(10+k)*u+1}" y="{u+3*u+1}" width="{u-2}" height="{u-2}" rx="2" fill="{sn}"/>')
    return h.svg(cols*u+2*u, rows*u+2*u, "".join(b), title="Mock snake (preview only)")
for light in (True, False):
    pixel_stats_d = pixel_stats.sample(); pixel_stats_d["user"] = "octo-fan"
    n = "light" if light else "dark"
    open(os.path.join(B, f"_snake-{n}.svg"), "w").write(mock_snake(light)); open(os.path.join(B, f"_stats-{n}.svg"), "w").write(pixel_stats.card(pixel_stats_d, light))
CSS = {"light": "body{background:#fff;color:#1f2328}.box{border:1px solid #d0d7de}a{color:#0969da}code,pre{background:#f6f8fa}th,td{border:1px solid #d0d7de}.alert{background:#ddf4ff;border-left:4px solid #0969da}",
       "dark": "body{background:#0d1117;color:#e6edf3}.box{border:1px solid #30363d}a{color:#4493f8}code,pre{background:#161b22}th,td{border:1px solid #30363d}.alert{background:#121d2f;border-left:4px solid #4493f8}"}
def render(layout_dir, name, mode, height):
    src = open(os.path.join(B, "layouts", layout_dir, "README.md"), encoding="utf-8").read()
    src = re.sub(r"https://raw\.githubusercontent\.com/YOUR-USERNAME/YOUR-USERNAME/output/(snake|stats)(-dark|-light)?\.svg", lambda m: f"_{m.group(1)}-{'dark' if m.group(2)=='-dark' else 'light'}.svg", src)
    src = re.sub(r"> \[!(TIP|NOTE)\]\n> ", lambda m: "> **" + m.group(1).title() + "**  \n> ", src)
    if mode == "dark":
        src = re.sub(r'<picture>\s*<source[^>]*srcset="([^"]+)">\s*<img alt="([^"]*)" src="[^"]*"([^>]*)>\s*</picture>', r'<img alt="\2" src="\1"\3>', src)
    body = MarkdownIt("commonmark", {"html": True}).enable("table").render(src)
    page = f"<!doctype html><meta charset='utf-8'><style>body{{font-family:-apple-system,'Segoe UI',Nunito,sans-serif;margin:0;padding:24px;font-size:15px;line-height:1.5}}.box{{width:880px;margin:0 auto;padding:24px;border-radius:8px}}table{{border-collapse:collapse;margin:8px 0}}th,td{{padding:6px 12px}}blockquote{{margin:8px 0;padding:6px 14px}}pre{{padding:12px;border-radius:6px}}h2,h3{{border-bottom:1px solid #8883;padding-bottom:4px}}{CSS[mode]}</style><body><div class='box'>{body.replace('<blockquote>', '<blockquote class=alert>')}</div></body>"
    p = os.path.join(B, "_preview.html"); open(p, "w", encoding="utf-8").write(page)
    html_to_png(p, os.path.join(OUTDIR, name), 930, height, dark=(mode=="dark"))
    os.remove(p)
render("01-arcade-hero", "preview-hero.png", "dark", 1500)
render("02-aloha-minimal", "preview-minimal.png", "light", 620)
render("03-builder-dashboard", "preview-dashboard.png", "light", 1500)
for f in os.listdir(B):
    if f.startswith("_"): os.remove(os.path.join(B, f))
print("previews ok")
