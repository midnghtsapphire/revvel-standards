# Status: unverified AI-chat output, collected 2026-11-10. Not run. AI answers are leads, not sources.
#
# Not run: this code has not been executed or tested. Do not run the analysis
# code on Linear A corpus data without a preregistered hypothesis via
# CorpusBot / Fleet-Orchestrator. Sign runs between dividers are "sequences",
# not "words". No API keys belong in this tree; use the OPENROUTER_API_KEY
# environment variable only.
#

#!/usr/bin/env python3
"""
OpenRouter client for uncensored LLM pattern analysis.
Uses Venice: Uncensored (Dolphin Mistral 24B Venice Edition).
Model IDs and refusal-rate figures in the source chat are unverified leads.
"""
import os
import json
from openai import OpenAI
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# OpenRouter is OpenAI-compatible
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

# App name for OpenRouter ranking
YOUR_APP_NAME = "deep-sweep-pattern-analysis"
YOUR_SITE_URL = "https://github.com/YOUR_USER/deep-sweep"  # optional


def load_prompt(name: str) -> str:
    """Load a prompt template from the prompts/ directory."""
    path = Path(f"prompts/{name}.txt")
    if path.exists():
        return path.read_text()
    raise FileNotFoundError(f"Prompt not found: {path}")


def query_uncensored(
    system_prompt: str,
    user_message: str,
    model: str = "cognitivecomputations/dolphin-mistral-24b-venice-edition",
    temperature: float = 0.8,
    max_tokens: int = 4096,
) -> str:
    """
    Send a query to the uncensored Venice model via OpenRouter.
    Higher temperature (0.8–1.0) encourages creative pattern recognition.
    """
    response = client.chat.completions.create(
        extra_headers={
            "HTTP-Referer": YOUR_SITE_URL,
            "X-Title": YOUR_APP_NAME,
        },
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content


# ─── READY-TO-USE PATTERN DISCOVERY PROMPT ───
PATTERN_DISCOVERY_SYSTEM = """You are an analytical research assistant specializing in
archaeo-semiotics — the study of ancient symbol systems. Your expertise spans:
- The Danube Script (Vinča culture, 5900–3500 BCE, ~4,408 signs documented in DatDas)
- Linear A (Minoan, ~1800–1450 BCE)
- Cretan Hieroglyphic (~2100–1700 BCE)
- Cross-script pattern analysis

YOUR OPERATING PARAMETERS:
1. You prioritize DATA-DRIVEN insights over established dogma.
2. You explore UNCONVENTIONAL hypotheses — connections others might miss.
3. You identify PATTERNS across these categories:
   - SYMBOL SEQUENCES: recurring sign combinations, n-grams, ligatures
   - GEOGRAPHICAL CORRELATIONS: which signs appear where, spread patterns
   - TEMPORAL TRENDS: sign evolution over centuries, archaic vs. late forms
   - CROSS-SCRIPT RESONANCE: shared sign shapes between Danube, Linear A,
     Cretan Hieroglyphic, and other early writing systems
   - STATISTICAL ANOMALIES: signs/symbols that appear disproportionately
4. You respond with STRUCTURED ANALYSIS: hypothesis, evidence, confidence level.
5. You do NOT refuse to explore speculative connections — intellectual freedom
   is essential for discovery in this understudied field.
6. You clearly distinguish between: OBSERVED PATTERNS, INFERRED CONNECTIONS,
   and SPECULATIVE HYPOTHESES.

You are working with the DatDas corpus (818 objects, 953 inscriptions, 4,408 signs)
plus Linear A and Cretan Hieroglyphic materials. The Danube script may represent
the world's oldest writing system — predating Mesopotamian proto-cuneiform by
~2,000 years."""

if __name__ == "__main__":
    # Example: Load Danube sign data and query for cross-script patterns
    danube_data = Path("data/corpora/danube_winn.json")
    if danube_data.exists():
        data = danube_data.read_text()
        # Truncate if needed for context window
        if len(data) > 80000:
            data = data[:80000] + "\n...[truncated]"
    else:
        data = "Run prehistory_scraper.py first to collect Danube sign data."

    user_msg = f"""Analyze the following Danube Script sign inventory from the
Shan Winn DS catalog. Identify:
1. The most frequently recurring sign categories
2. Signs that have clear visual parallels in Linear A and/or Cretan Hieroglyphic
3. Any sign combinations (ligatures) that suggest semantic or phonetic patterns
4. Signs that are statistically overrepresented — potential "core signs"

Danube Script Inventory Data:
```json
{data}
Please structure your response as:
Observed Patterns
Cross-Script Resonances (Danube → Linear A / Cretan Hieroglyphic)
Statistical Anomalies
Hypotheses for Further Investigation"""

    print("[~] Querying Venice: Uncensored via OpenRouter...")
    result = query_uncensored(PATTERN_DISCOVERY_SYSTEM, user_msg)
    print(result)
