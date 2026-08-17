# Freedom Angel Corps Repo Manager

**Location:** `ui/freedom-angel-repo-manager/`  
**Status:** Production, append-only (no pre-existing files deleted or renamed)  
**Owner:** Freedom Angel Corps · Audrey Evans (MIDNGHTSAPPHIRE)  
**Inherits from:** [`docs/Master_Inventory/ACCESSIBILITY_STANDARD.md`](../../docs/Master_Inventory/ACCESSIBILITY_STANDARD.md), [`docs/Master_Inventory/COMPLIANCE_RUBRIC.md`](../../docs/Master_Inventory/COMPLIANCE_RUBRIC.md), [`docs/REPO_CATALOG.md`](../../docs/REPO_CATALOG.md)

A zero-dependency, GitHub-wired dashboard that lists every repository
owned by a user or organization and audits each one against the Revvel
Standards. Built so that a non-technical family member (daughter, son)
can open a single HTML file and click one button to see what is
compliant and what is missing.

---

## 1. Features

- **Inventory** — pulls every public (and, with a token, private)
  repository for the given owner via the GitHub REST API.
- **Compliance audit** — each repo is checked for:
  1. `README.md` present
  2. `LICENSE` present (accepts `LICENSE`, `LICENSE.md`, `LICENSE.txt`, `COPYING`)
  3. `CHANGELOG.md` present (auto-documentation standard)
  4. `.github/workflows/` present (CI/CD automation)
  5. `SECURITY.md` or `.github/workflows/security.yml`
  6. Standard labels (`enhancement`, `bug`, `security`)
  7. README mentions accessibility / WCAG / a11y
  8. README references `revvel-standards` (SSOT inheritance)
- **Score** — each repo gets an `N / 8` score with colour tiers
  (green ≥ 85 %, amber ≥ 60 %, red otherwise).
- **Export** — one click exports the full audit as JSON for archival
  or downstream tooling.
- **7 accessibility modes** — Standard, WCAG AAA, Dyslexia-Friendly,
  ADHD Focus, Sensory Safe, Large Print, ECO/Low-Power. Mode persists
  in `localStorage`. Toggle via the selector or `Alt + A`.
- **No dependencies** — pure HTML, CSS, and vanilla JavaScript. Works
  offline after the first load. No build step required.
- **No writes** — the UI is strictly read-only against GitHub. It
  cannot accidentally modify any repository.

---

## 2. Run it locally (30 seconds)

```bash
cd ui/freedom-angel-repo-manager
python3 -m http.server 8080
# then open http://localhost:8080 in any modern browser
```

Or simply open `index.html` directly in a browser — everything works
from `file://` as well, no server required.

### Using a GitHub token (optional, recommended)

1. Visit <https://github.com/settings/tokens?type=beta>.
2. Create a **fine-grained personal access token**.
3. Grant **read-only** access to the repositories you want to audit
   (`Metadata: Read-only`, `Contents: Read-only`, `Issues: Read-only`).
4. Paste the token into the UI and click **Load repositories**.
5. Token is stored only in your browser's `localStorage`. Click
   **Forget token** to wipe it.

---

## 3. Host on GitHub Pages (optional)

GitHub Pages turns this folder into a public URL that your family can
bookmark. From the repository root:

```bash
# Enable Pages on the repository (Settings → Pages → "Deploy from a branch")
# Branch: main, Folder: / (root)
# Then the UI is live at:
#   https://midnghtsapphire.github.io/revvel-standards/ui/freedom-angel-repo-manager/
```

No workflow change needed — GitHub Pages serves this folder verbatim.

---

## 4. Bootstrap verification steps

These are the steps Audrey (or any reviewer) can run to verify the UI
is wired correctly end-to-end.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `index.html` in a browser | Page renders, accessibility selector visible in header |
| 2 | Switch the accessibility selector through all 7 modes | Background, fonts, and focus outlines change per mode; preference persists on reload |
| 3 | Leave owner as `midnghtsapphire`, leave token blank, click **Load repositories** | Status changes to "Loaded N repositories"; cards render |
| 4 | Click **Run audit** on any one card | Checks change from `…` to `✓` or `✗`; score badge updates |
| 5 | Click **Audit all repositories** | All cards receive scores sequentially; summary strip updates |
| 6 | Click **Export report (JSON)** | Browser downloads `revvel-audit-<owner>-<timestamp>.json` |
| 7 | Open the downloaded JSON | Contains `generatedAt`, `owner`, `totalRepos`, `audits` map |
| 8 | Paste a token, click **Load repositories**, then **Forget token** | Token input clears; status confirms removal; `localStorage` no longer contains `facrm.token` |
| 9 | Run a keyboard-only pass: `Tab` through every control | Focus outline always visible; no keyboard trap |
| 10 | Run axe or Lighthouse against the page | 0 critical accessibility violations |

---

## 5. Reuse the master prompt

The [`MASTER_PROMPT.md`](./MASTER_PROMPT.md) in this folder is the
copy-paste reusable prompt that turns any third-party agent
(OpenRouter, Grok, Claude, GPT, etc.) into an EXRUP-compliant Revvel
Standards agent. Paste it as the system prompt for any outside model
and the model will produce append-only, fully-documented output that
drops straight into this repository.

---

## 6. Architecture (for contributors)

```text
ui/freedom-angel-repo-manager/
├── index.html          Semantic HTML, all ARIA attributes, skip link
├── styles.css          Design tokens + 7 accessibility-mode overrides
├── app.js              GitHub API client + audit engine + renderers
├── MASTER_PROMPT.md    Reusable EXRUP master prompt
└── README.md           This file
```

The audit engine in `app.js` is a flat list of `CHECKS`. Adding a new
standard check is a single append — no other file needs to change:

```js
CHECKS.push({
  id: "dependabot",
  label: "Dependabot configured",
  run: function (ctx) {
    return hasFile(ctx, ".github/dependabot.yml");
  },
});
```

This mirrors the append-only policy of the rest of the repository.

---

## 7. Security & privacy

- All requests go to `api.github.com` only. No third-party CDNs, no
  analytics, no trackers.
- No `eval`, no `innerHTML` with user content, no inline event
  handlers. User-supplied data is rendered with `textContent` only.
- The personal access token is stored in `localStorage` under
  `facrm.token` and is only sent as a `Bearer` header to GitHub. Use
  **Forget token** to wipe it.
- The UI performs no writes. It cannot create, modify, or delete
  issues, PRs, files, or labels.

---

## 8. License

Same as parent repository. See [`../../LICENSE`](../../LICENSE).
