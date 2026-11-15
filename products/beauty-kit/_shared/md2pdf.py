"""Markdown -> branded PDF through markdown-it-py + Chrome headless."""
import os, sys, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from markdown_it import MarkdownIt
from art import *
from render import html_to_pdf
def md_to_pdf(md_path, pdf_path, title, subtitle, cover=True):
    md = MarkdownIt("commonmark", {"html": False}).enable("table")
    body = md.render(open(md_path, encoding="utf-8").read())
    css = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "brand.css")).read()
    hula = sprite_g(HULA, HULA_L, 0, 0, 8); auky = sprite_g(AUKY, AUKY_L, 0, 0, 8)
    cov = ""
    if cover:
        cov = f'''<div class="cover"><div style="font-family:'Press Start 2P',monospace;color:#19C3B1;font-size:10pt;margin-bottom:18pt">AUDREYBUILDSAI</div>
<h1>{html.escape(title)}</h1><p>{html.escape(subtitle)}</p>
<div style="position:absolute;left:0.8in;bottom:0.9in">{svg(16*8,26*8,hula)}</div><div style="position:absolute;left:2.6in;bottom:0.9in">{svg(16*8,16*8,auky)}</div>
<div style="position:absolute;left:0;right:0;bottom:0;height:0.5in;background:#19C3B1"></div>
<div style="position:absolute;right:0.8in;bottom:0.7in;font-size:9pt;color:#FFF4E0">&copy; 2026 Freedom Angel Corp</div></div>'''
    open(pdf_path + ".html", "w", encoding="utf-8").write(f"<!doctype html><html><head><meta charset='utf-8'><title>{html.escape(title)}</title><style>{css}</style></head><body>{cov}{body}</body></html>")
    html_to_pdf(pdf_path + ".html", pdf_path); os.remove(pdf_path + ".html")
