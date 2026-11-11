-- Status: unverified AI-chat output, collected 2026-11-10. Not run. AI answers are leads, not sources.
-- Not run: this schema has not been executed or tested. Do not run analysis
-- against Linear A corpus data without a preregistered hypothesis via
-- CorpusBot / Fleet-Orchestrator. Sign runs between dividers are "sequences",
-- not "words".
--

-- data/index_schema.sql
-- From the DeepSeek V4 Pro 0423 paste, 2026-11-10.

CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    title TEXT,
    source_link TEXT,          -- Wayback / Common Crawl / direct
    date_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    notes TEXT,
    status TEXT CHECK(status IN ('Found', 'Duplicate', 'Broken Link', 'Copyrighted', 'Archived', 'Pending')),
    script_system TEXT,        -- 'Danube', 'Linear A', 'Cretan Hieroglyphic'
    sign_categories TEXT,      -- Comma-separated DS numbers or sign IDs
    geographical_origin TEXT,
    date_range TEXT,           -- Archaeological date range
    hash_digest TEXT UNIQUE    -- Deduplication by content hash
);
CREATE TABLE IF NOT EXISTS sign_index (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sign_id TEXT NOT NULL,     -- e.g., 'DS 1', 'LA-AB-01'
    script_system TEXT NOT NULL,
    category TEXT,
    description TEXT,
    visual_shape TEXT,         -- 'V-based', 'X-based', 'angular', 'curvilinear'
    frequency INTEGER DEFAULT 0,
    resource_refs TEXT         -- JSON array of resource IDs where this sign appears
);
CREATE TABLE IF NOT EXISTS cross_references (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sign_a_id TEXT NOT NULL,
    script_a TEXT NOT NULL,
    sign_b_id TEXT NOT NULL,
    script_b TEXT NOT NULL,
    similarity_score INTEGER CHECK(similarity_score BETWEEN 1 AND 5),
    notes TEXT,
    UNIQUE(sign_a_id, sign_b_id)
);
CREATE INDEX idx_resources_script ON resources(script_system);
CREATE INDEX idx_signs_script ON sign_index(script_system);
CREATE INDEX idx_crossref_scripts ON cross_references(script_a, script_b);
