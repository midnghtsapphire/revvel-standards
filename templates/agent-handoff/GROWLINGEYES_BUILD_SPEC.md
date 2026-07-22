# MANUS_INSTRUCTIONS.md
## GrowlingEyes — The Watcher
## Complete Build Handoff: 18-Domain Threat Intelligence Platform

**Owner:** Audrey Walter-Evans / MIDNGHTSAPPHIRE
**Date:** April 1, 2026
**Priority:** SHIP IT. No questions. No proposals. Working code.

---

## 0. READ THIS FIRST

You are extending an existing live production application. DO NOT rebuild from scratch. DO NOT break what's working. Extend it.

**Prime Directive:** Ship working software. Not plans. Not proposals. Not questions. Working code, tested, deployed.

**XP Rules Apply:**
- Continuous integration — push working code frequently
- Small releases — one domain at a time, each fully wired end-to-end
- Automated tests ship with code
- Continuous refactoring — improve as you go
- If you get stuck, break the problem into pieces and solve them. Do NOT come back with "this is too complex."

---

## 1. EXISTING STACK (DO NOT CHANGE ARCHITECTURE)

### What's Live Right Now

| Component | Technology | Location |
|---|---|---|
| **Droplet** | DigitalOcean | 164.90.148.7 |
| **Frontend** | React + Vite + TypeScript | Built to `dist/public/`, served by Express |
| **Backend** | Node.js + Express + tRPC | Entry: `server/_core/index.ts` → `dist/index.js` |
| **API Layer** | tRPC | Routers in `server/routers/` |
| **Database** | MySQL 8 (DO Managed) | Schema via Drizzle ORM, migrate with `pnpm db:push` |
| **Auth** | Google OAuth (Passport.js) | Keys in `.env` |
| **Payments** | Stripe | Keys in `.env` |
| **Process Manager** | PM2 | Process name: `growlingeyes`, port 3003 |
| **Web Server** | Nginx | Reverse proxy: growlingeyes.com:443 → localhost:3003 |
| **SSL** | Let's Encrypt (Certbot) | Auto-renews |
| **UI** | Radix UI + TailwindCSS + shadcn | Component library already set up |
| **Existing Fetchers** | Custom Node.js | Cyber, kinetic, maritime/air, supply chain, bio/chem, drones, counter-intel, identity entities |

### Deploy Process (Manual)

```bash
# Build locally
pnpm build

# Upload to droplet
rsync -avz dist/ root@164.90.148.7:/var/www/growlingeyes/dist/

# Restart
ssh root@164.90.148.7 "pm2 restart growlingeyes --update-env"
```

### What You're Extending

The app already has OSINT fetchers. You are adding NEW data sources to those fetchers and creating NEW fetchers for domains that don't exist yet. All new fetchers follow the same pattern as existing ones — Node.js/TypeScript, integrated via tRPC routers, data stored in MySQL via Drizzle.

---

## 2. YOUR MISSION

### Add all 18 domains with 95 data sources to the live platform

Every domain needs:
1. **Fetcher** — Node.js/TypeScript module that polls the API source(s)
2. **tRPC Router** — Endpoint serving the data to the frontend
3. **Drizzle Schema** — MySQL table(s) for storing events
4. **Frontend Card/Section** — UI component displaying the data
5. **Consumer Impact** — Every event must explain what regular people will feel

### Unified Event Schema (for MySQL via Drizzle)

```typescript
// Add to your Drizzle schema file
export const events = mysqlTable('events', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID
  timestamp: datetime('timestamp').notNull(),
  ingestedAt: datetime('ingested_at').notNull().default(sql`NOW()`),
  domain: varchar('domain', { length: 50 }).notNull(),
  subDomain: varchar('sub_domain', { length: 50 }),
  severity: int('severity').default(3), // 1-5
  title: varchar('title', { length: 255 }).notNull(),
  summary: text('summary'),
  
  // Location
  latitude: decimal('latitude', { precision: 10, scale: 6 }),
  longitude: decimal('longitude', { precision: 10, scale: 6 }),
  country: varchar('country', { length: 10 }),
  region: varchar('region', { length: 100 }),
  
  // Cross-domain
  impactTags: json('impact_tags'), // string[]
  supplyChainImpact: text('supply_chain_impact'),
  consumerImpact: text('consumer_impact'),
  
  // Source tracking
  sourceName: varchar('source_name', { length: 100 }).notNull(),
  sourceUrl: varchar('source_url', { length: 500 }),
  sourceReliability: int('source_reliability').default(3),
  sourceHash: varchar('source_hash', { length: 32 }).unique(), // dedup
});

// Add indexes
// CREATE INDEX idx_domain ON events(domain);
// CREATE INDEX idx_timestamp ON events(timestamp DESC);
// CREATE INDEX idx_severity ON events(severity DESC);
```

---

## 3. ALL 95 DATA SOURCES — ORGANIZED BY PRIORITY

### TIER 1: Add First (Free, No Key, Highest Value)

These require ZERO authentication. Just fetch and parse.

#### 1. GDELT Project (covers ALL 18 domains)
```text
URL: https://api.gdeltproject.org/api/v2/doc/doc
Method: GET
Params: query, mode=ArtList, maxrecords=10, format=json, timespan=24h, sort=DateDesc
Rate limit: Be respectful, 1-2 sec between calls
Auth: NONE

USE THIS FOR EVERY DOMAIN. Just change the query string:
```

**GDELT Queries by Domain:**

```typescript
const GDELT_QUERIES = {
  // Domain 6: Maritime & Shipping
  maritime_chokepoint: '"Suez Canal" OR "Panama Canal" OR "Strait of Hormuz" OR "Red Sea shipping"',
  maritime_freight: '"freight rate" OR "container rate" OR "SCFI" OR "shipping cost"',
  maritime_piracy: '"Houthi" AND ("ship" OR "vessel" OR "tanker" OR "attack")',
  maritime_congestion: '"port congestion" OR "vessel queue" OR "berthing delay"',
  maritime_sanctions: '"sanctions" AND ("shipping" OR "tanker" OR "dark fleet")',
  maritime_labor: '"port strike" OR "dock workers" OR "longshoreman"',
  
  // Domain 7: Rail & Freight
  rail_derailment: '"train derailment" OR "rail accident" OR "freight derailment"',
  rail_labor: '"rail strike" OR "railroad union" OR "rail workers"',
  rail_hazmat: '"coal train" OR "crude by rail" OR "hazmat rail"',
  
  // Domain 8: Undersea Cables
  cable_cut: '"undersea cable" OR "submarine cable" AND ("cut" OR "severed" OR "damaged")',
  cable_outage: '"internet outage" OR "connectivity disruption" OR "BGP hijack"',
  cable_sabotage: '"Nord Stream" OR "Baltic cable" OR "Red Sea cable"',
  cable_submarine: '"submarine" AND ("cable" OR "infrastructure" OR "Baltic" OR "NATO")',
  
  // Domain 9: Space & Satellites
  space_asat: '"anti-satellite" OR "ASAT test" OR "space weapon"',
  space_debris: '"satellite collision" OR "space debris" OR "Kessler syndrome"',
  space_gps: '"GPS disruption" OR "GPS jamming" OR "GPS spoofing"',
  space_starlink: '"Starlink" AND ("attack" OR "jam" OR "disable")',
  
  // Domain 10: Weapons & Defense
  weapons_missile: '"hypersonic missile" OR "ballistic missile test" OR "cruise missile"',
  weapons_autonomous: '"drone swarm" OR "autonomous weapon" OR "lethal autonomous"',
  weapons_nuclear: '"nuclear test" OR "nuclear weapon" OR "warhead"',
  weapons_energy: '"directed energy weapon" OR "laser weapon" OR "EMP weapon"',
  weapons_arms: '"arms deal" OR "weapons sale" AND "billion"',
  weapons_chem: '"chemical weapon" OR "nerve agent" OR "biological weapon"',
  weapons_drone: '"FPV drone" OR "kamikaze drone" AND ("combat" OR "strike")',
  
  // Domain 11: Pipeline & Energy
  pipeline_incident: '"pipeline explosion" OR "pipeline leak" OR "pipeline sabotage"',
  pipeline_grid: '"power grid" AND ("attack" OR "failure" OR "blackout")',
  pipeline_facility: '"LNG terminal" OR "refinery fire" OR "refinery explosion"',
  pipeline_critical: '"Colonial Pipeline" OR "Nord Stream" OR "pipeline ransomware"',
  
  // Domain 12: Food Supply
  food_crisis: '"food shortage" OR "food crisis" OR "famine"',
  food_disease: '"avian flu" OR "bird flu" OR "H5N1" AND ("poultry" OR "outbreak")',
  food_crop: '"crop failure" OR "drought" AND ("corn" OR "wheat" OR "rice")',
  food_trade: '"grain export" OR "wheat export" OR "food export ban"',
  food_input: '"fertilizer shortage" OR "fertilizer price"',
  food_safety: '"food recall" OR "contamination" AND ("listeria" OR "salmonella")',
  
  // Domain 13: Water & Contamination
  water_contamination: '"water contamination" OR "boil water advisory" OR "drinking water unsafe"',
  water_dam: '"dam failure" OR "dam collapse" OR "dam breach"',
  water_pfas: '"PFAS" OR "forever chemicals" OR "PFOS"',
  water_drought: '"drought emergency" OR "water shortage" OR "water crisis"',
  water_spill: '"toxic spill" OR "chemical spill" AND ("water" OR "river")',
  water_flood: '"flood warning" OR "flash flood" AND ("evacuate" OR "emergency")',
  
  // Domain 14: Spectrum/RF Warfare
  rf_gps_jam: '"GPS jamming" OR "GPS spoofing" OR "GNSS interference"',
  rf_ew: '"electronic warfare" OR "EW system" OR "signal jamming"',
  rf_aviation: '"GPS" AND ("aircraft" OR "aviation") AND ("disrupted" OR "interference")',
  rf_maritime: '"GPS" AND ("ship" OR "vessel") AND ("spoofed" OR "wrong position")',
  
  // Domain 15: Migration & Refugees
  migration_crisis: '"refugee crisis" OR "mass displacement" OR "forced migration"',
  migration_border: '"border crisis" OR "border crossing" OR "migrant caravan"',
  migration_trafficking: '"human trafficking" OR "migrant smuggling"',
  
  // Domain 16: Rare Earth & Critical Minerals
  minerals_disruption: '"rare earth" AND ("export ban" OR "restriction" OR "shortage")',
  minerals_critical: '"critical minerals" AND ("supply chain" OR "shortage" OR "ban")',
  minerals_china: '"China" AND ("gallium" OR "germanium" OR "antimony" OR "rare earth") AND ("ban" OR "restrict")',
  minerals_lithium: '"lithium" AND ("shortage" OR "price" OR "mine")',
  
  // Domain 17: Pharmaceutical Supply Chain
  pharma_shortage: '"drug shortage" OR "medication shortage" OR "pharmaceutical shortage"',
  pharma_api: '"pharmaceutical" AND ("China" OR "India") AND ("factory" OR "shutdown" OR "export ban")',
  pharma_counterfeit: '"counterfeit drug" OR "fake medication"',
  pharma_essential: '"insulin" OR "cancer drug" OR "antibiotic" AND ("shortage" OR "unavailable")',
  pharma_cyber: '"pharmaceutical" AND ("cyberattack" OR "ransomware")',
};
```

**GDELT Fetcher Template (TypeScript):**

```typescript
// server/fetchers/gdelt.ts
import axios from 'axios';

interface GdeltArticle {
  title: string;
  url: string;
  domain: string;
  seendate: string;
  language: string;
}

export async function fetchGdelt(query: string, maxRecords = 10): Promise<GdeltArticle[]> {
  try {
    const { data } = await axios.get('https://api.gdeltproject.org/api/v2/doc/doc', {
      params: {
        query,
        mode: 'ArtList',
        maxrecords: maxRecords,
        format: 'json',
        timespan: '24h',
        sort: 'DateDesc',
      },
      timeout: 30000,
    });
    return data.articles || [];
  } catch (error) {
    console.error(`[GDELT] Query failed: ${error}`);
    return [];
  }
}
```

#### 2. USGS Earthquake API
```text
URL: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson
Method: GET
Auth: NONE
Returns: GeoJSON FeatureCollection
Key fields: properties.mag, properties.place, properties.time, properties.url
            geometry.coordinates [lon, lat, depth]
Poll: Every 5 minutes
```

#### 3. GDACS Disaster Alerts
```text
URL: https://www.gdacs.org/xml/rss.xml
Method: GET (RSS/XML)
Auth: NONE
Parse with: xml2js or fast-xml-parser
Key fields: title, description, link, pubDate, georss:point
Poll: Every 15 minutes
```

#### 4. CISA Cybersecurity Advisories
```text
URL: https://www.cisa.gov/cybersecurity-advisories/all.xml
Method: GET (RSS/XML)
Auth: NONE
Key fields: title, summary, link, published
Poll: Every 30 minutes
```

#### 5. FRA Form 54 (US Rail Accidents)
```text
URL: https://data.transportation.gov/resource/85tf-25kj.json
Method: GET (Socrata JSON API)
Auth: NONE
Example: ?$where=date > '2026-03-01' AND type='DERAILMENT'&$order=date DESC&$limit=25
Key fields: date, railroad, state, city, latitude, longitude, type,
            cause, speed, hazmat_released, cars_derailed,
            persons_killed, persons_injured, total_damage
Poll: Every hour
```

#### 6. NOAA Space Weather Alerts
```text
URL: https://services.swpc.noaa.gov/products/alerts.json
Method: GET
Auth: NONE
Returns: JSON array of alert objects
Key fields: message, issue_datetime
Look for: G-scale (geomagnetic storms), S-scale (solar radiation), R-scale (radio blackouts)
G4/G5 = GPS disruption, power grid risk
Poll: Every 15 minutes
```

#### 7. US Drought Monitor
```text
URL: https://usdmdataservices.unl.edu/api/StateStatistics/GetDroughtSeverityStatisticsByAreaPercent
Params: ?aoi=US&startdate=YYYY-MM-DD&enddate=YYYY-MM-DD&statisticsType=1
Auth: NONE
Key fields: D0-D4 (drought severity percentages)
D3 = Extreme, D4 = Exceptional
Poll: Weekly (updates Thursdays)
```

#### 8. openFDA Drug Recalls
```text
URL: https://api.fda.gov/drug/enforcement.json
Params: ?search=report_date:[YYYYMMDD+TO+YYYYMMDD]&sort=report_date:desc&limit=10
Auth: NONE (rate limited without key)
Key fields: classification (Class I/II/III), product_description,
            reason_for_recall, status, report_date
Class I = dangerous, serious health consequences
Poll: Every 6 hours
```

#### 9. UNHCR Refugee Data
```text
URL: https://api.unhcr.org/population/v1/population/
Params: ?limit=20&year=2024&page=1
Auth: NONE
Key fields: refugees, asylum_seekers, idps, stateless, country_of_origin, country_of_asylum
Poll: Daily
```

#### 10. SIPRI Arms Transfers
```text
URL: https://armstrade.sipri.org/armstrade/page/values.php
Method: Web scrape or download CSV
Auth: NONE
Data: Arms imports/exports by country, weapon type, year
Poll: Monthly (updated quarterly)
```

#### 11. ReliefWeb
```text
URL: https://api.reliefweb.int/v1/reports?appname=growlingeyes
Params: &filter[field]=primary_country&limit=10&sort[]=date:desc
Auth: NONE
Key fields: title, body, date, primary_country, source
Poll: Every hour
```

#### 12. Cloudflare Radar (Internet Outages)
```text
URL: https://radar.cloudflare.com (data accessible via public pages)
Auth: NONE
Use for: Internet traffic anomalies by country (cable cuts, outages)
Poll: Every 30 minutes
```

#### 13. NOAA Weather Alerts
```text
URL: https://api.weather.gov/alerts/active
Auth: NONE (set User-Agent header)
Returns: GeoJSON with active weather alerts
Key fields: properties.event, properties.severity, properties.headline, properties.areaDesc
Poll: Every 10 minutes
```

#### 14. FAO Food Price Index
```text
URL: https://www.fao.org/worldfoodsituation/foodpricesindex/en/
Auth: NONE
Data: Monthly commodity price indices (cereals, oils, dairy, meat, sugar)
Poll: Monthly
```

#### 15. GPSJam.org
```text
URL: https://gpsjam.org
Auth: NONE
Data: Daily GPS interference maps derived from aircraft ADS-B data
Method: Web scrape or screenshot
Poll: Daily
```

#### 16. TeleGeography Submarine Cable Map
```text
URL: https://github.com/telegeography/www.submarinecablemap.com
Auth: NONE
Data: GeoJSON of all 597+ submarine cable systems + landing stations
Use: Static overlay on map — update monthly
```

#### 17. OpenRailwayMap
```text
URL: https://www.openrailwaymap.org
Tiles: https://tiles.openrailwaymap.org/
Auth: NONE
Data: Global rail infrastructure from OpenStreetMap
Use: Map overlay layer
```

### TIER 2: Add Next (Free Key Required)

#### 18. AISstream.io (REAL-TIME VESSEL TRACKING)
```text
URL: wss://stream.aisstream.io/v0/stream
Auth: Free API key from aisstream.io
Protocol: WebSocket
Send: {"APIKey": "your-key", "BoundingBoxes": [[[-90,-180],[90,180]]]}
Receive: JSON messages with vessel position, speed, heading, destination
THIS IS THE BIG ONE for maritime domain — real-time ship positions globally
```

#### 19. Space-Track.org
```text
URL: https://www.space-track.org/basicspacedata/query/
Auth: Free account (username/password, cookie-based)
Key endpoints:
  /class/cdm_public/   — Conjunction Data Messages (satellite near-miss alerts!)
  /class/gp/           — General Perturbation (orbital elements)
  /class/decay/        — Objects reentering atmosphere
  /class/satcat/       — Full satellite catalog (47,000+ objects)
```

#### 20. NVD/CVE (with key for better rate limits)
```text
URL: https://services.nvd.nist.gov/rest/json/cves/2.0
Auth: Optional API key (higher rate limits)
Params: ?pubStartDate=YYYY-MM-DDTHH:MM:SS&pubEndDate=...&resultsPerPage=20
Key fields: cve.id, descriptions, metrics.cvssMetricV31.cvssData.baseScore
```

#### 21. AlienVault OTX
```text
URL: https://otx.alienvault.com/api/v1/pulses/subscribed
Auth: Free API key
Key fields: pulse.name, pulse.indicators, pulse.created
```

#### 22. ACLED (Armed Conflict)
```text
URL: https://acleddata.com/data-export-tool/
Auth: Free API key
Key fields: event_date, event_type, country, latitude, longitude, fatalities, actor1, actor2
THE structured conflict dataset — every protest, battle, explosion, globally
```

#### 23. NASA FIRMS (Fire Data)
```text
URL: https://firms.modaps.eosdis.nasa.gov/api/
Auth: Free MAP_KEY
Data: Active fire detections from MODIS/VIIRS satellites
Use for: Agricultural fires, wildfire near infrastructure, conflict areas
```

#### 24. EIA Energy Data
```text
URL: https://api.eia.gov/v2/
Auth: Free API key
Data: Oil prices, gas prices, crude inventory, production data
Key series: PET.RWTC.D (WTI crude daily), NG.RNGWHHD.D (natural gas)
```

#### 25. FRED Economic Data
```text
URL: https://api.stlouisfed.org/fred/series/observations
Auth: Free API key
Key series: CPIAUCSL (CPI), UNRATE (unemployment), DFF (fed funds rate),
            T10Y2Y (yield curve), DCOILWTICO (crude oil)
```

#### 26. ADS-B Exchange
```text
URL: https://adsbexchange.com/data/
Auth: Free tier available
Data: Unfiltered flight data INCLUDING military aircraft
Complements existing FR24 integration
```

#### 27. OpenSky Network
```text
URL: https://opensky-network.org/api/states/all
Auth: Free account (better rate limits)
Data: All aircraft in flight right now
```

#### 28. IOM Displacement Tracking Matrix
```text
URL: https://dtm.iom.int/data-and-analysis/dtm-api
Auth: Free registration
Data: Internal displacement figures by country, admin region
```

#### 29. RIPE Atlas (Internet Measurement)
```text
URL: https://atlas.ripe.net/api/v2/
Auth: Free account
Data: Global internet measurement probes — detect cable cuts, routing anomalies
```

#### 30. FlightRadar24 (EXISTING KEY)
```text
Audrey already has an FR24 API key wired into the app.
The frontend has an FR24 tab with flight search.
ALSO: FR24 GPS Jamming Map at flightradar24.com/data/gps-jamming
```

### TIER 3: Freemium/Paid (Add Later)

| # | Source | What It Adds | Cost |
|---|--------|-------------|------|
| 31 | Datalastic | Vessel tracking API | 500 free credits/mo |
| 32 | VesselFinder | AIS positions + vessel data | Credit-based |
| 33 | MarineTraffic/Kpler | Comprehensive maritime intel | Enterprise |
| 34 | Xeneta | Freight rate benchmarking | Reports free |
| 35 | DataDocked | Maritime intelligence | Free trial |
| 36 | Windward | Maritime AI/risk | Enterprise |
| 37 | Janes/IHS Markit | Defense intelligence | Limited free |

### TELEGRAM CHANNELS (Via RSSHub Bridge)

```typescript
// Convert any public Telegram channel to RSS:
// https://rsshub.app/telegram/channel/<CHANNEL_NAME>
// Parse with any RSS/XML library

const TELEGRAM_FEEDS = [
  { handle: 'gcaptain', name: 'gCaptain Maritime', domain: 'maritime' },
  { handle: 'splash247', name: 'Splash247 Shipping', domain: 'maritime' },
  { handle: 'OsintTv', name: 'OsintTV', domain: 'geopolitical' },
  { handle: 'osintlatestnews', name: 'OSIntOps News', domain: 'cyber' },
  { handle: 'CyberDetective', name: 'CyberDetective', domain: 'cyber' },
  { handle: 'cveNotify', name: 'CVE Notify', domain: 'cyber' },
  { handle: 'fleetmon', name: 'FleetMon', domain: 'maritime' },
  { handle: 'livaborisova', name: 'Liveuamap', domain: 'geopolitical' },
];
```

### STATIC KNOWLEDGE BASES (Built Into App)

These don't need polling — they're reference data baked into the app:

#### Chokepoint Database
```typescript
const CHOKEPOINTS = {
  suez: {
    name: 'Suez Canal', lat: 30.4574, lon: 32.3499,
    tradeShare: '12-15% of global trade',
    normalTransitsPerDay: 50,
    rerouteDelayDays: 10,
    rerouteCostUsd: 1000000,
    keyCommodities: ['oil', 'LNG', 'containers', 'grain', 'auto parts'],
    keyRoutes: ['Asia-Europe', 'Asia-US East Coast'],
    consumerImpact: 'Ships reroute around Africa (+10 days, +$1M/voyage). Your goods cost 5-15% more in 4-8 weeks.',
  },
  panama: {
    name: 'Panama Canal', lat: 9.08, lon: -79.68,
    tradeShare: '5-6% of global trade',
    normalTransitsPerDay: 38,
    rerouteDelayDays: 8,
    rerouteCostUsd: 800000,
    keyCommodities: ['LNG', 'grain', 'containers', 'vehicles'],
    keyRoutes: ['Asia-US East Coast', 'US Gulf-Asia'],
    consumerImpact: 'Drought limits canal depth. Ships wait or reroute around South America. Consumer goods +10-25%.',
  },
  hormuz: {
    name: 'Strait of Hormuz', lat: 26.5667, lon: 56.25,
    tradeShare: '20-25% of global oil trade',
    normalTransitsPerDay: 21,
    rerouteDelayDays: 14,
    rerouteCostUsd: 2000000,
    keyCommodities: ['crude oil', 'LNG', 'petroleum products'],
    keyRoutes: ['Persian Gulf-Asia', 'Persian Gulf-Europe'],
    consumerImpact: '21% of world oil passes through. Any disruption = gas prices spike within days.',
  },
  malacca: {
    name: 'Strait of Malacca', lat: 2.5, lon: 101.5,
    tradeShare: '25-30% of global trade',
    normalTransitsPerDay: 83,
    keyCommodities: ['oil', 'LNG', 'electronics', 'palm oil'],
    consumerImpact: 'Everything from China/Japan/Korea passes through here on its way to you.',
  },
  bab_el_mandeb: {
    name: 'Bab el-Mandeb', lat: 12.5833, lon: 43.3333,
    tradeShare: 'Gateway to Suez from south',
    keyCommodities: ['oil', 'LNG', 'container goods'],
    consumerImpact: 'Front door to Suez. Houthi attacks here force ships around all of Africa.',
  },
  turkish_straits: {
    name: 'Turkish Straits (Bosphorus/Dardanelles)', lat: 41.02, lon: 28.98,
    tradeShare: '3% of global oil',
    keyCommodities: ['oil', 'grain', 'coal'],
    consumerImpact: 'Black Sea grain exports pass through. Disruption = food price spike in Middle East/Africa.',
  },
};
```

#### GPS Jamming Zones
```typescript
const GPS_JAMMING_ZONES = [
  { name: 'Kaliningrad/Baltic', lat: 54.7, lon: 20.5, actor: 'Russia', status: 'persistent' },
  { name: 'Eastern Med/Syria', lat: 35.0, lon: 37.0, actor: 'Russia/Syria', status: 'persistent' },
  { name: 'Black Sea', lat: 43.5, lon: 34.0, actor: 'Russia', status: 'persistent' },
  { name: 'Northern Norway/Finland', lat: 69.0, lon: 28.0, actor: 'Russia', status: 'intermittent' },
  { name: 'Red Sea/Yemen', lat: 14.0, lon: 43.0, actor: 'Houthi/Iran', status: 'intermittent' },
  { name: 'Taiwan Strait', lat: 24.5, lon: 119.0, actor: 'China', status: 'intermittent' },
  { name: 'Korean Peninsula DMZ', lat: 37.9, lon: 126.7, actor: 'North Korea', status: 'episodic' },
  { name: 'India-Pakistan border', lat: 32.0, lon: 74.0, actor: 'multiple', status: 'episodic' },
];
```

#### China Critical Mineral Dependency
```typescript
const CHINA_MINERAL_CONTROL = {
  rare_earths: { mining: '70%', processing: '90%', uses: 'EV motors, wind turbines, missiles, MRI, phones' },
  gallium: { mining: '98%', processing: '98%', uses: 'semiconductors, LEDs, 5G, radar' },
  germanium: { mining: '60%', processing: '80%', uses: 'fiber optics, infrared, solar cells' },
  graphite: { mining: '77%', processing: '90%+', uses: 'EV batteries, steel' },
  antimony: { mining: '48%', processing: '60%+', uses: 'flame retardants, ammunition' },
  tungsten: { mining: '82%', processing: '90%+', uses: 'cutting tools, armor-piercing rounds' },
  magnesium: { mining: '90%', processing: '90%', uses: 'auto parts, aluminum alloys' },
};
```

#### Pharma Supply Chain Dependencies
```typescript
const PHARMA_DEPENDENCIES = {
  apiFromChinaIndiaPct: 80,
  genericDrugsImportedPct: 90,
  activeDrugShortagesApprox: 300,
  mostAtRisk: [
    'Antibiotics (most APIs from China/India)',
    'Cancer drugs (concentrated manufacturing)',
    'Blood thinners / Heparin (80% from China)',
    'Anesthetics (propofol, fentanyl compounds)',
    'Insulin (3 companies control global supply)',
    'Contrast dye (GE Healthcare single-source)',
    'Sterile injectables (limited US manufacturing)',
  ],
};
```

---

## 4. BUILD ORDER

Do these in order. Each one should be fully wired (fetcher → DB → tRPC → frontend) before moving to the next.

### Sprint 1: Foundation (Day 1)
1. Add `events` table to Drizzle schema and run `pnpm db:push`
2. Create `server/fetchers/gdelt.ts` — the universal fetcher
3. Create `server/fetchers/cron.ts` — scheduling system for all fetchers
4. Wire GDELT into existing tRPC router
5. Deploy and verify data flows to frontend

### Sprint 2: Free APIs (Days 2-3)
1. USGS Earthquake fetcher
2. GDACS Disaster fetcher
3. CISA Cyber fetcher
4. FRA Rail Accident fetcher
5. NOAA Space Weather fetcher
6. US Drought Monitor fetcher
7. openFDA Drug Recall fetcher
8. UNHCR Refugee Data fetcher
9. NOAA Weather Alerts fetcher
10. ReliefWeb fetcher

### Sprint 3: Keyed APIs (Days 4-5)
1. AISstream.io WebSocket (vessel tracking — huge feature)
2. Space-Track.org (satellite near-misses)
3. ACLED (structured conflict data)
4. Wire remaining GDELT queries for all 18 domains
5. Telegram RSS bridge for 8 channels

### Sprint 4: Knowledge Bases + UI (Days 6-7)
1. Bake in chokepoint database
2. Bake in GPS jamming zones
3. Bake in China mineral dependency data
4. Bake in pharma dependency data
5. Consumer impact chain cards on frontend
6. Map overlays (Leaflet.js with submarine cables, rail, chokepoints)

### Sprint 5: Polish + Deploy Script (Day 8)
1. Add `deploy.sh` to repo
2. Add basic tests
3. Verify all 18 domains have data flowing
4. Performance check — ensure polling doesn't overload droplet
5. Final deploy

---

## 5. CONSUMER IMPACT CHAINS (THE DIFFERENTIATOR)

Every event card on the frontend MUST answer: **"Why should a regular person care?"**

Examples to implement:

| Event | Chain | What User Sees |
|---|---|---|
| Houthi missile hits cargo ship | Weapons → Maritime → Ships reroute | "Your goods cost 15% more in 6 weeks" |
| Panama Canal drought | Disaster → Maritime → Transits -40% | "Consumer goods +10-25% in 4 weeks" |
| Train derails carrying coal | Rail → Energy → Power plant supply drops | "Electricity prices may spike in your region" |
| Russia cuts Baltic cable | Undersea → Internet outage | "Banking and cloud services may be affected" |
| Solar storm G4+ | Space → GPS degraded | "Navigation apps and flights may be disrupted" |
| China bans gallium exports | Minerals → Semiconductors → Electronics | "New phones and EVs could be delayed months" |
| India pharma factory shuts down | Pharma → Drug supply | "Your pharmacy may run out of antibiotics" |
| Avian flu outbreak | Food → Poultry culled | "Egg prices could double in 3 weeks" |

---

## 6. DEPLOY SCRIPT (ADD TO REPO)

```bash
#!/bin/bash
# deploy.sh — GrowlingEyes deployment
# Usage: ./deploy.sh

set -e

echo "🔨 Building..."
pnpm build

echo "📦 Deploying to 164.90.148.7..."
rsync -avz --delete dist/ root@164.90.148.7:/var/www/growlingeyes/dist/

echo "🔄 Restarting PM2..."
ssh root@164.90.148.7 "cd /var/www/growlingeyes && pm2 restart growlingeyes --update-env"

echo "✅ Deployed! https://growlingeyes.com"
```

---

## 7. ENVIRONMENT VARIABLES TO ADD

Add these to `.env` on the droplet (alongside existing Google OAuth, Stripe, DB vars):

```env
# Tier 1 - No keys needed, but good to label
GDELT_ENABLED=true
USGS_ENABLED=true
GDACS_ENABLED=true
CISA_ENABLED=true
FRA_ENABLED=true
SWPC_ENABLED=true
DROUGHT_ENABLED=true
FDA_ENABLED=true
UNHCR_ENABLED=true

# Tier 2 - Free keys
AISSTREAM_API_KEY=          # Get at aisstream.io
SPACETRACK_USERNAME=        # Get at space-track.org
SPACETRACK_PASSWORD=
NVD_API_KEY=                # Get at nvd.nist.gov
OTX_API_KEY=                # Get at otx.alienvault.com
ACLED_API_KEY=              # Get at acleddata.com
NASA_FIRMS_MAP_KEY=         # Get at firms.modaps.eosdis.nasa.gov
EIA_API_KEY=                # Get at eia.gov
FRED_API_KEY=               # Get at fred.stlouisfed.org

# Already exists
# FR24_API_KEY=             # Already wired
# GOOGLE_OAUTH_CLIENT_ID=   # Already configured
# STRIPE keys               # Already configured
# DATABASE_URL=              # Already configured
```

---

## 8. WHAT NOT TO DO

- DO NOT rebuild the frontend framework. Extend it.
- DO NOT switch from tRPC. Add new routers.
- DO NOT switch from MySQL/Drizzle. Add new tables.
- DO NOT switch from PM2. Add new processes if needed.
- DO NOT add Docker. It's not containerized and doesn't need to be right now.
- DO NOT add GitHub Actions yet. Manual deploy works. Optimize later.
- DO NOT store API keys in code. `.env` only.
- DO NOT poll APIs more frequently than specified. Respect rate limits.
- DO NOT fetch all 95 sources in a single loop. Stagger them with different cron intervals.

---

## 9. SUCCESS CRITERIA

When you're done, growlingeyes.com shows:

1. **18 domain tabs or sections** with live data flowing
2. **Real-time vessel map** (AISstream.io WebSocket)
3. **Consumer impact cards** explaining why each event matters
4. **Severity indicators** (color-coded 1-5 scale)
5. **Cross-domain connections** visible in the UI
6. **95 data sources** feeding the pipeline
7. **Zero broken fetchers** — graceful failure with logging, never crash the app
8. **deploy.sh** committed and working

---

*GrowlingEyes — Because 90% of what affects your daily life happens where you can't see it.*
