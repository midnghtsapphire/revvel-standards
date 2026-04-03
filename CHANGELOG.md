# Changelog

All notable changes to the Revvel Standards repository will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-04-03
### Added
- `CONCURRENT_DEVELOPMENT_STANDARD.md` establishing mandatory branch protection rules, multi-team coordination workflow, and no-force-push policy across all repos.

### Changed
- `CODE_REVIEW_STANDARD.md` updated with a "No Force Push" policy section and a reference to the new concurrent development standard.

### Context
- This version was prompted by an April 3, 2026 incident in which a force-push to master on the MindMappr repo overwrote commits from two other teams working concurrently.

## [1.1.0] - 2026-04-03
### Added
- `CHANGELOG.md` created to track all future changes.
- `CODE_REVIEW_STANDARD.md` documenting mandatory code review pipeline and CI/CD rules.
- `AUTO_DOCUMENTATION_STANDARD.md` establishing auto-generation rules for docs and changelogs.
- `MASTER_APP_TEMPLATE.md` established as the single source of truth for new applications.

### Changed
- Consolidated `INFRASTRUCTURE_MAP.md` and `INFRASTRUCTURE_COMPLETE.md` into a single `INFRASTRUCTURE_MAP.md` file.

### Removed
- Deleted `INFRASTRUCTURE_COMPLETE.md` after merging content.
- Removed duplicate documentation files from the root directory.

### Moved
- Relocated all `SESSION_NOTES_*.md` and raw research documents from the root directory to the `docs/` directory to maintain a clean root.

## [1.0.0] - 2026-02-25
### Added
- Initial baseline of Revvel standards and specifications.
- `DEFAULT_APP_TEMPLATE.md` established.
- Initial CI/CD templates and scripts created in `templates/cicd/`.
- Corporate entity hierarchy and SEO strategy defined.
