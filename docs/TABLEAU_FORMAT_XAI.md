# Validate Tableau Format XAI

Reusable GitHub Marketplace action template for Tableau workbook / datasource
style validation.

| Field | Value |
| --- | --- |
| Marketplace | [Validate Tableau Format XAI](https://github.com/marketplace/actions/validate-tableau-format-xai) |
| Upstream action | [`dsmdavid/action-test-tableau-format`](https://github.com/dsmdavid/action-test-tableau-format) |
| Latest release used | [`v0.1.6`](https://github.com/dsmdavid/action-test-tableau-format/releases/tag/v0.1.6) (SHA `010ef76d6e9a68d0ebb19842b01f95d7879bd04f`) |
| GitHub stars* | 0 |
| Based on | [`bcrant/tableau-style-validator`](https://github.com/bcrant/tableau-style-validator) |
| Template | [`templates/cicd/validate-tableau-format-xai.yml`](../templates/cicd/validate-tableau-format-xai.yml) |
| Example style guide | [`templates/cicd/tableau/example_style_guide.json`](../templates/cicd/tableau/example_style_guide.json) |
| Active in this repo? | No (template-only — no Tableau assets here) |
| Secrets | None |

\* Star count captured from GitHub repository metadata on 2026-08-08.

## What it does

On pull requests (and optional `workflow_dispatch` / path-filtered pushes) the
workflow:

1. Checks out the repo with full history so diffs can list changed assets.
2. Resolves a JSON style guide (`style_guide/tableau_style_guide.json` by default).
3. Collects changed `.twb` / `.twbx` / `.tds` / `.tdsx` paths (or every tracked
   Tableau file on manual runs).
4. Runs `dsmdavid/action-test-tableau-format` pinned to the `v0.1.6` commit SHA against those paths.
5. Uploads `outputs.txt` as a workflow artifact and writes a step summary.

When the style guide or Tableau files are missing, the job emits a
`::warning::` / `::notice::` and **skips** instead of failing red. That matches
the Revvel template rollout pattern used by eco / a11y marketplace actions.

## Marketing / SEO keywords

`tableau style guide`, `twb validation`, `tds lint`, `tableau ci`,
`workbook format check`, `tableau xai`, `dashboard design system`,
`analytics quality gate`, `github actions tableau`.

## Monetization path

Use this as a **paid quality gate** for analytics / BI product SKUs:

- Bundle the workflow + house style guide into Revvel “Tableau Design System”
  packs sold via Gumroad / Polar.sh.
- Offer managed CI setup for client Tableau monorepos (implementation fee +
  monthly monitoring retainer).
- Upsell OSINT / ops dashboards that must stay on-brand before release.

Without a style gate, workbook drift burns designer time and blocks white-label
dashboard resale. The gate is the moat for any productized Tableau asset line.

## Adoption (copy into a product repo)

1. Copy
   [`templates/cicd/validate-tableau-format-xai.yml`](../templates/cicd/validate-tableau-format-xai.yml)
   → `.github/workflows/validate-tableau-format-xai.yml`.
2. Copy
   [`templates/cicd/tableau/example_style_guide.json`](../templates/cicd/tableau/example_style_guide.json)
   → `style_guide/tableau_style_guide.json` and edit brand fonts/colors.
3. Commit `.twb` / `.tds` assets under the product repo (or a `tableau/` folder).
4. Open a PR that touches a workbook — Actions → **Validate Tableau Format XAI**.
5. Download the `tableau-format-xai-outputs` artifact (or read the job summary)
   when a run fails.

### Manual run

**GitHub → Actions → Validate Tableau Format XAI → Run workflow**

Optional inputs:

| Input | Meaning | Default |
| --- | --- | --- |
| `modified_files` | Space-separated paths to validate | auto-detect / all tracked |
| `path_to_json` | Style guide path | `style_guide/tableau_style_guide.json` |

## Upstream caveats (read before production)

- **Stale release.** Latest tag is `v0.1.6` from 2021-06-28; the Marketplace
  listing has not shown active maintenance. Treat this as a starting point, not
  a long-term dependency without a fork plan.
- **Docker action.** Each run pulls the action image; cold starts are slower
  than JavaScript actions.
- **Input shape.** `modified_files` is a single space-separated string (not a
  multiline list). The template normalizes paths before calling the action.
- **Output filename.** Upstream docs say `outputs.txt`; the entrypoint also
  references `output.txt`. The template uploads both names if present.
- **No OpenRouter / AI key required.** This is a deterministic style check, not
  an LLM review lane.

## Factual citations

1. Marketplace listing:
   <https://github.com/marketplace/actions/validate-tableau-format-xai>
2. Action source + `action.yaml` inputs `modified_files`, `path_to_json`:
   <https://github.com/dsmdavid/action-test-tableau-format>
3. Release `v0.1.6` (2021-06-28):
   <https://github.com/dsmdavid/action-test-tableau-format/releases/tag/v0.1.6>
4. Style-validator foundation and example guide:
   <https://github.com/bcrant/tableau-style-validator>
   <https://github.com/bcrant/tableau-style-validator/blob/main/tests/example_style_guide.json>

## See also

- [`templates/cicd/README.md`](../templates/cicd/README.md) — full CI/CD template inventory
- [`docs/ECO_MARKETPLACE_ACTIONS.md`](./ECO_MARKETPLACE_ACTIONS.md) — sibling template-only marketplace bundle pattern
- [`docs/OPENROUTER_MARKETPLACE_ACTIONS.md`](./OPENROUTER_MARKETPLACE_ACTIONS.md) — AI-backed marketplace actions
