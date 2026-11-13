#!/usr/bin/env python3
"""Make your own Hula Arcade banner (light + dark SVG). Letters A-Z, digits and . , ! ? - : / ' + # ( ) & are supported.

  python3 scripts/make_banner.py --layout hero --title "HI, I'M ADA" --tagline "I BUILD COMPILERS" --out assets/banners
Layouts: hero, minimal, dashboard.  Tagline: one or two lines, separated by | (keep each under ~34 characters).
"""
import argparse, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hula_art import banner, text_width, DEFAULTS
ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("--layout", choices=list(DEFAULTS), default="hero")
ap.add_argument("--title"); ap.add_argument("--tagline", help="use | to separate two lines"); ap.add_argument("--out", default="assets/banners")
ap.add_argument("--prefix", default=None, help="file name prefix, default: banner-<layout>")
a = ap.parse_args()
tag = tuple(s.strip() for s in a.tagline.split("|")) if a.tagline else None
title = a.title or DEFAULTS[a.layout][0]
limit = 150 if a.layout == "hero" else 220
if text_width(title, 2) > limit: sys.exit(f"Title is too long ({text_width(title, 2)} > {limit} units). Shorten it.")
for line in (tag or DEFAULTS[a.layout][1]):
    if text_width(line) > (150 if a.layout == "hero" else 215): sys.exit(f"Tagline line is too long: {line}")
os.makedirs(a.out, exist_ok=True); prefix = a.prefix or f"banner-{a.layout}"
for light, suffix in ((True, "light"), (False, "dark")):
    p = os.path.join(a.out, f"{prefix}-{suffix}.svg")
    open(p, "w", encoding="utf-8").write(banner(a.layout, light, a.title, tag)); print("wrote", p)
