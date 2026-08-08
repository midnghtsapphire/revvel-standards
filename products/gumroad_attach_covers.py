#!/usr/bin/env python3
"""Attach SEO product covers to Gumroad via public URLs.

Gumroad POST /v2/products/:id/covers requires a publicly reachable image URL
with a real image Content-Type. We use jsDelivr CDN in front of GitHub:

  https://cdn.jsdelivr.net/gh/midnghtsapphire/revvel-standards@REF/products/covers/cover-*.jpg

Usage:
  export GUMROAD_ACCESS_TOKEN=...
  python products/gumroad_attach_covers.py --all
  python products/gumroad_attach_covers.py --product vault
  python products/gumroad_attach_covers.py --all --ref abc1234   # pin to commit SHA
"""
from __future__ import annotations

import argparse
import os
import sys
import time

import requests

API = "https://api.gumroad.com/v2"
CDN_TMPL = "https://cdn.jsdelivr.net/gh/midnghtsapphire/revvel-standards@{ref}/products/covers/{filename}"

PRODUCT_COVERS = {
    "vault": ("QsZRGndao-1Gc2ttMUDYqA==", "cover-vault.jpg"),
    "agent-ops": ("5pYhFI1Rq0AnDS438m_QTA==", "cover-agent-ops.jpg"),
    "dev-workflow": ("oOEwp11nWu2hsXnVPHNUPA==", "cover-dev-workflow.jpg"),
    "review-testing": ("aLBZL26gwTpEmxlmOKYD9g==", "cover-review-testing.jpg"),
    "devops": ("TxdSLx9qB4A-zu9ZBGruAg==", "cover-devops.jpg"),
    "security": ("vllV9cijq9eMzgdW88MJqQ==", "cover-security.jpg"),
    "growth": ("ynD17WKsZxl4aHYDro3wfQ==", "cover-growth.jpg"),
}


def token() -> str:
    t = os.environ.get("GUMROAD_ACCESS_TOKEN")
    if not t:
        sys.exit("Set GUMROAD_ACCESS_TOKEN")
    return t


def attach_cover(product_id: str, url: str) -> dict:
    r = requests.post(
        f"{API}/products/{product_id}/covers",
        data={"access_token": token(), "url": url},
        timeout=60,
    )
    try:
        return r.json()
    except Exception:
        return {"success": False, "message": r.text[:400]}


def run_one(label: str, ref: str) -> None:
    if label not in PRODUCT_COVERS:
        raise SystemExit(f"unknown {label}; choose from {list(PRODUCT_COVERS)}")
    product_id, filename = PRODUCT_COVERS[label]
    url = CDN_TMPL.format(ref=ref, filename=filename)
    # Verify image is reachable with image/* content-type
    head = requests.head(url, timeout=20, allow_redirects=True)
    ct = head.headers.get("Content-Type", "")
    print(f"{label}: {url} ({head.status_code} {ct})")
    if head.status_code != 200 or not ct.startswith("image/"):
        print(f"{label}: SKIP — cover not yet public or wrong content-type")
        return
    body = attach_cover(product_id, url)
    if body.get("success"):
        print(f"{label}: OK covers={len(body.get('covers') or [])}")
    else:
        print(f"{label}: FAIL {body.get('message') or body}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--product")
    ap.add_argument("--ref", default="main", help="git ref or commit SHA for jsDelivr")
    args = ap.parse_args()
    if args.all:
        for label in PRODUCT_COVERS:
            run_one(label, args.ref)
            time.sleep(0.6)
        return
    if args.product:
        run_one(args.product, args.ref)
        return
    ap.print_help()


if __name__ == "__main__":
    main()
