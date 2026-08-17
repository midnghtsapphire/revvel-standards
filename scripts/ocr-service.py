#!/usr/bin/env python3
"""
Revvel OCR Service — powered by PaddleOCR (PP-StructureV3)

Extracts text and structure from images / PDFs and emits clean Markdown.
Recommended tool from WR #13653 deep evaluation: PaddleOCR beats EasyOCR,
Tesseract, and AWS Textract for cost-free multilingual document parsing.

Usage
-----
  # Install dependencies (once)
  pip install paddlepaddle paddleocr

  # Extract text from a local image
  python scripts/ocr-service.py --input ./invoice.png

  # Extract text from a URL
  python scripts/ocr-service.py --input https://example.com/doc.jpg

  # Use PP-Structure for layout-aware Markdown (tables, headers, etc.)
  python scripts/ocr-service.py --input ./report.pdf --structure

  # Write output to file
  python scripts/ocr-service.py --input ./scan.png --output ./output.md

  # JSON output (machine-readable)
  python scripts/ocr-service.py --input ./scan.png --format json

Dependencies
------------
  paddlepaddle   — deep learning framework (CPU build by default)
  paddleocr      — OCR & document understanding toolkit
  requests       — for URL downloads
  Pillow         — image loading

Environment
-----------
  OCR_LANG      — target language(s), default "en" (e.g. "ch" for Chinese)
  OCR_GPU       — set to "1" to enable GPU inference (default CPU)
  OCR_ANGLE_CLS — set to "0" to disable angle classification
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import urllib.request
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Lazy import — fail gracefully with an actionable message
# ---------------------------------------------------------------------------
try:
    from paddleocr import PaddleOCR, PPStructure  # type: ignore
except ImportError:
    print(
        "❌  PaddleOCR is not installed.\n"
        "    Run: pip install paddlepaddle paddleocr\n"
        "    Docs: https://github.com/PaddlePaddle/PaddleOCR",
        file=sys.stderr,
    )
    sys.exit(1)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _bool_env(var: str, default: bool) -> bool:
    val = os.environ.get(var, "").lower()
    if val in ("1", "true", "yes"):
        return True
    if val in ("0", "false", "no"):
        return False
    return default


def _download_url(url: str) -> Path:
    """Download a remote image to a temp file and return its path."""
    suffix = Path(url.split("?")[0]).suffix or ".png"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    urllib.request.urlretrieve(url, tmp.name)
    return Path(tmp.name)


def _resolve_input(source: str) -> tuple[Path, bool]:
    """Return (local_path, is_temp)."""
    if source.startswith(("http://", "https://")):
        return _download_url(source), True
    p = Path(source).expanduser().resolve()
    if not p.exists():
        print(f"❌  File not found: {p}", file=sys.stderr)
        sys.exit(1)
    return p, False


# ---------------------------------------------------------------------------
# OCR engine wrappers
# ---------------------------------------------------------------------------

class SimpleOCR:
    """Plain text extraction — fast, multi-language, CPU-friendly."""

    def __init__(self) -> None:
        lang = os.environ.get("OCR_LANG", "en")
        use_gpu = _bool_env("OCR_GPU", False)
        use_angle_cls = _bool_env("OCR_ANGLE_CLS", True)

        self._engine = PaddleOCR(
            use_angle_cls=use_angle_cls,
            lang=lang,
            use_gpu=use_gpu,
            show_log=False,
        )

    def run(self, image_path: str | Path) -> list[dict[str, Any]]:
        result = self._engine.ocr(str(image_path), cls=True)
        items: list[dict[str, Any]] = []
        for line in result or []:
            for box, (text, confidence) in (line or []):
                items.append(
                    {
                        "text": text,
                        "confidence": round(float(confidence), 4),
                        "box": box,
                    }
                )
        return items

    def to_markdown(self, image_path: str | Path) -> str:
        items = self.run(image_path)
        lines = [item["text"] for item in items]
        return "\n".join(lines)


class StructuredOCR:
    """Layout-aware extraction via PP-Structure — tables, headings, figures."""

    def __init__(self) -> None:
        lang = os.environ.get("OCR_LANG", "en")
        use_gpu = _bool_env("OCR_GPU", False)

        self._engine = PPStructure(
            lang=lang,
            use_gpu=use_gpu,
            show_log=False,
            return_word_box=False,
        )

    def run(self, image_path: str | Path) -> list[dict[str, Any]]:
        return self._engine(str(image_path)) or []

    def to_markdown(self, image_path: str | Path) -> str:
        result = self.run(image_path)
        sections: list[str] = []

        for region in result:
            region_type = region.get("type", "text").lower()
            res = region.get("res", {})

            if region_type == "table":
                # Tables returned as HTML — convert to simple markdown table
                html: str = res if isinstance(res, str) else res.get("html", "")
                sections.append(_html_table_to_markdown(html))

            elif region_type in ("title", "header"):
                texts = _extract_texts(res)
                if texts:
                    sections.append(f"## {' '.join(texts)}")

            elif region_type == "figure":
                sections.append("*(figure)*")

            else:
                texts = _extract_texts(res)
                if texts:
                    sections.append("\n".join(texts))

        return "\n\n".join(sections)


# ---------------------------------------------------------------------------
# Utility: HTML table → Markdown table (minimal, no external deps)
# ---------------------------------------------------------------------------

def _html_table_to_markdown(html: str) -> str:
    """Very small HTML-table-to-Markdown converter (no external libs)."""
    import re

    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.DOTALL | re.IGNORECASE)
    md_rows: list[list[str]] = []
    header_row: int | None = None

    for i, row_html in enumerate(rows):
        cells = re.findall(
            r"<t[dh][^>]*>(.*?)</t[dh]>", row_html, re.DOTALL | re.IGNORECASE
        )
        cleaned = [re.sub(r"<[^>]+>", "", c).strip() for c in cells]
        if cleaned:
            md_rows.append(cleaned)
            if header_row is None and re.search(r"<th", row_html, re.IGNORECASE):
                header_row = i

    if not md_rows:
        return ""

    col_count = max(len(r) for r in md_rows)

    def pad(row: list[str]) -> list[str]:
        return row + [""] * (col_count - len(row))

    lines: list[str] = []
    for i, row in enumerate(md_rows):
        lines.append("| " + " | ".join(pad(row)) + " |")
        if i == (header_row if header_row is not None else 0):
            lines.append("| " + " | ".join(["---"] * col_count) + " |")

    return "\n".join(lines)


def _extract_texts(res: Any) -> list[str]:
    if isinstance(res, list):
        return [item[1][0] for item in res if isinstance(item, (list, tuple)) and len(item) >= 2]
    return []


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Revvel OCR Service — PaddleOCR-powered document parser",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("--input", "-i", required=True, help="Local path or URL to image/PDF")
    p.add_argument(
        "--structure", "-s", action="store_true",
        help="Use PP-Structure for layout-aware Markdown (tables, headers)"
    )
    p.add_argument("--output", "-o", help="Write output to this file instead of stdout")
    p.add_argument(
        "--format", "-f", choices=["markdown", "json", "text"],
        default="markdown", help="Output format (default: markdown)"
    )
    return p


def main() -> None:
    args = build_parser().parse_args()
    image_path, is_temp = _resolve_input(args.input)

    try:
        if args.structure:
            engine: SimpleOCR | StructuredOCR = StructuredOCR()
        else:
            engine = SimpleOCR()

        if args.format == "json":
            raw = engine.run(image_path)
            output = json.dumps(raw, ensure_ascii=False, indent=2)
        else:
            output = engine.to_markdown(image_path)

        if args.output:
            Path(args.output).write_text(output, encoding="utf-8")
            print(f"✅  Output written to {args.output}")
        else:
            print(output)

    finally:
        if is_temp:
            image_path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
