#!/usr/bin/env python3
"""Gumroad file attach automation for Revvel sellables.

Usage:
  export GUMROAD_ACCESS_TOKEN=...
  python products/gumroad_attach_files.py --list
  python products/gumroad_attach_files.py --all
  python products/gumroad_attach_files.py --product vault

Implements the official 4-step flow:
  1. POST /v2/files/presign
  2. PUT bytes to presigned S3 URLs
  3. POST /v2/files/complete
  4. PUT /v2/products/:id with files[][url]

Covers still require dashboard or signed_blob_id (API rejects plain S3 URLs for covers).
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import requests

API = "https://api.gumroad.com/v2"

# Default map: label → (product_id, pdf_filename)
# Update product IDs after create. Founder Ops was rate-limited on 2026-08-05.
PRODUCT_MAP = {
    "vault": ("QsZRGndao-1Gc2ttMUDYqA==", "Revvel-AI-Skills-Vault.pdf"),
    "agent-ops": ("5pYhFI1Rq0AnDS438m_QTA==", "pack-agent-ops.pdf"),
    "dev-workflow": ("oOEwp11nWu2hsXnVPHNUPA==", "pack-dev-workflow.pdf"),
    "review-testing": ("aLBZL26gwTpEmxlmOKYD9g==", "pack-review-testing.pdf"),
    "devops": ("TxdSLx9qB4A-zu9ZBGruAg==", "pack-devops-automation.pdf"),
    "security": ("vllV9cijq9eMzgdW88MJqQ==", "pack-security-compliance.pdf"),
    "growth": ("ynD17WKsZxl4aHYDro3wfQ==", "pack-growth-analytics.pdf"),
    # "founder": ("PENDING", "pack-founder-ops.pdf"),
}


def token() -> str:
    t = os.environ.get("GUMROAD_ACCESS_TOKEN")
    if not t:
        sys.exit("Set GUMROAD_ACCESS_TOKEN")
    return t


def headers() -> dict:
    return {"Authorization": f"Bearer {token()}"}


def list_products() -> None:
    r = requests.get(f"{API}/products", headers=headers(), timeout=30)
    r.raise_for_status()
    data = r.json()
    products = data.get("products") or []
    while data.get("next_page_key"):
        data = requests.get(
            f"{API}/products",
            headers=headers(),
            params={"page_key": data["next_page_key"]},
            timeout=30,
        ).json()
        products.extend(data.get("products") or [])
    for p in products:
        print(f"{p.get('formatted_price'):8s}  {p.get('id')}  {p.get('short_url')}  {p.get('name')}")


def upload_file(path: Path) -> str:
    size = path.stat().st_size
    pr = requests.post(
        f"{API}/files/presign",
        headers=headers(),
        data={"filename": path.name, "file_size": str(size)},
        timeout=30,
    )
    pr.raise_for_status()
    presign = pr.json()
    if not presign.get("success"):
        raise RuntimeError(f"presign failed: {presign}")

    etags = []
    with open(path, "rb") as f:
        data = f.read()
    for part in presign.get("parts") or []:
        resp = requests.put(
            part["presigned_url"],
            data=data,
            headers={"Content-Type": "application/octet-stream"},
            timeout=120,
        )
        resp.raise_for_status()
        etag = (resp.headers.get("ETag") or resp.headers.get("etag") or "").strip('"')
        if not etag:
            raise RuntimeError(f"No ETag from S3 for part {part['part_number']}")
        etags.append({"part_number": part["part_number"], "etag": etag})

    # complete
    payload = {
        "upload_id": presign["upload_id"],
        "key": presign["key"],
    }
    # form array style
    form = [("upload_id", presign["upload_id"]), ("key", presign["key"])]
    for e in etags:
        form.append(("parts[][part_number]", str(e["part_number"])))
        form.append(("parts[][etag]", e["etag"]))
    cr = requests.post(f"{API}/files/complete", headers=headers(), data=form, timeout=30)
    cr.raise_for_status()
    body = cr.json()
    if not body.get("success"):
        raise RuntimeError(f"complete failed: {body}")
    return body.get("file_url") or presign["file_url"]


def attach(product_id: str, file_url: str, name: str) -> None:
    r = requests.put(
        f"{API}/products/{product_id}",
        headers=headers(),
        data={"files[][url]": file_url, "files[][name]": name},
        timeout=30,
    )
    r.raise_for_status()
    if not r.json().get("success"):
        raise RuntimeError(f"attach failed: {r.text[:300]}")


def product_files(product_id: str) -> list:
    r = requests.get(f"{API}/products/{product_id}", headers=headers(), timeout=30)
    r.raise_for_status()
    return r.json().get("product", {}).get("files") or []


def run_one(label: str, sellables: Path) -> None:
    if label not in PRODUCT_MAP:
        raise SystemExit(f"unknown product {label}; choose from {list(PRODUCT_MAP)}")
    product_id, pdf_name = PRODUCT_MAP[label]
    path = sellables / pdf_name
    if not path.exists():
        raise SystemExit(f"missing {path}")

    existing = product_files(product_id)
    if any(f.get("name") == pdf_name for f in existing):
        print(f"{label}: already has {pdf_name} — skip")
        return

    print(f"{label}: uploading {pdf_name} ...")
    file_url = upload_file(path)
    print(f"{label}: attaching ...")
    attach(product_id, file_url, pdf_name)
    files = product_files(product_id)
    print(f"{label}: OK files={len(files)}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--list", action="store_true", help="list products")
    ap.add_argument("--all", action="store_true", help="attach all mapped products")
    ap.add_argument("--product", help="single product label from PRODUCT_MAP")
    ap.add_argument(
        "--sellables",
        default=os.environ.get("SELLABLES_DIR", "artifacts/sellables"),
        help="directory containing the PDFs",
    )
    args = ap.parse_args()
    sellables = Path(args.sellables)

    if args.list:
        list_products()
        return
    if args.all:
        for label in PRODUCT_MAP:
            run_one(label, sellables)
            time.sleep(0.4)
        return
    if args.product:
        run_one(args.product, sellables)
        return
    ap.print_help()


if __name__ == "__main__":
    main()
