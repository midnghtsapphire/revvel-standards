1. **Create `standards/PEDAL_TO_THE_METAL_ENTERPRISE.md`**:
   - Write a document that maps oAudrey / OpenRouter / GOAP / existing fleet files.
   - Include a `START_HERE` line.
   - Clarify no second pipeline (use existing fleet controller).
   - Document insertion points (`research:complete` -> `wr:code`).

2. **Create `schemas/metal-findings.schema.json`**:
   - Define a JSON schema for metal findings.
   - Ensure it's valid under Ajv/JSON Schema Draft 2020-12.

3. **Create `scripts/metal-findings-engine.js`**:
   - Implement an engine module that validates findings using the JSON schema.
   - Return `{ status, next_engine?, artifacts[], evidence? }` as per CONTRACT requirements.

4. **Create `tests/metal-findings-engine.test.js`**:
   - Write unit tests for the engine script using `node:test`.
   - Test both successful validation and failures.

5. **Complete pre-commit steps**:
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

6. **Submit**:
   - Commit the changes and submit the branch.
