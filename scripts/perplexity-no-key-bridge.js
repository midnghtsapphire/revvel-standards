'use strict';

/**
 * The one genuinely keyless Perplexity path this repo has.
 *
 * It shells out to the `helallao/perplexity-ai` Python package, which talks to
 * Perplexity without an API key of any kind. Until #17870 this lived inline in
 * `scripts/perplexity-research-issue.js` and only that one script could use it
 * — which is why `scripts/perplexity-lane.js` was first written against
 * api.perplexity.ai and mislabelled as keyless. The official API needs a key;
 * this does not. Extracted here so both callers share one copy and neither
 * drifts from the other.
 *
 * Nothing here sends a request on its own — it exports the Python program and
 * the constants callers need to run it.
 */

const NO_KEY_INSTALL_HINT =
  'python3 -m pip install "perplexity-api @ git+https://github.com/helallao/perplexity-ai.git@main"';

const NO_KEY_BRIDGE = `
import sys

prompt = sys.argv[1]
labs_model = sys.argv[2]
fallback_mode = sys.argv[3]
install_hint = sys.argv[4]

try:
    from perplexity import LabsClient, Client
except Exception as exc:
    raise SystemExit(
        f"Missing no-key Perplexity dependency ({exc}). Install with: {install_hint}"
    )

def normalize(value):
    if isinstance(value, str):
        return value.strip()

    if isinstance(value, dict):
        for key in ("output", "answer", "text", "content"):
            candidate = value.get(key)
            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip()

        chunks = value.get("chunks")
        if isinstance(chunks, list):
            parts = []
            for chunk in chunks:
                if not isinstance(chunk, dict):
                    continue
                for key in ("text", "answer", "content"):
                    candidate = chunk.get(key)
                    if isinstance(candidate, str) and candidate.strip():
                        parts.append(candidate.strip())
                        break
            if parts:
                return "\\n".join(parts).strip()

    return ""

labs_error = ""
response_text = ""

try:
    response_text = normalize(LabsClient().ask(prompt, model=labs_model))
except Exception as exc:
    labs_error = str(exc)

if not response_text:
    try:
        response_text = normalize(Client().search(prompt, mode=fallback_mode))
    except Exception as exc:
        if labs_error:
            raise SystemExit(
                f"LabsClient failed: {labs_error}; Client.search failed: {exc}"
            )
        raise SystemExit(f"Client.search failed: {exc}")

if not response_text:
    if labs_error:
        raise SystemExit(
            f"No response returned from no-key Perplexity bridge. LabsClient detail: {labs_error}"
        )
    raise SystemExit("No response returned from no-key Perplexity bridge.")

print(response_text)
`;

const BRIDGE_MODEL = process.env.PERPLEXITY_LABS_MODEL || 'sonar';
const BRIDGE_FALLBACK = process.env.PERPLEXITY_FALLBACK_MODE || 'auto';

module.exports = { NO_KEY_BRIDGE, NO_KEY_INSTALL_HINT, BRIDGE_MODEL, BRIDGE_FALLBACK };
