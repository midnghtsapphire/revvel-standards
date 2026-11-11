-- Status: unverified AI-chat output, collected 2026-11-10. Not run. AI answers are leads, not sources.
-- Not run: this schema has not been executed or tested. Do not run analysis
-- against Linear A corpus data without a preregistered hypothesis via
-- CorpusBot / Fleet-Orchestrator. Sign runs between dividers are "sequences",
-- not "words".
--

-- schema.sql
CREATE TABLE IF NOT EXISTS resources (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  url           TEXT NOT NULL,
  title         TEXT,
  source_link   TEXT,
  date_accessed TEXT NOT NULL DEFAULT (datetime('now')),
  description   TEXT,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'found'
                CHECK (status IN ('found','duplicate','broken','copyrighted','acquired','analyzed','archived')),
  script        TEXT,                    -- linear_a | cretan_hieroglyph | danube | other
  tags          TEXT,                    -- JSON array
  content_hash  TEXT,
  UNIQUE (url, content_hash)
);
CREATE INDEX idx_res_script ON resources(script);
CREATE INDEX idx_res_status ON resources(status);
