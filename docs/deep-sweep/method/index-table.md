<!--
Status: unverified AI-chat output, collected 2026-11-10. Not run. AI answers are leads, not sources.
-->

# Index-table method

From the 2026-11-10 chat pastes. Not run. AI answers are leads, not sources.

The chats proposed a systematic "deep sweep and index" of archive and open-web captures, with one row per resource. Suggested minimum columns:

| Column | Role |
| --- | --- |
| URL | Exact URL of the resource |
| Title | Title of the page or document |
| Source Link | Direct link to the capture (Wayback, Common Crawl, or live) |
| Date Accessed | Timestamp of retrieval |
| Description | Short summary of content |
| Notes | Technical issues, unusual formatting, copyright concerns |
| Status | e.g. Found, Duplicate, Broken Link, Copyrighted, Archived, Pending |

The DeepSeek 0423 paste later widened this into the SQLite layout in [`../schema/index_schema.sql`](../schema/index_schema.sql), adding `script_system`, `sign_categories`, `geographical_origin`, `date_range`, and `hash_digest`, plus `sign_index` and `cross_references` tables.

Deduping was to use a content hash (`hash_digest` / `content_hash`). Status values in the later schema are a closed check list; they have not been applied to any live index in this repository.

A working research index already exists in `midnghtsapphire/linear-a` (`docs/proposals/deep-index-2026-11-10.csv`). This pack archives the chat method; it does not replace that index and has not been run against any corpus.
