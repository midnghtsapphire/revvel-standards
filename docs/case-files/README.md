# Case files (as received)

Every file uploaded during the Blue Ocean SAR sessions, stored as received.

- One folder per case (shaffer, shtuka, lindeman, farber, aranda, fraysure).
  `code/`, `images/` and `general/` hold files whose names don't identify a
  case.
- `MANIFEST.csv` lists every upload with its SHA-256, size, where it is
  stored, and whether it was stored, skipped as a byte-identical duplicate
  (with the path of the copy that was kept), or left out as patent material.
- Patent specifications, claims and USPTO forms are not stored here, by
  request.
- Ten files that profile private individuals are not in this public copy:
  the four `expanded_osint_spatial_master_package*.zip` uploads,
  `gis_parcel_adjacency.csv`, both `relational_graph_degrees*.csv`, the
  two `ryverly_lindeman_integration` JSONs, and
  `lindeman/surname_trajectories.csv`. They are still listed in
  `MANIFEST.csv` and kept in the private archive.
- `lindeman/lindeman_master_studio_artifacts_package.zip` is published at
  the owner's request. It contains deed records naming co-owners of record
  and copies of the Ryverly Lindeman integration files.
- The four published rescue manuals in `general/reference/` are held out the
  same way (status `held_out_of_public_copy`): they are other authors'
  documents. Files that name a street address are included; the owner said
  addresses are fine to publish.
- `platform/`, `deep-research/` and `agent-interface/` hold build specs and
  standards uploaded as received.
- `.py` and `.md` files here are excluded from flake8 and markdownlint so
  they stay byte-identical to the upload.
- Nothing has been edited. Analysis and corrected scripts live in
  revvel-standards PR #18128 (`docs/blue-ocean-sar/`, `docs/hfmr/`).
