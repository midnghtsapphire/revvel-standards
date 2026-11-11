# Library: drop folders and dashboard hosting (WR #18379)

Sources the drop-folder processor and the dashboard hosting plan rely on. Read 2026-11-11.

- PR [#14871](https://github.com/midnghtsapphire/revvel-standards/pull/14871): `docs/research-drafts/` incubator and per-source buckets.
- PR [#13637](https://github.com/midnghtsapphire/revvel-standards/pull/13637): execution OS, `docs/inbox/TEMPLATE.md`, runner-orchestrator.
- PR [#549](https://github.com/midnghtsapphire/revvel-standards/pull/549): the project dashboard.
- Cloudflare Pages, Direct Upload: <https://developers.cloudflare.com/pages/get-started/direct-upload/> (Wrangler uploads, 20,000 files, 25 MiB per file, a Direct Upload project cannot switch to Git integration).
- Cloudflare Pages, limits: <https://developers.cloudflare.com/pages/platform/limits/> (free plan: 500 builds a month for Git builds, 100 custom domains, 20,000 files).
- Gemini Notebook API (formerly NotebookLM), for WR [#18380](https://github.com/midnghtsapphire/revvel-standards/issues/18380): <https://developers.google.com/notebook/docs>, <https://developers.google.com/notebook/docs/roadmap>, <https://developers.google.com/notebook/docs/authentication>.
- `standards/COMMENT-DONT-DELETE.md` (RVS-AGENT-001): annotate, do not delete.
