-- Status: unverified; AI answers are leads, not sources. Collected 2026-11-10.
-- No analysis was run. Sign runs are "sequences", not "words".
--
-- Proposed schema only. Not populated. No DatDas records are stored here.
-- This body matches docs/deep-sweep/schema/datdas.sql (recovered from the
-- 2026-11-10 t9u paste). Not run: do not execute this against Linear A
-- corpus data without a preregistered hypothesis via CorpusBot /
-- Fleet-Orchestrator.
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
