# Puter.js + Perplexity Integration Standard

**Status:** Active
**Owner:** Revvel Standards
**Last Updated:** 2025

## Purpose

Define the canonical, keyless path for using Perplexity Sonar models from browser
contexts (research widgets, public demos, embedded tools) via [Puter.js](https://puter.com).

Puter.js implements a **user-pays** model: end users authenticate with their own
Puter account and cover their own AI usage. Revvel does **not** ship Perplexity
API keys to the browser.

## When to Use

Use the Puter.js + Perplexity path when:

- The integration runs **in the browser** (static site, widget, demo, marketing page).
- You need Perplexity Sonar / online research capabilities without operating a
  proxy or managing API keys.
- The use case is **interactive** (a human is present to authorize calls).

Do **not** use Puter.js when:

- You need server-side or unattended/batch calls. Use the official Perplexity
  API with a server-held key instead (see `docs/Universal-BOM_List/API_REGISTRY_BOM.md`).
- You need guaranteed Revvel-owned billing or per-tenant cost attribution.
- The workflow must run without a logged-in human user.

## Supported Models

The following Perplexity model IDs are supported through Puter.js as of this
standard's last update:

| Model ID                          | Notes                                |
| --------------------------------- | ------------------------------------ |
| `perplexity/sonar`                | General-purpose online search model. |
| `perplexity/sonar-pro`            | Higher-quality reasoning + search.   |
| `perplexity/sonar-reasoning`      | Reasoning-focused variant.           |
| `perplexity/sonar-reasoning-pro`  | Pro reasoning variant.               |
| `perplexity/sonar-deep-research`  | Long-form deep research.             |

Always prefer the smallest model that satisfies the use case to minimize user cost.

## Browser Pattern

Minimum viable usage (streaming):

```html
<script src="https://js.puter.com/v2/"></script>
<script>
  async function ask(prompt) {
    const resp = await puter.ai.chat(prompt, {
      model: 'perplexity/sonar',
      stream: true,
    });
    for await (const part of resp) {
      // Always render via textContent, never innerHTML.
      document.getElementById('out').textContent += part?.text ?? '';
    }
  }
</script>
```

### Required Practices

1. **Load Puter.js from `https://js.puter.com/v2/` only.** Do not self-host or
   proxy the script; you lose security updates.
2. **Never embed API keys** of any kind in the page. Puter handles auth.
3. **Render model output with `textContent`** (or a sanitizer) — never
   `innerHTML` — to prevent XSS from model output.
4. **Expose a model selector** when shipping public demos so users can choose
   the cost/quality tradeoff.
5. **Show a clear "powered by Puter / user-pays" notice** so users understand
   they are authorizing their own usage.
6. **Set a Content-Security-Policy** that allows `https://js.puter.com` and
   `https://api.puter.com` and nothing broader than needed.

### Recommended CSP

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://js.puter.com;
  connect-src 'self' https://api.puter.com https://*.puter.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
```

Tighten further per deployment; the above is the minimum-permissive baseline.

## Security & Privacy Rules

- Treat all model output as untrusted user content.
- Do not log prompts/responses server-side without explicit user consent.
- Do not relay Puter-authenticated calls through a Revvel backend; that breaks
  the user-pays model and creates a key-management liability.
- If a workflow needs to persist results, persist them client-side first and let
  the user explicitly upload.

## Routing Guidance

| Scenario                                | Path                              |
| --------------------------------------- | --------------------------------- |
| Public marketing demo / research widget | Puter.js + `perplexity/sonar*`    |
| Authenticated in-app browser feature    | Puter.js (preferred) or server API |
| Server-side batch / cron / agent        | Perplexity API with server key    |
| Cost must be billed to Revvel           | Perplexity API with server key    |

## References

- Generator script: `scripts/puter-perplexity-template.js`
- Reference widget: `templates/puter/perplexity-research-widget.html`
- Tests: `tests/puter-perplexity-template.test.js`
- API registry: `docs/Universal-BOM_List/API_REGISTRY_BOM.md`
