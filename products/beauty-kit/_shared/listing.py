"""Gumroad listing images: cover 1280x720 and thumbnail 600x600, Hula Arcade style. HTML -> PNG with headless Chrome."""
import os, sys, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hula_art as h
from render import html_to_png
from PIL import Image
def U(path): return "file://" + os.path.abspath(path)
def waves(w, u=5):
    return h.svg(w, 6*u, "".join(h.sprite_g(h.WAVE_TILE, h.WAVE_L, i*16*u, 0, u) for i in range(w//(16*u)+2)))
def pellets(n, u=4):
    return h.svg(n*10*u, 4*u, "".join(h.sprite_g(h.PELLET_S, {"y": h.C["yellow"]}, i*10*u, 0, u) for i in range(n)))
def sprite_svg(rows, leg, s): return h.svg(len(rows[0])*s, len(rows)*s, h.grid_svg_body(rows, leg, s=s))
BASE = "font-family:'Nunito',sans-serif;"
def cover(out, kicker, title_lines, subtitle, price, chips, visual_html, extra_css=""):
    ttl = "<br>".join(html.escape(t) for t in title_lines)
    ch = "".join(f'<span style="display:inline-block;background:#FFF4E0;color:#14163A;border:3px solid #14163A;box-shadow:4px 4px 0 #19C3B1;padding:5px 12px;margin:0 10px 12px 0;font-weight:800;font-size:20px">{html.escape(c)}</span>' for c in chips)
    page = f'''<html><body style="margin:0"><div style="{BASE}width:1280px;height:720px;position:relative;overflow:hidden;background:#14163A;color:#FFF4E0">
<div style="position:absolute;right:-140px;top:60px;width:640px;height:640px;border-radius:50%;background:#1B1F4B"></div>
<div style="position:absolute;left:0;right:0;bottom:0">{waves(1280)}</div>
<div style="position:absolute;left:56px;top:44px;font-family:'Press Start 2P',monospace;font-size:17px;color:#19C3B1">{html.escape(kicker)}</div>
<div style="position:absolute;left:56px;top:92px;width:640px;font-family:'Pixelify Sans',monospace;font-weight:700;font-size:76px;line-height:1.02;color:#FFD23F">{ttl}</div>
<div style="position:absolute;left:56px;top:{extra_css or 330}px;width:540px;font-size:28px;line-height:1.3;font-weight:600">{html.escape(subtitle)}</div>
<div style="position:absolute;left:56px;top:468px;width:580px">{ch}</div>
<div style="position:absolute;left:56px;bottom:62px;background:#FFD23F;color:#14163A;font-family:'Press Start 2P',monospace;font-size:26px;padding:14px 20px">{html.escape(price)}</div>
{visual_html}
</div></body></html>'''
    p = out + ".html"; open(p, "w", encoding="utf-8").write(page); html_to_png(p, out, 1280, 720); os.remove(p)
def thumb(out, title_lines, price, sprite_html, tag):
    ttl = "<br>".join(html.escape(t) for t in title_lines)
    page = f'''<html><body style="margin:0"><div style="{BASE}width:600px;height:600px;position:relative;overflow:hidden;background:#14163A;color:#FFF4E0">
<div style="position:absolute;left:50%;top:150px;margin-left:-190px;width:380px;height:380px;border-radius:50%;background:#1B1F4B"></div>
<div style="position:absolute;left:0;right:0;bottom:0">{waves(600)}</div>
<div style="position:absolute;left:0;right:0;top:30px;text-align:center;font-family:'Press Start 2P',monospace;font-size:13px;color:#19C3B1">AUDREYBUILDSAI</div>
<div style="position:absolute;left:24px;right:24px;top:62px;text-align:center;font-family:'Pixelify Sans',monospace;font-weight:700;font-size:56px;line-height:1.02;color:#FFD23F">{ttl}</div>
<div style="position:absolute;left:0;right:0;top:252px;display:flex;justify-content:center;align-items:flex-end;gap:14px">{sprite_html}</div>
<div style="position:absolute;left:0;right:0;bottom:60px;text-align:center"><span style="background:#FFD23F;color:#14163A;font-family:'Press Start 2P',monospace;font-size:22px;padding:10px 16px">{html.escape(price)}</span> <span style="background:#FFF4E0;color:#14163A;font-weight:800;font-size:19px;padding:8px 12px;margin-left:8px">{html.escape(tag)}</span></div>
</div></body></html>'''
    p = out + ".html"; open(p, "w", encoding="utf-8").write(page); html_to_png(p, out, 600, 600); os.remove(p)
def check(out, size):
    im = Image.open(out); assert im.size == size, (out, im.size); return im.size
