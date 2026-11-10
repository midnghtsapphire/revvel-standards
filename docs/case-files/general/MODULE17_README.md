# Module 17 — Bulk Evidence Intake & Deduplication

Adds a tested offline intake stage for real documents, imagery and sensor files. It records SHA-256 hashes, duplicate bytes, size, MIME guesses, text findings and extraction errors. Existing Modules 1–16 remain included.

```bash
python -m unittest discover -s hfmr -t . -p 'test_*.py' -q
python -m hfmr.intake17 --source /path/to/downloaded_records --output case001_intake.json
```

The source directory must not contain the output file. Supported file types include PDF, text, CSV, JSON, JPEG, TIFF, LAS/LAZ, ZIP, KML, and GeoJSON. Scanned PDFs and images are indexed by hash only, not OCR'd. Duplicates are detected by bytes, not similarity. Findings are *unverified text mentions*, not established construction facts. This release is offline; it does not claim that Columbus archives have been downloaded.

## Priority for Module 18
Integrate OCR and layout extraction with page-level bounding boxes, compare results to original scans, then attach document URLs and source provenance. Real-world permit acquisition remains the principal external dependency.
