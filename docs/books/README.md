# Books — KDP reference

Canonical: revvel-standards; mirrored in amazon-books.

This folder holds the **canonical** KDP upload reference and points to the one-book work request issue template. Edit these files here in `midnghtsapphire/revvel-standards`. The same files are mirrored in `midnghtsapphire/amazon-books` (`docs/KDP-REFERENCE.md` and `.github/ISSUE_TEMPLATE/kdp-book-wr.yml`).

- Reference: [`KDP-REFERENCE.md`](./KDP-REFERENCE.md)
- Issue template: [`.github/ISSUE_TEMPLATE/kdp-book-wr.yml`](../../.github/ISSUE_TEMPLATE/kdp-book-wr.yml) (title: `WR: KDP book — <title>`)

Do not delete the older files listed below. They stay in place as history and tooling. Use this folder and the `kdp-book-wr.yml` issue form for new book work.

## Older or related copies (left in place; superseded as the upload/WR reference)

### In revvel-standards

General work-request issue forms (still used for non-book work; not the KDP book WR):

- `.github/ISSUE_TEMPLATE/00-work-request.yml`
- `.github/ISSUE_TEMPLATE/work_request.yml`
- `.github/ISSUE_TEMPLATE/10-openhands-system-wr.yml`
- `templates/issue-template/00-work-request.yml`
- `templates/issue-template/10-openhands-system-wr.yml`
- `templates/issue-template-archive/work-request.yml`

Project hub stubs (not the checklist):

- `projects/amazon-books/project.json`
- `projects/amazon-books/docs/index.html`
- `projects/kdp-agent-fleet/project.json`
- `projects/kdp-agent-fleet/docs/index.html`
- `projects/kdp-packager/project.json`
- `projects/kdp-packager/docs/index.html`

BookCrew role docs (process in prose, not the fill-in template):

- `docs/teams/bookcrew-team/README.md`
- `docs/bots/bot-bookcrew-covercrafter/README.md`
- `docs/bots/bot-bookcrew-evaluator/README.md`
- `docs/bots/bot-bookcrew-publisher/README.md`
- `docs/bots/bot-bookcrew-reviewer/README.md`
- `docs/bots/bot-proofy/README.md`

### In amazon-books

- `examples/demo_kdp_package/kdp_answers.json` — sample pre-filled KDP wizard answers
- `packaging/kdp_packager.py` and `packaging/README.md` — packager that writes `kdp_answers.json`
- `prompts/prompt-covers-amazon.md` — earlier cover-prompt package
- `prompts/prompt-copy-package.md` — earlier cover and listing copy package
- `web/README.md` and `web/` — browser KDP Packaging Studio
- `README.md` — pipeline notes (tooling still applies; the upload-field reference now lives in the canonical doc)

The amazon-books mirror of this reference (not superseded): `docs/KDP-REFERENCE.md` and `.github/ISSUE_TEMPLATE/kdp-book-wr.yml`.
