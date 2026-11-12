#!/usr/bin/env bash
# WR #18336 graph prompting gate.
#
# Same two commands a person runs from the repository root. Stdlib Python
# only: no model, no extra package. A mismatch in the committed graph or the
# token numbers fails the job. The accuracy harness check only confirms the
# pending-spend record; it does not call a model.
set -euo pipefail

cd "$(dirname "$0")/../.."
npm run graph-prompting:test
npm run graph-prompting:check
