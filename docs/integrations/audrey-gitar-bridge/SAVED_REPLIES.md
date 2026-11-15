# GitHub saved replies

Use these after the owner-reviewed integration and authorized connection/activation checks. Inserting a saved reply fills a comment; submitting a new comment creates the router event. Do not paste the surrounding Markdown fences, additional code, or explanatory text into the comment body.

## Start approved work

Suggested saved-reply title: `Audrey — run Gitar work`

```text
/audrey run
```

On an issue this requests the existing governed WR-document/draft-PR workflow, not immediate finished product code. Gitar implementation work runs on the approved PR. On an open PR it posts the trusted repository Gitar task, subject to current-write permission and existing work switches.

## Re-process a missed Gitar completion

Suggested saved-reply title: `Audrey — finish Gitar summary`

```text
/audrey finish 123456789
```

Replace the numeric ID with the actual Gitar conversation comment on that PR. It must contain current-head `AUDREY_DONE` and summary markers. This command prepares/requeues a verified draft; it does not mark unfinished work complete or approve Facebook publication.

## Public summary approval

Review the exact signed message, numeric audreybuildsai Page ID, source/head and digest in **Actions → Audrey Facebook publication**. Approve the configured protected `facebook-publication` job only for that exact payload. No comment-based public-approval shortcut is supplied, and no token belongs in a saved reply.

Only these exact case-sensitive commands are handled by the local adapter; arbitrary trailing instructions do not execute. The existing `audrey` alias has one owner (`gitar-bridge`), so other agent/gateway routes are not duplicated.
