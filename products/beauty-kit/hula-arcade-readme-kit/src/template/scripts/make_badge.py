#!/usr/bin/env python3
"""Make a pixel badge SVG.   python3 scripts/make_badge.py "OPEN TO WORK" --color teal --out assets/badges/open-to-work.svg
Colors: yellow, teal, lavender, hibiscus, navy, cream. Every color pair has text contrast of 4.5:1 or better."""
import argparse, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hula_art import badge, BADGE_COLORS
ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("text"); ap.add_argument("--color", choices=list(BADGE_COLORS), default="yellow"); ap.add_argument("--out", required=True)
a = ap.parse_args()
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
open(a.out, "w", encoding="utf-8").write(badge(a.text, a.color)); print("wrote", a.out)
