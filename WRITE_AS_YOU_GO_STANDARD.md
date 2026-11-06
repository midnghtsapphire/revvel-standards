# Write-As-You-Go Standard

**Rule:** Every agent records its work in the same commit as the work itself.

1. A new finding, figure, or date goes into the project's ledger (for Tărtăria: `tartaria-dating-current.md`) with its source and grade, in the same commit.
2. Every commit that changes files adds a line to the repo's `CHANGELOG.md`: date, agent name, and what changed.
3. New sources go in `Library/` and are listed in `Library/README.md`.
4. Work is committed to the project's GitHub repo only, never to local drives, OneDrive, or scratch folders.
5. Superseded values are moved to the ledger's "Superseded — do not use" list, never silently deleted.
