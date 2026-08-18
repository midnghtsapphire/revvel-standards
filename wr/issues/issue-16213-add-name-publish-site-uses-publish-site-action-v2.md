# WR: add - name: Publish site   uses: publish-site/action@v2

**Issue:** #16213  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-15  
**Research Date:** 2026-08-08  
**Researcher:** Copilot Coding Agent  
**WR Status:** ✅ Complete

---

<!-- revvel-research-findings -->
## Research Findings

### Executive Decision

**APPROVE (optional, secret-gated lane)** — ship
`.github/workflows/publish-site.yml` with:

```yaml
- name: Publish site
  uses: publish-site/action@87b4aac36b939dece84e413b179523af1c7c9d8b # v2
```

Rationale:

1. The WR literally requests that step name + action.
2. Upstream `v2` resolves to commit `87b4aac36b939dece84e413b179523af1c7c9d8b`
   (tag `v2` on [publish-site/action](https://github.com/publish-site/action)).
3. The action is composite SSH/rsync to a remote nginx web root. It is **not**
   a replacement for GitHub Pages. Default public deploy stays on
   `static.yml` + `website-publish.yml`.
4. Secrets are required (`PUBLISH_SITE_URL` + `PUBLISH_SITE_PRIVKEY` or
   `PUBLISH_SITE_CERT`). When absent the job **skips cleanly** (exit 0) so
   main stays green without custom-host credentials.
5. Third-party pin uses the full commit SHA (CLAUDE.md gotcha #8 /
   `docs/THIRD_PARTY_ACTION_AUDIT.md`).

### Security disposition

| Risk | Mitigation |
| --- | --- |
| 0 GitHub stars / single-author action | SHA-pin; optional lane only; Pages remains default |
| Upstream `deploy.sh` uses `StrictHostKeyChecking=no` | Documented in workflow header; only enable for hosts you control |
| Destructive remote `rm -rf $WEBDIR/*` | Secret-gated; manual `workflow_dispatch` available; concurrency group `publish-site` |
| Path traversal via `dir` input | Resolve step rejects absolute paths and `..` segments |

### Marketing / SEO keywords

- github actions publish static site
- publish-site action v2
- custom host rsync deploy github actions
- github pages alternative ssh deploy

### Competitor / star intelligence

| Tool | Stars (approx) | Notes |
| --- | ---: | --- |
| publish-site/action | 0 | Requested action; composite SSH/rsync |
| actions/deploy-pages | first-party | Already used by `static.yml` (default path) |
| peaceiris/actions-gh-pages | high | Common Pages alternative; not needed here |

### Monetization path

Keeps the public hub (`index.html` + hub registry) deployable to a
customer-owned host when an enterprise buyer cannot use `*.github.io`.
Supports Polar.sh / product hub demos on branded domains without blocking
on GitHub Pages.

### Acceptance criteria

- [x] Workflow adds step name `Publish site` using `publish-site/action` @ v2 SHA
- [x] Missing secrets skip (do not fail default Pages path)
- [x] Regression tests in `tests/publish-site-workflow.test.js`
- [x] `npm test` / workflow YAML validation cover the new file
- [x] Conventional commit PR title

## Learnings — What & Why

Marketplace “add uses: owner/action@tag” WRs often name low-star single-author
actions. Ship them as **optional secret-gated lanes** next to the first-party
path (here: GitHub Pages), never as a hard dependency of `main`, and always
SHA-pin the third-party ref.
