# WR: [WR] add `live-http-dashboard`, `github-action` and `github-app` to list of artifacts that can be requested on a WR

**Issue:** #17952  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-25  
**Research Date:** 2026-08-25  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Scope

This WR defines the requirement to expand the list of requestable artifacts in the `00-work-request.yml` issue template. Specifically, we will add three new options to the `Output Type` dropdown:

- `live-http-dashboard`
- `github-action`
- `github-app`

The scope is limited to updating the issue template definition. It does not include modifying downstream workflows (e.g., specific build or deployment pipelines) that might act on these new types, other than ensuring they gracefully handle or ignore unrecognized artifact types.

## Approach

1. **Locate Template:** Open `.github/ISSUE_TEMPLATE/00-work-request.yml`.
2. **Update `Output Type` Dropdown:**
   - Find the `id: output_type` section.
   - Append the three new options (`live-http-dashboard`, `github-action`, `github-app`) to the existing list of options.
3. **Review Other Templates:** Briefly check if other templates or schema files hardcode the previous list of artifact types and update them if necessary to remain consistent.

## Acceptance Criteria

- [ ] Change delivers the described behavior end-to-end
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable
- [ ] No regressions in related workflows

## Risks & Mitigations

**Risk:** Downstream parsers or automated workflows that strictly validate against the old list of `Output Type` values might break when encountering the new values.
**Mitigation:** Verify that any JSON schema validation or workflow logic consuming the issue body does not strictly reject these new types, or update the schemas accordingly.

## Competitor & Pricing Intelligence

N/A — This is an internal technical fix to improve our own issue tracking capabilities.

## Learnings — What & Why

- Expanding the `Output Type` dropdown directly addresses user friction. As the repository handles more varied tasks (like deploying live dashboards via GitHub Pages or managing GitHub Actions/Apps), having explicit categories ensures that automated routing and context-gathering tools can appropriately handle these specific artifact requests.
- Modifying GitHub Issue Templates (`.yml`) is a quick, high-leverage change because it instantly standardizes the inbound data format for future issues, enabling better programmatic parsing by GitHub Actions later in the pipeline.
