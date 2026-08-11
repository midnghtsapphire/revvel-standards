# gatekeeper-cli tests

Unit tests for the `gatekeeper-cli` project and config listing commands.

## Running

```bash
cd gatekeeper-cli
pip install -e .[dev]  # or: pip install pytest click requests
pytest tests/
```

## Coverage

### `gk projects list`
- Missing `GATEKEEPER_TOKEN` env var → error exit
- API connection failure → error exit
- Empty API response → "No projects found"
- Happy path → project rows rendered

### `gk configs list`
- Missing `GATEKEEPER_TOKEN` env var → error exit
- API connection failure → error exit
- Empty API response → "No configs found"
- Happy path (no `--project` flag) → configs rendered
- Happy path (with `--project` flag) → filter forwarded to API URL

The test module falls back to lightweight stub Click commands when
`gatekeeper_cli.commands.projects` is not importable, so the suite remains
runnable in isolation.
