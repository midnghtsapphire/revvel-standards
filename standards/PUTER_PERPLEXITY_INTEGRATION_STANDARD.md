# Puter Perplexity Integration Standard

**Version:** 1.0.0  
**Status:** Active  
**Scope:** Browser-first Revvel apps, demos, research widgets, and product pages that need Perplexity research without a Revvel-owned API key.

---

## Purpose

Puter.js gives frontend applications access to Perplexity Sonar models through `puter.ai.chat()` with no developer-managed Perplexity API key. Puter uses a user-pays model: the end user authenticates with Puter and covers their own AI resource consumption. This makes it a strong default for public demos, prototype research widgets, and user-facing research tools where Revvel should not own model spend or secret rotation.

This standard adds a supported Revvel integration path for the tutorial at:

- https://developer.puter.com/tutorials/free-unlimited-perplexity-ai-api/
- https://docs.puter.com/AI/chat/

---

## Use This Integration When

Use Puter.js + Perplexity when all of these are true:

1. The feature runs in a browser or Puter-compatible frontend runtime.
2. The user can authorize their own Puter session.
3. The app does not need server-side background research, private repo context, or unattended automation.
4. Revvel should avoid storing or paying for a Perplexity API key.

Keep using server-side OpenRouter, Tavily, Firecrawl, or the direct Perplexity API when:

- A GitHub Action, cron job, backend worker, or MCP server must run unattended.
- The research includes private repository data, secrets, or non-public customer data.
- The result must be generated before a user opens the browser.
- The workflow requires deterministic auditing under Revvel-owned credentials.

---

## Supported Perplexity Models

These are the canonical model IDs for Revvel Puter.js integrations:

| Model ID | Best for |
|---|---|
| `perplexity/sonar` | Fast general research |
| `perplexity/sonar-pro` | Professional market, business, and technical briefs |
| `perplexity/sonar-pro-search` | Search-heavy research |
| `perplexity/sonar-deep-research` | Comprehensive multi-factor research |
| `perplexity/sonar-reasoning-pro` | Analytical frameworks and reasoning-heavy questions |

The source of truth in code is `SUPPORTED_PUTER_PERPLEXITY_MODELS` in [`scripts/puter-perplexity-template.js`](../scripts/puter-perplexity-template.js).

---

## Drop-In Browser Pattern

Add Puter.js to the page:

```html
<script src="https://js.puter.com/v2/"></script>
```

Run a non-streamed research request:

```html
<script>
  puter.ai
    .chat("Research the best market entry strategy for a niche AI tool.", {
      model: "perplexity/sonar-pro"
    })
    .then((response) => {
      document.getElementById("result").textContent = String(response);
    });
</script>
```

Run a streamed deep-research request:

```html
<script>
  async function runResearch() {
    const response = await puter.ai.chat(
      "Analyze competitors, buyer pain, pricing, and risks for an AI research widget.",
      {
        model: "perplexity/sonar-deep-research",
        stream: true
      }
    );

    for await (const part of response) {
      if (part?.text) {
        document.getElementById("result").textContent += part.text;
      }
    }
  }
</script>
```

---

## Revvel Template

The committed template lives at:

```text
templates/puter/perplexity-research-widget.html
```

Regenerate it with:

```bash
node scripts/puter-perplexity-template.js
```

Write to a custom location:

```bash
node scripts/puter-perplexity-template.js public/research.html
```

The template includes:

- Accessible prompt textarea, model selector, run button, copy button, and live output region.
- Streamed Perplexity responses through `window.puter.ai.chat()`.
- No API keys, no hidden tokens, no backend proxy.
- Output rendering through `textContent`, not `innerHTML`.
- A conservative Content Security Policy that allows Puter resources while blocking form submission.

---

## Security and Privacy Rules

1. **No secrets in the browser.** Never add `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY`, or other Revvel-owned credentials to a Puter.js page.
2. **Disclose Puter handling.** Public pages must state that Puter handles user authentication, billing, model access, and usage.
3. **Do not send private repo/customer data.** Browser research prompts may be visible to the user's Puter/AI provider path. Keep private automation on server-side Revvel-controlled workflows.
4. **Render model output as text.** Use `textContent` or a vetted markdown sanitizer. Do not pipe model output into `innerHTML`.
5. **Lock the model list.** Use the canonical model IDs above and reject unknown model IDs in generated widgets.
6. **Keep CSP explicit.** Allow `https://js.puter.com` for the script and Puter domains for runtime connections. Do not use a site-wide wildcard CSP to make the widget work.

---

## Research Stack Routing

| Need | Recommended path |
|---|---|
| Public self-serve research page | Puter.js + `perplexity/sonar` or `perplexity/sonar-pro` |
| Long user-visible research brief | Puter.js + `perplexity/sonar-deep-research` with streaming |
| Complex reasoning UI | Puter.js + `perplexity/sonar-reasoning-pro` |
| Unattended WR research workflow | `scripts/research-engine.js` with OpenRouter/Tavily/Firecrawl |
| GitHub issue research comment | Existing server-side Perplexity workflow or Research Engine |
| Private/customer-sensitive research | Server-side Revvel-controlled provider with secret management |

---

## Acceptance Checklist

Before shipping a Puter Perplexity feature:

- [ ] Uses `https://js.puter.com/v2/`.
- [ ] Uses a model from the canonical supported model list.
- [ ] Does not include Revvel-owned AI provider keys.
- [ ] Clearly discloses Puter's user-pays model to the user.
- [ ] Renders output safely as text or sanitized markdown.
- [ ] Has a manual test path documented in the product README.
- [ ] If copied from the template, rerun `node tests/puter-perplexity-template.test.js`.

---

## References

- Puter Perplexity tutorial: https://developer.puter.com/tutorials/free-unlimited-perplexity-ai-api/
- Puter chat API: https://docs.puter.com/AI/chat/
- Puter user-pays model: https://docs.puter.com/user-pays-model/
