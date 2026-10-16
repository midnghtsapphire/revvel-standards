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
- Nine files that profile private individuals are not in this public copy:
  the four `expanded_osint_spatial_master_package*.zip` uploads,
  `gis_parcel_adjacency.csv`, both `relational_graph_degrees*.csv`, and the
  two `ryverly_lindeman_integration` JSONs. They are still listed in
  `MANIFEST.csv` and kept in the private archive.
- `.py` and `.md` files here are excluded from flake8 and markdownlint so
  they stay byte-identical to the upload.
- Nothing has been edited. Analysis and corrected scripts live in
  revvel-standards PR #18128 (`docs/blue-ocean-sar/`, `docs/hfmr/`).
