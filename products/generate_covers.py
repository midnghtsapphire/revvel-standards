#!/usr/bin/env python3
"""Generate SEO product covers for Gumroad (Pillow).

Writes products/covers/cover-*.jpg
SEO sizing: 784x1168 portrait (Gumroad-friendly) or run with --landscape for 1280x720.

Usage:
  pip install Pillow
  python products/generate_covers.py
"""
from __future__ import annotations

import argparse
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as e:
    raise SystemExit("pip install Pillow") from e

OUT = Path(__file__).resolve().parent / "covers"

PACKS = [
    ("cover-vault.jpg", "Revvel AI Skills Vault", "Full Catalogue · $99", (247, 201, 72)),
    ("cover-agent-ops.jpg", "Agent Ops Pack", "Production Skills · $29", (124, 92, 255)),
    ("cover-dev-workflow.jpg", "Dev Workflow Pack", "Ship Faster · $29", (61, 220, 255)),
    ("cover-review-testing.jpg", "Review & Testing", "Quality Gates · $29", (255, 107, 107)),
    ("cover-devops.jpg", "DevOps Pack", "CI/CD & Infra · $29", (16, 185, 129)),
    ("cover-security.jpg", "Security Pack", "Compliance Ready · $29", (239, 68, 68)),
    ("cover-growth.jpg", "Growth Pack", "Analytics & SEO · $29", (245, 158, 11)),
]


def make(filename: str, title: str, subtitle: str, accent: tuple[int, int, int], landscape: bool) -> None:
    if landscape:
        W, H = 1280, 720
    else:
        W, H = 784, 1168
    im = Image.new("RGB", (W, H), (11, 15, 26))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 12], fill=accent)
    d.rectangle([0, H - 12, W, H], fill=accent)
    try:
        font_lg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 42 if not landscape else 52)
        font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 26 if not landscape else 30)
        font_xs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
    except Exception:
        font_lg = font_sm = font_xs = ImageFont.load_default()
    d.text((48, 120 if landscape else 180), "REVVEL", fill=(138, 147, 166), font=font_xs)
    d.text((48, 160 if landscape else 220), title, fill=(231, 236, 245), font=font_lg)
    d.text((48, 230 if landscape else 300), subtitle, fill=accent, font=font_sm)
    d.text((48, H - 80), "Instant PDF · Freedom Angel Corp", fill=(138, 147, 166), font=font_xs)
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / filename
    im.save(dest, "JPEG", quality=85, optimize=True)
    print(f"wrote {dest} ({dest.stat().st_size} bytes)")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--landscape", action="store_true", help="1280x720 landscape")
    args = ap.parse_args()
    for row in PACKS:
        make(*row, landscape=args.landscape)


if __name__ == "__main__":
    main()
