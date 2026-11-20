-- schema.sql : connector matrix database (WR: Audrey 2026-11-19, "I want that database driven").
-- Decipherer, PR #18475. SQLite dialect (GLOB and PRAGMA are SQLite-only). Types, keys and
-- CHECKs are standard SQL, so a PostgreSQL port swaps GLOB for ~ and drops PRAGMA. Tested on SQLite only.
-- The text files in this folder ARE the database: schema.sql + seed.sql.
-- scripts/connectors-db.js loads them into an in-memory SQLite and renders every
-- connector table in the repo from it. Never hand-edit a generated table.
-- Never delete a row: retire it with stale = 1 and a stale_note (AGENTS.md OWNER RULE #4).

PRAGMA foreign_keys = ON;

CREATE TABLE connector (
  id             TEXT PRIMARY KEY CHECK (id GLOB '[a-z0-9]*' AND id NOT GLOB '*[^a-z0-9-]*'),
  app            TEXT NOT NULL CHECK (length(trim(app)) > 0),
  -- id of the closest wiring entry in config/connections.yml (checked by the tests)
  registry_id    TEXT,
  plan_tier      TEXT NOT NULL,
  -- who says so: audrey-confirmed = her own word; doc-verified = vendor docs or a
  -- read-only API call; unverified = nobody has confirmed it
  tier_source    TEXT NOT NULL CHECK (tier_source IN ('audrey-confirmed', 'doc-verified', 'unverified')),
  tier_note      TEXT,
  status         TEXT NOT NULL CHECK (status IN ('connected-working', 'connected', 'available', 'unverified')),
  status_note    TEXT,
  -- targets that do not fit the connector_link table (for example "Everything above")
  connects_note  TEXT,
  free_workaround TEXT NOT NULL,
  -- date the fact was checked, YYYY-MM-DD. NULL means no check date was recorded.
  verified_on    TEXT CHECK (verified_on IS NULL OR (length(verified_on) = 10 AND verified_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')),
  added_on       TEXT NOT NULL CHECK (length(added_on) = 10 AND added_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  stale          INTEGER NOT NULL DEFAULT 0 CHECK (stale IN (0, 1)),
  stale_note     TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 100,
  CHECK (stale = 0 OR (stale_note IS NOT NULL AND length(trim(stale_note)) > 0))
);

-- Something a connector connects to. connector_id is set when the target is itself a row above.
CREATE TABLE target (
  id           TEXT PRIMARY KEY CHECK (id GLOB '[a-z0-9]*' AND id NOT GLOB '*[^a-z0-9-]*'),
  name         TEXT NOT NULL CHECK (length(trim(name)) > 0),
  connector_id TEXT REFERENCES connector (id)
);

-- Many-to-many: connector <-> target. note carries the qualifier ("GitHub App", "Business only").
CREATE TABLE connector_link (
  connector_id TEXT NOT NULL REFERENCES connector (id),
  target_id    TEXT NOT NULL REFERENCES target (id),
  note         TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 100,
  PRIMARY KEY (connector_id, target_id)
);

-- One or more sources per connector. url is NULL when the source is a person's word.
CREATE TABLE connector_source (
  connector_id TEXT NOT NULL REFERENCES connector (id),
  label        TEXT NOT NULL,
  url          TEXT CHECK (url IS NULL OR url GLOB 'https://*'),
  sort_order   INTEGER NOT NULL DEFAULT 100,
  PRIMARY KEY (connector_id, label)
);

-- A line elsewhere in the repo that no longer matches. The line stays where it is; the
-- current fact lives here. A connector with stale = 1 must have at least one row here.
CREATE TABLE stale_row (
  id           INTEGER PRIMARY KEY,
  connector_id TEXT REFERENCES connector (id),
  location     TEXT NOT NULL,
  says         TEXT NOT NULL,
  current_fact TEXT NOT NULL,
  source_label TEXT NOT NULL,
  source_url   TEXT CHECK (source_url IS NULL OR source_url GLOB 'https://*'),
  noted_on     TEXT NOT NULL CHECK (length(noted_on) = 10)
);

CREATE TABLE open_question (
  id           INTEGER PRIMARY KEY,
  connector_id TEXT REFERENCES connector (id),
  question     TEXT NOT NULL,
  asked_on     TEXT NOT NULL CHECK (length(asked_on) = 10),
  answered     INTEGER NOT NULL DEFAULT 0 CHECK (answered IN (0, 1)),
  answer       TEXT,
  CHECK (answered = 0 OR (answer IS NOT NULL AND length(trim(answer)) > 0))
);
