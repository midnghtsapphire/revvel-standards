# GrowlingEyes Trigger Database Schema

## Tables

### `triggers`

Stores individual intelligence triggers extracted from OSINT sources.

```sql
CREATE TABLE triggers (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    coordinates POINT,
    affected_areas TEXT,
    extracted_entities JSONB DEFAULT '[]'::jsonb,
    raw_data JSONB,
    correlation_id INTEGER REFERENCES correlated_triggers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_triggers_score ON triggers(score DESC);
CREATE INDEX idx_triggers_timestamp ON triggers(timestamp DESC);
CREATE INDEX idx_triggers_domain ON triggers(domain);
CREATE INDEX idx_triggers_source ON triggers(source);
CREATE INDEX idx_triggers_correlation ON triggers(correlation_id);
CREATE INDEX idx_triggers_coordinates ON triggers USING GIST(coordinates);
```

**Fields:**
- `id`: Unique identifier
- `domain`: Intelligence domain (cyber_threats, kinetic_events, environmental, etc.)
- `source`: Data source (CISA, NVD, USGS, etc.)
- `title`: Trigger title/description
- `score`: Priority score (0-100, higher = more critical)
- `reason`: Human-readable reason for trigger
- `timestamp`: When the original event occurred
- `coordinates`: Geographic coordinates (latitude, longitude) if applicable
- `affected_areas`: Text description of affected regions
- `extracted_entities`: JSON array of extracted entities (CVEs, IPs, names, etc.)
- `raw_data`: Full source data as JSON
- `correlation_id`: Link to correlated trigger group (if part of multi-source confirmation)
- `created_at`: When trigger was created in database
- `updated_at`: Last update time

### `correlated_triggers`

Stores groups of triggers that are related/confirmed by multiple sources.

```sql
CREATE TABLE correlated_triggers (
    id SERIAL PRIMARY KEY,
    correlation_type VARCHAR(50) NOT NULL,
    correlation_value TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    source_count INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_correlated_type ON correlated_triggers(correlation_type);
CREATE INDEX idx_correlated_score ON correlated_triggers(score DESC);
```

**Fields:**
- `id`: Unique identifier
- `correlation_type`: Type of correlation ('entity', 'geographic', 'temporal')
- `correlation_value`: The correlating value (e.g., CVE-2024-1234, location grid, cluster ID)
- `score`: Aggregate score (boosted by source count)
- `source_count`: Number of sources confirming this trigger
- `reason`: Why these triggers are correlated
- `created_at`: Creation timestamp

## Indexes

Performance indexes for common queries:

1. **Score-based queries**: Find highest priority triggers
2. **Time-based queries**: Recent triggers, historical analysis
3. **Domain filtering**: Filter by intelligence domain
4. **Source filtering**: Filter by data source
5. **Geographic queries**: Find triggers near coordinates
6. **Correlation lookups**: Find all triggers in a correlation group

## Drizzle ORM Schema

```typescript
// schema/triggers.ts

import { pgTable, serial, varchar, text, integer, timestamp, point, jsonb, index } from 'drizzle-orm/pg-core';

export const triggers = pgTable('triggers', {
  id: serial('id').primaryKey(),
  domain: varchar('domain', { length: 50 }).notNull(),
  source: varchar('source', { length: 100 }).notNull(),
  title: text('title').notNull(),
  score: integer('score').notNull(),
  reason: text('reason'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  coordinates: point('coordinates'),
  affectedAreas: text('affected_areas'),
  extractedEntities: jsonb('extracted_entities').$type<string[]>().default([]),
  rawData: jsonb('raw_data').$type<Record<string, any>>(),
  correlationId: integer('correlation_id').references(() => correlatedTriggers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  scoreIdx: index('idx_triggers_score').on(table.score.desc()),
  timestampIdx: index('idx_triggers_timestamp').on(table.timestamp.desc()),
  domainIdx: index('idx_triggers_domain').on(table.domain),
  sourceIdx: index('idx_triggers_source').on(table.source),
  correlationIdx: index('idx_triggers_correlation').on(table.correlationId),
}));

export const correlatedTriggers = pgTable('correlated_triggers', {
  id: serial('id').primaryKey(),
  correlationType: varchar('correlation_type', { length: 50 }).notNull(),
  correlationValue: text('correlation_value').notNull(),
  score: integer('score').notNull(),
  sourceCount: integer('source_count').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  typeIdx: index('idx_correlated_type').on(table.correlationType),
  scoreIdx: index('idx_correlated_score').on(table.score.desc()),
}));
```

## Example Queries

### Get Critical Triggers from Last 24 Hours

```sql
SELECT 
    id,
    domain,
    source,
    title,
    score,
    reason,
    timestamp
FROM triggers
WHERE 
    score >= 90
    AND timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY score DESC, timestamp DESC
LIMIT 50;
```

### Get Correlated Triggers

```sql
SELECT 
    ct.correlation_type,
    ct.correlation_value,
    ct.source_count,
    ct.score AS correlated_score,
    json_agg(
        json_build_object(
            'source', t.source,
            'title', t.title,
            'score', t.score,
            'timestamp', t.timestamp
        )
    ) AS triggers
FROM correlated_triggers ct
JOIN triggers t ON t.correlation_id = ct.id
WHERE ct.score >= 70
GROUP BY ct.id, ct.correlation_type, ct.correlation_value, ct.source_count, ct.score
ORDER BY ct.score DESC;
```

### Geographic Proximity Query

```sql
-- Find triggers within 100km of San Francisco (37.7749, -122.4194)
SELECT 
    id,
    domain,
    source,
    title,
    score,
    ST_Distance(
        coordinates::geography,
        ST_MakePoint(-122.4194, 37.7749)::geography
    ) / 1000 AS distance_km
FROM triggers
WHERE 
    coordinates IS NOT NULL
    AND ST_DWithin(
        coordinates::geography,
        ST_MakePoint(-122.4194, 37.7749)::geography,
        100000  -- 100km in meters
    )
ORDER BY distance_km ASC, score DESC;
```

### Domain Statistics

```sql
SELECT 
    domain,
    COUNT(*) AS trigger_count,
    AVG(score) AS avg_score,
    MAX(score) AS max_score,
    COUNT(CASE WHEN score >= 90 THEN 1 END) AS critical_count,
    COUNT(CASE WHEN score >= 70 THEN 1 END) AS high_count
FROM triggers
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY domain
ORDER BY critical_count DESC, trigger_count DESC;
```

## Migration Script

```sql
-- migration_001_add_triggers.sql

BEGIN;

-- Create correlated_triggers first (referenced by triggers)
CREATE TABLE IF NOT EXISTS correlated_triggers (
    id SERIAL PRIMARY KEY,
    correlation_type VARCHAR(50) NOT NULL,
    correlation_value TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    source_count INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_correlated_type ON correlated_triggers(correlation_type);
CREATE INDEX IF NOT EXISTS idx_correlated_score ON correlated_triggers(score DESC);

-- Create triggers table
CREATE TABLE IF NOT EXISTS triggers (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    coordinates POINT,
    affected_areas TEXT,
    extracted_entities JSONB DEFAULT '[]'::jsonb,
    raw_data JSONB,
    correlation_id INTEGER REFERENCES correlated_triggers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triggers_score ON triggers(score DESC);
CREATE INDEX IF NOT EXISTS idx_triggers_timestamp ON triggers(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_triggers_domain ON triggers(domain);
CREATE INDEX IF NOT EXISTS idx_triggers_source ON triggers(source);
CREATE INDEX IF NOT EXISTS idx_triggers_correlation ON triggers(correlation_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_triggers_updated_at BEFORE UPDATE ON triggers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

## Usage from Python

```python
from growlingeyes.tools.trigger_extractor import TriggerExtractor
import psycopg2

# Extract triggers
extractor = TriggerExtractor()
results = extractor.extract_all_triggers()

# Store in database
conn = psycopg2.connect(...)
cur = conn.cursor()

for trigger in results['raw_triggers']:
    cur.execute("""
        INSERT INTO triggers (
            domain, source, title, score, reason, timestamp,
            coordinates, affected_areas, extracted_entities, raw_data
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        trigger.domain,
        trigger.source,
        trigger.title,
        trigger.score,
        trigger.reason,
        trigger.timestamp,
        f"({trigger.coordinates[0]},{trigger.coordinates[1]})" if trigger.coordinates else None,
        trigger.affected_areas,
        json.dumps(trigger.extracted_entities),
        json.dumps(trigger.raw_data)
    ))

conn.commit()
```

## API Endpoints (Recommended)

```typescript
// tRPC router for triggers

export const triggersRouter = router({
  // Get recent triggers
  getRecent: publicProcedure
    .input(z.object({
      limit: z.number().default(50),
      minScore: z.number().default(40),
      domains: z.array(z.string()).optional(),
    }))
    .query(async ({ input, ctx }) => {
      return await ctx.db
        .select()
        .from(triggers)
        .where(
          and(
            gte(triggers.score, input.minScore),
            input.domains ? inArray(triggers.domain, input.domains) : undefined
          )
        )
        .orderBy(desc(triggers.score), desc(triggers.timestamp))
        .limit(input.limit);
    }),
  
  // Get correlated triggers
  getCorrelated: publicProcedure
    .query(async ({ ctx }) => {
      return await ctx.db
        .select()
        .from(correlatedTriggers)
        .orderBy(desc(correlatedTriggers.score))
        .limit(20);
    }),
  
  // Get triggers near location
  getNearLocation: publicProcedure
    .input(z.object({
      lat: z.number(),
      lng: z.number(),
      radiusKm: z.number().default(100),
    }))
    .query(async ({ input, ctx }) => {
      // SQL query with geographic functions
      const query = sql`
        SELECT * FROM triggers
        WHERE coordinates IS NOT NULL
        AND ST_DWithin(
          coordinates::geography,
          ST_MakePoint(${input.lng}, ${input.lat})::geography,
          ${input.radiusKm * 1000}
        )
        ORDER BY score DESC
        LIMIT 50
      `;
      
      return await ctx.db.execute(query);
    }),
});
```
