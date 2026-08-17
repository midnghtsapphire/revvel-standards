#!/usr/bin/env python3
"""
Gumloop PDF Product Creation Pipeline — executable implementation.

This is the code equivalent of the no-code Gumloop flow documented in
``workflows/gumloop/pdf-product-creation.md`` (Webhook -> Research -> AI Title
-> AI Content -> PDF -> Product/Campaign manifest). It is wired to the repo's
OpenRouter tooling for the AI steps and renders a real PDF with reportlab.

Definition of Done (WR #14451): given a niche + keywords, produce a sellable
PDF artifact AND a product/campaign manifest with the metadata downstream
processes (Gumroad/Canva/Shopify, the PDF shape standard) need.

Best-effort + offline-safe: if ``OPENROUTER_API_KEY`` is absent the AI steps
fall back to deterministic stub copy, so the pipeline always produces a PDF and
manifest (useful for CI smoke tests and local runs).

Usage:
    python scripts/gumloop_pdf_pipeline.py \
        --niche "ADHD productivity" \
        --keywords "focus,planner,dopamine" \
        --out artifacts/pdf

Outputs (in --out, default ``artifacts/pdf``):
    <slug>.pdf            — the rendered product
    <slug>.manifest.json  — product + campaign metadata
"""
from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import re
import sys
import urllib.error
import urllib.request

OPENROUTER_HOST = "https://openrouter.ai/api/v1/chat/completions"
# Ordered best-first; mirrors scripts/openrouter-routing.js model choices.
MODELS = ["anthropic/claude-sonnet-4", "openai/gpt-5.2-codex"]


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return s or "pdf-product"


def call_openrouter(messages, max_tokens=1500, temperature=0.6):
    """Single OpenRouter chat call. Returns the content string, or None on failure."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        return None
    payload = json.dumps(
        {"model": MODELS[0], "models": MODELS, "messages": messages,
         "max_tokens": max_tokens, "temperature": temperature}
    ).encode()
    req = urllib.request.Request(
        OPENROUTER_HOST,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/midnghtsapphire/revvel-standards",
            "X-Title": "Revvel Gumloop PDF Pipeline",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read())
        return data["choices"][0]["message"]["content"]
    except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError) as exc:
        print(f"[warn] OpenRouter call failed, using fallback: {exc}", file=sys.stderr)
        return None


# ── Step 1: Research / validate niche ──────────────────────────────────────
def prepare_research(niche: str, keywords: list[str]) -> dict:
    return {
        "niche": niche or "general productivity",
        "keywords": [k.strip() for k in keywords if k.strip()],
        "timestamp": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        "step": "trend_research",
        "ready_for_ai": True,
    }


# ── Step 2: AI title ───────────────────────────────────────────────────────
def generate_title(research: dict) -> str:
    prompt = (
        f"Generate ONE punchy, sellable title for a downloadable PDF guide in the "
        f"'{research['niche']}' niche. Keywords: {', '.join(research['keywords']) or 'n/a'}. "
        f"Return only the title, no quotes."
    )
    out = call_openrouter([{"role": "user", "content": prompt}], max_tokens=40, temperature=0.8)
    if out:
        return out.strip().splitlines()[0].strip().strip('"')
    kw = research["keywords"][0] if research["keywords"] else research["niche"]
    return f"The {kw.title()} Blueprint: A Practical {research['niche'].title()} Guide"


# ── Step 3: AI content ─────────────────────────────────────────────────────
def generate_content(research: dict, title: str) -> list[dict]:
    """Returns a list of {'heading','body'} sections."""
    prompt = (
        f"Write the content for a concise, high-value sellable PDF titled '{title}' in the "
        f"'{research['niche']}' niche (keywords: {', '.join(research['keywords']) or 'n/a'}). "
        f"Return STRICT JSON: a list of 5-7 objects, each {{\"heading\": str, \"body\": str}}. "
        f"Each body 2-4 sentences, actionable. No markdown, no commentary outside the JSON."
    )
    out = call_openrouter([{"role": "user", "content": prompt}], max_tokens=1800)
    if out:
        try:
            start, end = out.find("["), out.rfind("]")
            sections = json.loads(out[start:end + 1])
            cleaned = [
                {"heading": str(s.get("heading", "")).strip(),
                 "body": str(s.get("body", "")).strip()}
                for s in sections if s.get("heading") and s.get("body")
            ]
            if cleaned:
                return cleaned
        except (json.JSONDecodeError, AttributeError, TypeError) as exc:
            print(f"[warn] content JSON parse failed, using fallback: {exc}", file=sys.stderr)
    # Deterministic fallback so the pipeline always yields a usable PDF.
    return [
        {"heading": "Introduction", "body": f"Why {research['niche']} matters now and what this guide delivers."},
        {"heading": "The Core Framework", "body": "A repeatable, step-by-step system you can apply today."},
        {"heading": "Common Pitfalls", "body": "The mistakes most people make and how to avoid them."},
        {"heading": "Tools & Resources", "body": "Free and paid tools that accelerate results."},
        {"heading": "Your 7-Day Quick Start", "body": "A short action plan to see momentum within a week."},
        {"heading": "Next Steps", "body": "How to go deeper and where to get support."},
    ]


# ── Step 4: Render PDF ─────────────────────────────────────────────────────
def render_pdf(path: str, title: str, research: dict, sections: list[dict]) -> None:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("CoverTitle", parent=styles["Title"], fontSize=28, leading=34, spaceAfter=24)
    sub = ParagraphStyle("Sub", parent=styles["Normal"], fontSize=12, textColor="#555555")
    doc = SimpleDocTemplate(path, pagesize=letter, title=title,
                            leftMargin=0.9 * inch, rightMargin=0.9 * inch,
                            topMargin=1.0 * inch, bottomMargin=0.9 * inch)
    story = [
        Paragraph(title, h1),
        Paragraph(f"A practical guide to {research['niche']}.", sub),
        Spacer(1, 0.3 * inch),
        Paragraph("Keywords: " + (", ".join(research["keywords"]) or "—"), sub),
        PageBreak(),
    ]
    for sec in sections:
        story.append(Paragraph(sec["heading"], styles["Heading2"]))
        story.append(Paragraph(sec["body"], styles["BodyText"]))
        story.append(Spacer(1, 0.18 * inch))
    doc.build(story)


# ── Step 5: Product / campaign manifest ────────────────────────────────────
def build_manifest(title: str, slug: str, research: dict, sections: list[dict], pdf_path: str) -> dict:
    return {
        "title": title,
        "slug": slug,
        "niche": research["niche"],
        "keywords": research["keywords"],
        "artifact": {"pdf": os.path.basename(pdf_path), "page_count_estimate": 1 + len(sections)},
        "product": {
            "suggested_price_usd": 19,
            "description": f"A practical, no-fluff {research['niche']} guide you can apply immediately.",
            "format": "pdf",
        },
        # Wiring points for the existing downstream processes (kept declarative
        # so the same manifest can drive Gumroad / Canva / Shopify nodes).
        "channels": {
            "gumroad": {"enabled": True, "category": "self-improvement"},
            "canva": {"cover_required": True, "status": "todo"},
            "shopify": {"enabled": False},
        },
        "campaign": {
            "hooks": [f"Master {research['niche']} in a weekend",
                      f"The {(research['keywords'][0] if research['keywords'] else research['niche'])} system that actually sticks"],
            "channels": ["x", "reddit", "newsletter"],
        },
        "generated_at": research["timestamp"],
        "pipeline": "gumloop_pdf_pipeline.py",
        "source_workflow": "workflows/gumloop/pdf-product-creation.md",
    }


def run(niche: str, keywords: list[str], out_dir: str) -> dict:
    os.makedirs(out_dir, exist_ok=True)
    research = prepare_research(niche, keywords)
    title = generate_title(research)
    slug = slugify(title)
    sections = generate_content(research, title)
    pdf_path = os.path.join(out_dir, f"{slug}.pdf")
    render_pdf(pdf_path, title, research, sections)
    manifest = build_manifest(title, slug, research, sections, pdf_path)
    manifest_path = os.path.join(out_dir, f"{slug}.manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"✅ PDF:      {pdf_path}")
    print(f"✅ Manifest: {manifest_path}")
    return {"pdf": pdf_path, "manifest": manifest_path, "title": title}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Gumloop PDF product creation pipeline")
    ap.add_argument("--niche", default=os.environ.get("PDF_NICHE", "general productivity"))
    ap.add_argument("--keywords", default=os.environ.get("PDF_KEYWORDS", ""),
                    help="comma-separated keywords")
    ap.add_argument("--out", default=os.environ.get("PDF_OUT", "artifacts/pdf"))
    args = ap.parse_args(argv)
    run(args.niche, [k for k in args.keywords.split(",")], args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
