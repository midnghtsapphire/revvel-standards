# Session: github-script injection conversion (#17801)

Converted all 55 unsafe github-script bodies across 28 workflows to env:/process.env.
Drained AWAITING_CONVERSION ratchet; deleted ratchet tests; kept negative guards +
ship-to-market positive shape + sample positive shape for heaviest files.

Fixed openhands-resolver single-quoted string bug (markdown backticks fooled classifier).
Also moved vars.CONTENT_AUTO_PUBLISH through env in content-automation.
