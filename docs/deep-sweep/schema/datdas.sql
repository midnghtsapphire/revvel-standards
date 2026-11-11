-- Status: unverified AI-chat output, collected 2026-11-10. Not run. AI answers are leads, not sources.
-- Not run: this schema has not been executed or tested. Do not run analysis
-- against Linear A corpus data without a preregistered hypothesis via
-- CorpusBot / Fleet-Orchestrator. Sign runs between dividers are "sequences",
-- not "words".
--

-- datdas.sql
CREATE TABLE datdas_objects (
  object_id   TEXT PRIMARY KEY,
  site        TEXT, museum TEXT, discovery TEXT,
  dating      TEXT, material TEXT, object_type TEXT, notes TEXT
);
CREATE TABLE datdas_inscriptions (
  inscription_id TEXT PRIMARY KEY,
  object_id   TEXT REFERENCES datdas_objects(object_id),
  position    TEXT,          -- where on the object
  sign_count  INTEGER
);
CREATE TABLE datdas_signs (
  id             INTEGER PRIMARY KEY,
  inscription_id TEXT REFERENCES datdas_inscriptions(inscription_id),
  seq            INTEGER,    -- position within the inscription
  sign           TEXT,       -- normalized sign ID
  variant        TEXT, orientation TEXT
);
