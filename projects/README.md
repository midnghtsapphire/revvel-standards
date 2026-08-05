# Projects Directory

This directory holds project-level tracking and strategy documents for the
MIDNGHTSAPPHIRE organization.

## Structure

```text
projects/
  _self/          # Revvel corporate docs (nonprofit, tax, grants, support)
  README.md       # This file
```

## Where Does Project Tracking Live

Project tracking in the Revvel ecosystem is **distributed** — each repo is its
own project. This directory is reserved for **cross-cutting** strategy documents
that don't belong to any single repo.

For per-repo project status, use:

- **GitHub Projects board:** [github.com/orgs/midnghtsapphire/projects](https://github.com/orgs/midnghtsapphire/projects)
- **GitHub Issues on revvel-standards:** The default issue repo for org-wide work
- **`docs/PROJECT_CATALOG.md`:** Manually maintained snapshot of key repos
- **GitHub API:** `gh repo list midnghtsapphire --limit 500 --json name,description,updatedAt`

## Adding New Project Docs

Place documents here only if they apply to the **organization as a whole**
(e.g., nonprofit strategy, tax filings, grant compliance). For repo-specific
docs, add them to that repo's `docs/` directory instead.
