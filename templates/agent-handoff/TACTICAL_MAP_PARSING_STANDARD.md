# Tactical Map Data Parsing Standard

## The Problem
When building tactical maps (like the one in GrowlingEyes), data comes from many different sources: GDELT news, AIS ship trackers, ADS-B flight trackers, and manual OSINT reports. 

If every source sends data to the map in its own unique format, the map breaks. The map doesn't know how to read 10 different languages. 

## The Solution: The Universal Event Schema
To fix this, **all data must be translated into one single language** before it touches the map. We call this the "Universal Event Schema."

Think of it like a universal power adapter. You plug your American, European, and Asian cords into the adapter, and the adapter plugs into the wall. The wall only ever sees the adapter.

### The Mandatory Parsing Rules

Whenever an AI agent or a backend script fetches data for a map, it **MUST** parse the raw data into this exact JSON structure before saving it to the database or sending it to the frontend:

```json
{
  "id": "unique_string_id",
  "domain": "maritime | air | cyber | kinetic | supply_chain | ...",
  "title": "Short, clear title of the event",
  "description": "1-2 sentence summary of what happened.",
  "severity": 1, // Number from 1 (low) to 5 (critical)
  "latitude": 34.0522, // MUST be a valid float
  "longitude": -118.2437, // MUST be a valid float
  "timestamp": "2026-04-01T12:00:00Z", // MUST be ISO 8601 format
  "source": "GDELT | AISstream | OSINT | etc",
  "source_url": "https://link-to-original-report.com"
}
```

### Critical Parsing Requirements for Agents

1. **Location Fallbacks:** If a news article mentions "Paris" but doesn't give GPS coordinates, the parsing script MUST use a geocoding service (like Mapbox or a local city dictionary) to convert "Paris" to `[48.8566, 2.3522]`. The map will crash if `latitude` and `longitude` are null or strings.
2. **Severity Normalization:** Different APIs use different threat levels (e.g., "High", "Red", "Level 3"). The parser MUST convert all of these into a standard `1-5` integer scale.
3. **Timestamp Normalization:** All times MUST be converted to UTC and formatted as ISO 8601 strings. No "3 hours ago" or "04/01/2026" strings.
4. **Domain Categorization:** The parser must tag the event with the correct domain string (e.g., `kinetic`, `cyber`) so the map can apply the correct icon and color filter.

### How to Implement in a New App

1. Create a single database table called `unified_events` using the schema above.
2. For every new data source you add (e.g., a new earthquake API), write a specific "Fetcher" script.
3. The Fetcher script's *only* job is to pull the weird raw data and map it to the `unified_events` format.
4. The frontend map *only* reads from the `unified_events` table. It never talks to the APIs directly.
