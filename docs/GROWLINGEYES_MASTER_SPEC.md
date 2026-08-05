# GROWLINGEYES MASTER SPECIFICATION & OSINT STANDARDS

**Organization:** Freedom Angel Corps — "We believe you."
**Product:** GrowlingEyes — *Neighborhood Watch From Your Livingroom*
**Website:** [www.GROWLINGEYES.COM](https://www.growlingeyes.com)
**Status:** SINGLE SOURCE OF TRUTH (SSOT)
**Version:** 3.0.0 (April 3, 2026)
**Repository:** `midnghtsapphire/growlingeyes`
**Standards Repo:** `midnghtsapphire/revvel-standards`

---

## 1. Branding & Identity

GrowlingEyes is a product of **Freedom Angel Corps**. The core philosophy is rooted in the motto: **"We believe you."**

All branding must strictly adhere to the following rules:

- **No App or Agent Branding:** Do not mention the names of underlying AI agents (e.g., Manus, OpenRouter, Kimi) in user-facing UI. Freedom Angel Corps is the brand.
- **Payment Gateway:** Freedom Angel Corps serves as the payment gateway and organizational umbrella.
- **Footer/Credits:** "Brought to you by Freedom Angel Corps" or "GrowlingEyes is a product of Freedom Angel Corps."
- **Favicon:** The round GrowlingEyes creature logo is the favicon. It must appear in all browser tabs, bookmarks, and PWA icons.
- **Hero Section:** Glassmorphic, 3D-style, dark cyber-aesthetic. Large and immersive. Use the provided banner images as background.
- **Color Palette:** Cyan (`#00FFFF`), Deep Red (`#CC0000`), Dark Navy (`#0A0F1E`), Glassmorphic White (`rgba(255,255,255,0.08)`).

---

## 2. CI/CD & Quality Assurance Standards

### Continuous Integration / Continuous Deployment

All code flows from **GitHub** (`midnghtsapphire/growlingeyes`) to **DigitalOcean** droplet (`growlingeyes.com`):

| Step | Tool | Action |
|---|---|---|
| Source Control | GitHub (main branch) | All changes pushed here first |
| Build | esbuild (Node.js) | `server/_core/index.ts` → `dist/index.js` |
| Frontend Build | Vite + React | `client/` → `dist/client/` |
| Deploy | scp + SSH | `dist/index.js` → `/var/www/growlingeyes/dist/` |
| Process Manager | PM2 | `pm2 restart growlingeyes --update-env` |
| Reverse Proxy | Nginx | Port 3003 → `https://growlingeyes.com` |
| QA | Codemagic | Automated build, test, and deployment pipeline |

**Deploy Command (from Manus sandbox):**

```bash
cd /home/ubuntu/growlingeyes
node_modules/.bin/esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
scp -i ~/.ssh/growlingeyes_deploy dist/index.js root@growlingeyes.com:/var/www/growlingeyes/dist/index.js
ssh -i ~/.ssh/growlingeyes_deploy root@growlingeyes.com "pm2 restart growlingeyes --update-env"
```

**SSH Key:** `~/.ssh/growlingeyes_deploy` (stored in Manus sandbox)
**Droplet Host:** `growlingeyes.com` (root access)
**App Directory:** `/var/www/growlingeyes/`
**PM2 App Name:** `growlingeyes`
**Port:** `3003` (Nginx proxies 443 → 3003)

### Precog QA & Self-Healing Protocol

1. **Codemagic Integration:** Every push to `main` triggers Codemagic to run automated tests, lint checks, and build validation before deployment.
2. **RAID Log:** Every QA session must produce a RAID (Risks, Assumptions, Issues, Dependencies) log stored in `revvel-standards/templates/`.
3. **DARE Log:** Every resolved issue must be documented in a DARE (Describe, Analyze, Resolve, Evaluate) log.
4. **Self-Healing:** If a fetcher errors 3+ times in a row, the cron scheduler must automatically disable it, log the failure to GitHub Issues, and alert via the dashboard.
5. **Post-Test Research:** After every accepted test, QA must autonomously deep-research opportunities to improve the software and append findings to `todo.md`.
6. **Issue Tracking:** All QA findings must be automatically created as GitHub Issues with labels: `bug`, `enhancement`, `data-source`, `performance`.

### EXRUP (Extreme Rapid Unified Programming) — One Iteration

For new apps or major features:

1. **Kanban Use Cases** — Create use cases before writing a single line of code.
2. **Sprint Backlog** — Delegate to MAS/swarm via GitHub Issues.
3. **One Iteration** — Deliver working software in a single sprint cycle.
4. **Scrum Docs** — Sprint Planning, Daily Standup notes, Sprint Review, and Retrospective must all be committed to `revvel-standards/`.

### Swarm & MAS Protocols

- **Auto-Scaling:** If a MAS or swarm is lagging or hitting rate limits, autonomously spin up a new swarm to take over the load.
- **Standards Awareness:** Every swarm and MAS agent MUST read this spec before executing any task.
- **GitHub Issues Integration:** Swarms must automatically read and write to GitHub Issues to track progress and delegate tasks.
- **No Approval Needed:** If research or coding improvements are identified, implement them autonomously. Do not wait for approval.
- **FOSS First:** Always search for FOSS solutions before building custom code.

---

## 3. AI & Media Generation Standards

### Approved Media Generation Tools

| Tool | Purpose | API Variable |
|---|---|---|
| HeyGen | Avatar video generation, spoken explainers | `HEYGEN_API_KEY` |
| Leonardo.ai | Image generation, glassmorphic 3D UI assets, marketing | `LEONARDO_API_KEY` |
| ElevenLabs | Text-to-speech, alert audio, voiceovers | `ELEVENLABS_API_KEY` |
| Runway / Sora | B-roll video generation | `RUNWAY_API_KEY` |

### OSINT LLM Research Strategy

| LLM | Best For | Access |
|---|---|---|
| GPT-4o | General OSINT synthesis, structured reports | OpenAI API |
| Claude 3.5 Sonnet | Long-document analysis, code review | Anthropic API |
| Gemini 1.5 Pro | Massive context windows (1M tokens), multi-source synthesis | Google AI API |
| Perplexity API | Real-time web search + citation | Perplexity API |
| Mistral Large | FOSS-friendly, European data sources | Mistral API |
| DeepSeek R1 | Cutting-edge reasoning, code generation | OpenRouter |

**Blue Ocean OSINT Principle:** Swarms must continuously search all GitHub repositories for cutting-edge OSINT tools, scrapers, and data parsers that no one else is using. Findings go directly into `todo.md` and GitHub Issues.

---

## 4. The 90-Source Intelligence Map

All 90 data sources are mapped to their respective fetcher files and database tables. Every source must be wired — no source should be planned but unimplemented.

### Domain 1: Cyber Threats (`fetchCyberThreats.ts` → `cyberThreats` table)

| # | Source | URL | Type |
|---|---|---|---|
| 1 | CISA KEV Catalog | [cisa.gov/known_exploited_vulnerabilities.json](https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json) | JSON |
| 2 | NVD CVE API | [services.nvd.nist.gov](https://services.nvd.nist.gov/rest/json/cves/2.0) | JSON API |
| 3 | AlienVault OTX | [otx.alienvault.com](https://otx.alienvault.com/api/v1/pulses/subscribed) | JSON API (key) |
| 4 | IODA Internet Outages | [ioda.inetintel.cc.gatech.edu](https://ioda.inetintel.cc.gatech.edu/api/v2/outages/summary) | JSON API |
| 5 | Cloudflare Radar | [api.cloudflare.com/radar/bgp/hijacks](https://api.cloudflare.com/client/v4/radar/bgp/hijacks/events) | JSON API (key) |
| 6 | CISA Alerts RSS | [cisa.gov/cybersecurity-advisories](https://www.cisa.gov/cybersecurity-advisories/all.xml) | RSS |

### Domain 2: Supply Chain (`fetchSupplyChain.ts` → `supplyChainImpacts` table)

| # | Source | URL | Type |
|---|---|---|---|
| 7 | GDELT Supply Chain Query | [api.gdeltproject.org](https://api.gdeltproject.org/api/v2/doc/doc) | JSON API |
| 8 | gCaptain RSS | [gcaptain.com/feed](https://gcaptain.com/feed/) | RSS |
| 9 | Splash247 RSS | [splash247.com/feed](https://splash247.com/feed/) | RSS |
| 10 | FreightWaves RSS | [freightwaves.com/news/feed](https://www.freightwaves.com/news/feed) | RSS |
| 11 | Maritime Executive RSS | [maritime-executive.com/rss](https://maritime-executive.com/rss) | RSS |
| 12 | ReliefWeb Supply Chain | [api.reliefweb.int](https://api.reliefweb.int/v1/reports) | JSON API |

### Domain 3: Kinetic Events / Conflict (`fetchKineticEvents.ts` → `kineticEvents` table)

| # | Source | URL | Type |
|---|---|---|---|
| 13 | GDELT Conflict Query | [api.gdeltproject.org](https://api.gdeltproject.org/api/v2/doc/doc) | JSON API |
| 14 | Crisis Group Alerts RSS | [crisisgroup.org/rss.xml](https://www.crisisgroup.org/rss.xml) | RSS |
| 15 | ISW (via GDELT) | GDELT query: `"Institute for the Study of War"` | JSON API |
| 16 | ACLED Conflict Events | [api.acleddata.com](https://api.acleddata.com/acled/read) | JSON API (key) |
| 17 | FEWS NET Famine Warnings | [fews.net/api](https://fews.net/api/v1/ipc-population) | JSON API |
| 18 | ReliefWeb Crisis Reports | [api.reliefweb.int](https://api.reliefweb.int/v1/reports) | JSON API |

### Domain 4: Maritime & Air (`fetchMaritimeAir.ts` → `distressSignals`, `vesselPositions` tables)

| # | Source | URL | Type |
|---|---|---|---|
| 19 | NGA NavWarnings (NAVTEX) | [msi.nga.mil](https://msi.nga.mil/api/publications/query?type=NAVTEX) | JSON API |
| 20 | AIS Vessel Positions | [marinetraffic.com](https://www.marinetraffic.com/api/exportvessel/v:8) | JSON API (key) |
| 21 | OpenSky Network ADS-B | [opensky-network.org](https://opensky-network.org/api/states/all) | JSON API |
| 22 | FAA TFR Notices | [tfr.faa.gov](https://tfr.faa.gov/tfr2/list.html) | HTML scrape |
| 23 | OpenSky Military ADS-B | [opensky-network.org/military](https://opensky-network.org/api/states/all?icao24=ae) | JSON API |

### Domain 5: Nuclear, Chemical & Port Security (`fetchNuclearChemPort.ts` → `nuclearEvents`, `chemicalIncidents`, `portSecurityIncidents` tables)

| # | Source | URL | Type |
|---|---|---|---|
| 24 | GDELT Nuclear Query | GDELT query: `"nuclear" OR "IAEA" OR "reactor"` | JSON API |
| 25 | GDELT Chemical Query | GDELT query: `"chemical spill" OR "OPCW" OR "hazmat"` | JSON API |
| 26 | GDELT Port Security Query | GDELT query: `"port security" OR "harbor" OR "smuggling"` | JSON API |
| 27 | NRC Daily Event Reports RSS | [nrc.gov/event-report.rss](https://www.nrc.gov/public-involve/public-meetings/event-report.rss) | RSS |
| 28 | NRC News Releases RSS | [nrc.gov/news.rss](https://www.nrc.gov/reading-rm/doc-collections/news/news.rss) | RSS |

### Domain 6: Biological & Chemical Threats (`fetchBioChem.ts` → `bioChemThreats` table)

| # | Source | URL | Type |
|---|---|---|---|
| 29 | WHO RSS | [who.int/rss-feeds](https://www.who.int/rss-feeds/news-english.xml) | RSS |
| 30 | PAHO RSS | [paho.org/rss](https://www.paho.org/en/rss.xml) | RSS |
| 31 | CDC Outbreaks RSS | [cdc.gov/rss/outbreaks](https://www.cdc.gov/rss/outbreaks.xml) | RSS |
| 32 | CDC HAN Alerts RSS | [emergency.cdc.gov/han/feed](https://emergency.cdc.gov/han/feed.asp) | RSS |
| 33 | ECDC Disease News | [ecdc.europa.eu/rss](https://www.ecdc.europa.eu/en/rss.xml) | RSS |
| 34 | ReliefWeb Health Reports | [api.reliefweb.int](https://api.reliefweb.int/v1/reports) | JSON API |

### Domain 7: Troop Movements & Military (`fetchTroopMovements.ts` → `troopMovements` table)

| # | Source | URL | Type |
|---|---|---|---|
| 35 | DoD News RSS | [defense.gov/RSS/site-945](https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945) | RSS |
| 36 | DoD National Guard RSS | [defense.gov/RSS/site-948](https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=948) | RSS |
| 37 | AFRICOM RSS | [africom.mil/rss/news](https://www.africom.mil/rss/news) | RSS |
| 38 | CENTCOM RSS | [centcom.mil/rss/news](https://www.centcom.mil/rss/news) | RSS |
| 39 | EUCOM RSS | [eucom.mil/rss/news](https://www.eucom.mil/rss/news) | RSS |
| 40 | GDELT Military Query | GDELT query: `"troop deployment" OR "military exercise" OR "NATO"` | JSON API |

### Domain 8: Counter-Intelligence (`fetchCounterIntel.ts` → `counterIntelEvents` table)

| # | Source | URL | Type |
|---|---|---|---|
| 41 | GDELT Espionage Query | GDELT query: `"espionage" OR "spy" OR "intelligence agency"` | JSON API |
| 42 | FBI Wanted RSS | [fbi.gov/wanted/rss.xml](https://www.fbi.gov/wanted/rss.xml) | RSS |
| 43 | OFAC SDN List | [treasury.gov/ofac/sdn.xml](https://www.treasury.gov/ofac/downloads/sdn.xml) | XML |
| 44 | UN Sanctions List | [scsanctions.un.org/consolidated.xml](https://scsanctions.un.org/resources/xml/en/consolidated.xml) | XML |
| 45 | Interpol Red Notices | [ws-public.interpol.int](https://ws-public.interpol.int/notices/v1/red) | JSON API |

### Domain 9: Drone & UAV Events (`fetchDroneEvents.ts` → `droneEvents` table)

| # | Source | URL | Type |
|---|---|---|---|
| 46 | FAA UAS Sightings | [faa.gov/uas/public_records](https://www.faa.gov/uas/resources/public_records) | JSON |
| 47 | GDELT Drone Query | GDELT query: `"drone" OR "UAV" OR "UAS"` | JSON API |
| 48 | OpenSky Drone Tracking | [opensky-network.org](https://opensky-network.org/api/states/all) | JSON API |

### Domain 10: Identity & Entities (`fetchIdentityEntities.ts` → `identityEntities` table)

| # | Source | URL | Type |
|---|---|---|---|
| 49 | OFAC SDN (Persons) | [treasury.gov/ofac/sdn.xml](https://www.treasury.gov/ofac/downloads/sdn.xml) | XML |
| 50 | FBI Wanted (Persons) | [fbi.gov/wanted/rss.xml](https://www.fbi.gov/wanted/rss.xml) | RSS |
| 51 | Interpol Notices | [ws-public.interpol.int](https://ws-public.interpol.int/notices/v1/red) | JSON API |
| 52 | GDELT Person Query | GDELT query: `"sanctioned" OR "indicted" OR "arrested"` | JSON API |

### Domain 11: Public Broadcasts & Alerts (`fetchPublicBroadcasts.ts` → `publicBroadcasts` table)

| # | Source | URL | Type |
|---|---|---|---|
| 53 | NOAA Weather Alerts | [api.weather.gov/alerts/active](https://api.weather.gov/alerts/active) | JSON API |
| 54 | FEMA Disaster Declarations | [fema.gov/api/disasterDeclarations](https://www.fema.gov/api/open/v2/disasterDeclarationsSummaries) | JSON API |
| 55 | FDA Drug Enforcement | [api.fda.gov/drug/enforcement](https://api.fda.gov/drug/enforcement.json) | JSON API |
| 56 | GDACS Global Alerts | [gdacs.org/xml/rss.xml](https://www.gdacs.org/xml/rss.xml) | RSS |

### Domain 12: Environmental & Natural Disasters (`fetchAllSources.ts` → `events` table)

| # | Source | URL | Type |
|---|---|---|---|
| 57 | USGS Earthquakes | [earthquake.usgs.gov/significant_week](https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson) | GeoJSON |
| 58 | InciWeb Wildfires | [inciweb.nwcg.gov/feeds/rss](https://inciweb.nwcg.gov/feeds/rss/incidents/) | RSS |
| 59 | NIFC ArcGIS Wildfires | [services3.arcgis.com/NIFC](https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Current_WildlandFire_Perimeters/FeatureServer/0/query) | JSON API |
| 60 | NASA FIRMS Active Fires | [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov/api/area/csv/{KEY}/VIIRS_SNPP_NRT/world/1) | CSV API (key) |
| 61 | NOAA Space Weather | [services.swpc.noaa.gov/kp-index](https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json) | JSON API |
| 62 | NOAA X-Ray Solar Flares | [services.swpc.noaa.gov/xray-flares](https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json) | JSON API |
| 63 | US Drought Monitor | [usdmdataservices.unl.edu](https://usdmdataservices.unl.edu/api/StateStatistics/GetDroughtSeverityStatisticsByAreaPercent) | JSON API |

### Domain 13: Energy & Pipeline (`fetchAllSources.ts` + `fetchDomainSources.ts` → `events` table)

| # | Source | URL | Type |
|---|---|---|---|
| 64 | EIA Energy Data | [api.eia.gov](https://api.eia.gov/v2/electricity/rto/daily-region-data/data) | JSON API (key) |
| 65 | PHMSA Pipeline Incidents | [phmsa.dot.gov/pipeline-incidents](https://www.phmsa.dot.gov/data-and-statistics/pipeline/pipeline-incident-flagged-files) | JSON |
| 66 | EPA ECHO Enforcement | [echo.epa.gov/api](https://echo.epa.gov/api/rest/search) | JSON API |

### Domain 14: Economic & Financial (`fetchDomainSources.ts` → `events` table)

| # | Source | URL | Type |
|---|---|---|---|
| 67 | FRED Economic Data | [api.stlouisfed.org/fred](https://api.stlouisfed.org/fred/series/observations) | JSON API (key) |
| 68 | BLS CPI & Jobs | [api.bls.gov](https://api.bls.gov/publicAPI/v2/timeseries/data/) | JSON API |
| 69 | CoinGecko Crypto | [api.coingecko.com](https://api.coingecko.com/api/v3/coins/markets) | JSON API |
| 70 | USDA FAS | [apps.fas.usda.gov](https://apps.fas.usda.gov/psdonline/api/psd/commodity) | JSON API |

### Domain 15: Humanitarian & Refugees (`fetchDomainSources.ts` → `events` table)

| # | Source | URL | Type |
|---|---|---|---|
| 71 | UNHCR Refugee Data | [api.unhcr.org/population](https://api.unhcr.org/population/v1/population/) | JSON API |
| 72 | ReliefWeb Reports | [api.reliefweb.int](https://api.reliefweb.int/v1/reports) | JSON API |
| 73 | HDX Humanitarian Data | [data.humdata.org](https://data.humdata.org/api/3/action/package_search) | JSON API |

### Domain 16: Weapons & Arms (`fetchDomainSources.ts` → `events` table)

| # | Source | URL | Type |
|---|---|---|---|
| 74 | SIPRI Arms Transfers | [armstransfers.sipri.org](https://armstransfers.sipri.org/ArmsTransfer/DownloadExcel) | CSV |
| 75 | GDELT Weapons Query | GDELT query: `"arms transfer" OR "weapons shipment" OR "embargo"` | JSON API |

### Domain 17: Space & Satellites (`fetchAllSources.ts` → `events` table)

| # | Source | URL | Type |
|---|---|---|---|
| 76 | CelesTrak Military TLEs | [celestrak.org/military](https://celestrak.org/NORAD/elements/gp.php?GROUP=military&FORMAT=json) | JSON API |
| 77 | Space-Track.org TLEs | [space-track.org](https://www.space-track.org/basicspacedata/query/class/gp) | JSON API (key) |
| 78 | NOAA SWPC Geomagnetic | [services.swpc.noaa.gov/kp-index](https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json) | JSON API |

### Domain 18: Water & Agriculture (`liveDataRouter.ts` → live endpoints)

| # | Source | URL | Type |
|---|---|---|---|
| 79 | USGS Water Streamflow | [waterservices.usgs.gov/nwis](https://waterservices.usgs.gov/nwis/iv/?format=json&stateCd=CA,TX,FL,NY&parameterCd=00060) | JSON API |
| 80 | US Drought Monitor (live) | [usdmdataservices.unl.edu](https://usdmdataservices.unl.edu/api/StateStatistics/GetDroughtSeverityStatisticsByAreaPercent) | JSON API |
| 81 | FAO Food Price Index | [fao.org/giews/food-prices](https://www.fao.org/giews/food-prices/food-baskets/en/) | JSON |
| 82 | GDELT Agriculture Query | GDELT query: `"crop failure" OR "food security" OR "agricultural hack"` | JSON API |

### Domain 19: Rail & Transportation (`fetchAllSources.ts` → `events` table)

| # | Source | URL | Type |
|---|---|---|---|
| 83 | FRA Rail Accidents | [safetydata.fra.dot.gov](https://safetydata.fra.dot.gov/OfficeofSafety/publicsite/api/railroadincidentdata.ashx) | JSON API |
| 84 | BTS Transportation Stats | [bts.gov/freight-facts](https://www.bts.gov/topics/freight-transportation/freight-facts-and-figures) | JSON |
| 85 | GDELT Rail Query | GDELT query: `"train derailment" OR "rail accident" OR "freight disruption"` | JSON API |

### Domain 20: Dark Web & Encrypted Channels (Listener Swarm → `darkWebIntel` table)

| # | Source | Channel/URL | Type |
|---|---|---|---|
| 86 | Telegram Military Channels | Bot API + channel monitoring | Telegram API (key) |
| 87 | Discord Intelligence Servers | Webhook listener | Discord API (key) |
| 88 | Tor Onion Forum Crawler | `.onion` addresses (rotated) | SOCKS5 Proxy |
| 89 | I2P Network Feeds | I2P eepsite RSS | I2P Proxy |
| 90 | Anonymous Incident Reports | Internal form → `anonymous_reports` table | Internal API |

---

## 5. API & Connector Registry

Keys are stored in the **HashiCorp Vault** on the DigitalOcean `vault-server` droplet, and synchronized to the `.env` on the `growlingeyes` droplet. **Never hardcode keys.**

### HashiCorp Vault Server (DigitalOcean)

- **Droplet Name:** `vault-server`
- **URL:** `https://vault.freedomangelcorps.com`
- **SSH Access:** Use the `growlingeyes_deploy` key (or your DO account SSH key) to access `root@159.65.36.200`.
- **Unseal Keys & Root Token:** The 5 unseal keys and the root token generated during Vault initialization MUST be stored securely (e.g., in a secure password manager or physical safe). If the vault server restarts, 3 of the 5 unseal keys are required to unlock it.
- **Seeding Process:** To seed the vault, SSH into the vault server, unseal it (`vault operator unseal`), authenticate (`vault login <root_token>`), and write secrets to `secret/data/growlingeyes/...`.

### Free APIs (No Key Required)

GDELT Project, USGS Earthquake, GDACS, NOAA Weather, NOAA Space Weather, NVD CVE (5 req/30s), OpenSky Network (400 req/day anonymous), CelesTrak, USDM Drought, USGS Water Services, CISA KEV, FBI Wanted, NRC RSS, Crisis Group RSS, WHO RSS, PAHO RSS, CDC RSS, ReliefWeb (appname param), SIPRI Arms (CSV download), FEWS NET, gCaptain RSS, Splash247 RSS, FreightWaves RSS, UNHCR, OFAC SDN, UN Sanctions, Interpol, PHMSA, EPA ECHO, USDA FAS, BLS (50 req/day), CoinGecko (rate limited), FAA TFR, InciWeb, NIFC ArcGIS, IODA, Cloudflare Radar (free tier)

### Keyed APIs (Key Required)

| API | Env Variable | Purpose |
|---|---|---|
| NASA FIRMS | `NASA_FIRMS_KEY` | Active fire detection |
| ACLED | `ACLED_API_KEY` | Armed conflict events |
| EIA Energy | `EIA_API_KEY` | Energy grid data |
| FRED Economic | `FRED_API_KEY` | Economic indicators |
| AlienVault OTX | `OTX_API_KEY` | Threat intelligence |
| Space-Track.org | `SPACETRACK_USER` + `SPACETRACK_PASS` | Military satellite TLEs |
| Telegram Bot | `TELEGRAM_BOT_TOKEN` | Channel monitoring |
| Discord | `DISCORD_BOT_TOKEN` | Server monitoring |
| HeyGen | `HEYGEN_API_KEY` | Video generation |
| Leonardo.ai | `LEONARDO_API_KEY` | Image generation |
| ElevenLabs | `ELEVENLABS_API_KEY` | Voice synthesis |
| OpenAI | `OPENAI_API_KEY` | LLM analysis |
| OpenRouter | `OPENROUTER_API_KEY` | Multi-LLM routing |
| MarineTraffic | `MARINETRAFFIC_API_KEY` | Real-time AIS vessel tracking |
| Spire Maritime | `SPIRE_API_KEY` | Satellite AIS tracking |
| Codemagic | `CODEMAGIC_API_KEY` | CI/CD builds |
| Stripe | `STRIPE_SECRET_KEY` | Payments (Freedom Angel Corps) |

---

## 6. Dark Web Listener Swarm

The Dark Web Listener is a coded process summoned from the GrowlingEyes dashboard. It runs as a PM2 worker process on the droplet.

### Architecture

```text
[GrowlingEyes Dashboard] → [Summon Listener] → [PM2 Worker: darkWebListener]
                                                        ↓
                                          [Tor SOCKS5 Proxy :9050]
                                                        ↓
                              .onion forums | Telegram | Discord
                                                        ↓
                                          [Parse + Classify + Score]
                                                        ↓
                                          [darkWebIntel table in MySQL]
                                                        ↓
                                          [GrowlingEyes Dashboard Feed]
```

### Telegram Military Channel Process

1. **Discovery:** Swarm searches for public Telegram channels using keywords: `military`, `SIGINT`, `OSINT`, `intel`, `war`, `conflict`, `tactical`.
2. **Monitoring:** Telegram Bot API polls channels every 5 minutes for new messages.
3. **Classification:** Messages are classified by domain using LLM analysis.
4. **Storage:** Classified messages stored in `darkWebIntel` table with `source: "telegram"`.
5. **Display:** Feed appears in the GrowlingEyes "Dark Intel" tab.

**Implementation File:** `server/workers/darkWebListener.ts` — summoned via `liveData.darkweb.start` tRPC endpoint.

---

## 7. LiDAR & Temporal Change Detection

### FOSS LiDAR Sources

| Source | URL | Coverage |
|---|---|---|
| OpenTopography API | [portal.opentopography.org](https://portal.opentopography.org/API/otCatalog) | Global |
| USGS 3DEP | [tnmaccess.nationalmap.gov](https://tnmaccess.nationalmap.gov/api/v1/products) | USA |
| AWS Open Data (CanElevation) | `s3://elevation-tiles-prod/` | Global |
| NRCan Elevation API | [geogratis.gc.ca/elevation](https://geogratis.gc.ca/services/elevation/cdem/altitude) | Canada |
| Copernicus DEM | [copernicus-dem-30m.s3.amazonaws.com](https://copernicus-dem-30m.s3.amazonaws.com/) | Global 30m |

### Temporal Change Detection Feature

**User Flow:**
1. User enters GPS coordinates + time period (start date → end date)
2. System fetches elevation/imagery data from multiple sources for both dates
3. AI compares datasets and identifies changes
4. Report generated classifying changes as: **Organic** (natural erosion, vegetation), **Man-Made** (construction, excavation), or **Anomaly** (unexplained)

**Implementation:** `liveData.lidar.temporalChange` tRPC endpoint + `LiDARChangeReport` component.

---

## 8. Real-Time Tracking

### Ship Tracking

- **Primary:** MarineTraffic API (`MARINETRAFFIC_API_KEY`) or Spire Maritime (`SPIRE_API_KEY`)
- **FOSS Alternative:** [aisstream.io](https://aisstream.io) (free WebSocket AIS stream)
- **Display:** Real-time vessel positions on Leaflet.js map with vessel type, speed, heading, destination

### Presidential / VIP Aircraft Tracking

- **Source:** OpenSky Network — filter by ICAO hex codes for known government aircraft
- **Known Codes:** `AE01CE` (Air Force One), `AE01CF` (Air Force Two), `AE0000`–`AEFFFF` (US Military)
- **Display:** Special marker on map with "POTUS" or "VIP" label when detected

**Implementation:** `liveData.tracking.vessels` and `liveData.tracking.aircraft` tRPC endpoints.

---

## 9. Agricultural & Water Security Intelligence

| Source | Data | URL |
|---|---|---|
| USGS Water Services | Real-time streamflow at 8,000+ gauges | [waterservices.usgs.gov](https://waterservices.usgs.gov/nwis/iv/) |
| US Drought Monitor | Weekly drought severity by state | [usdmdataservices.unl.edu](https://usdmdataservices.unl.edu/api/) |
| USDA NASS | Crop condition reports | [quickstats.nass.usda.gov](https://quickstats.nass.usda.gov/api/) |
| EPA ECHO | Water quality enforcement actions | [echo.epa.gov](https://echo.epa.gov/api/rest/search) |
| ICS-CERT | Industrial control system alerts (water/ag) | [cisa.gov/ics-advisories](https://www.cisa.gov/ics-advisories) |

The system monitors for SCADA attacks on agricultural and water infrastructure, crop disease outbreaks, and irrigation system hacking.

---

## 10. Anonymous Incident Reporting

A secure, anonymous portal for whistleblowers, insiders, and citizens.

- **Endpoint:** `POST /api/trpc/liveData.report.submit`
- **Database:** `anonymous_reports` table (MySQL)
- **Fields:** `type`, `description`, `location`, `lat`, `lng`, `mediaUrl`, `ipHash` (anonymized)
- **Display:** Reports appear in "Community Intel" feed after AI verification
- **No Login Required:** Completely anonymous — no IP logging, no cookies

---

## 11. Precog Intelligence Feed

The Precog Feed is GrowlingEyes' signature feature — a real-time, AI-synthesized intelligence stream that predicts emerging threats before they become news.

### Threat Scoring Algorithm

Each intelligence item receives a **Precog Score** (0–100):

| Factor | Max Points | Description |
|---|---|---|
| Recency | 25 | How recent is the signal? |
| Source Credibility | 25 | Government source = 25, RSS = 15, dark web = 10 |
| Corroboration | 25 | How many independent sources confirm it? |
| Domain Severity | 25 | Nuclear/Bio = 25, Cyber = 20, Economic = 10 |

Items scoring **70+** are flagged as **PRECOG ALERT** and pushed to the top of the feed.

---

## 12. Data Parsing & Human Consumption Standards

All raw data (JSON, XML, CSV) MUST be parsed and presented in human-readable format:

- **Dates:** Always display in local time with timezone (e.g., `Apr 3, 2026 11:30 AM MDT`)
- **Coordinates:** Display as `lat, lng` with a clickable map link
- **Severity:** Color-coded badges (Red = Critical, Orange = High, Yellow = Medium, Green = Low)
- **Source Links:** All items must have a clickable source URL (shortened if >80 chars)
- **Numbers:** Format with commas (e.g., `1,234,567`) and appropriate units
- **Truncation:** Descriptions truncated at 280 chars with "Read more" expansion

---

## 13. Live Data Wiring Protocol (OpenSky & ADS-B)

When integrating live, high-frequency data sources like OpenSky Network or MarineTraffic AIS, the following wiring protocol MUST be used:
1. **Frontend-Direct Polling**: Live data should be queried from the frontend via a tRPC endpoint that acts as a proxy to the external API, rather than storing every tick in the database.
2. **Rate Limiting Respect**: Polling intervals must respect the provider's limits (e.g., OpenSky anonymous tier = 10 seconds max, default to 30s).
3. **Data Fusion**: The UI must clearly distinguish between **Historical/Promoted Events** (from the database) and **Live Contacts** (from the live API feed).
4. **Visual Indicators**: Live data feeds must have a pulsing indicator (e.g., `animate-pulse` green dot) and a manual refresh button to assure the user the connection is active.
5. **Graceful Degradation**: If the live API is unreachable or rate-limited, the UI must show a clean fallback message (e.g., "Polling..." or "No contacts in range") instead of breaking the page.

---

## 14. Vault Security & Secret Management

All API keys, SSH keys, and sensitive environment variables MUST be managed securely using the dedicated HashiCorp Vault server.

**Vault Server Details:**
- **URL:** `https://vault.freedomangelcorps.com`
- **Droplet IP:** `159.65.36.200`
- **SSH Access:** `root@159.65.36.200` (using the `growlingeyes_deploy` key)

**Mandatory Unseal Key Protocol:**
When initializing a new Vault (`vault operator init`), the system generates 5 unseal keys and 1 root token. **These MUST be immediately saved to a secure password manager (e.g., 1Password, Bitwarden) by the owner.** The vault requires 3 of the 5 keys to unseal after any reboot. If these keys are lost, the vault and all secrets within are permanently inaccessible.

**Seeding Protocol:**
After unsealing, secrets are seeded using the `scripts/seed_vault.sh` script, which writes to the `secret/data/growlingeyes/*` path.

---

## 15. Error Handling & API Fallback Protocol

To maintain 100% uptime and data flow, all fetchers MUST adhere to the following:
1. **Fallback Wrapper**: All external API calls MUST use `fetchWithFallback` or `fetchXmlWithFallback`.
2. **URL Chain**: Every primary API URL MUST have at least one fallback URL (e.g., an alternative endpoint, an RSS feed, or a secondary provider like GDACS for ReliefWeb).
3. **No Uncaught Exceptions**: Fetchers MUST NEVER throw runtime errors. They must return empty arrays `[]` or `0` on complete failure.
4. **Health Monitor**: The `healthMonitor.ts` worker runs every 30 minutes to ping all primary endpoints.
5. **Auto-Alerting**: Any 4xx/5xx error or timeout detected by the health monitor automatically creates a GitHub Issue (deduplicated) and sends an email alert via SMTP.
6. **Schema Guards**: API responses MUST be validated (e.g., using `zod` or safe destructuring) to prevent crashes when external providers change their JSON structure (e.g., NOAA Kp Index format change).

---

## 16. GitHub → DigitalOcean Pre-Deploy Verification Checklist

Before claiming ANY deployment is "live", you MUST verify both backend and frontend builds:

### Backend Build
- [ ] `esbuild` compiles with 0 errors (`npm run build`)
- [ ] All new fetchers use `fetchWithFallback`
- [ ] New environment variables are added to droplet `.env` (including API keys)
- [ ] New DB tables are created/pushed on droplet before deployment

### Frontend Build
- [ ] `vite build` completes successfully (`npm run build`)
- [ ] The `dist/public/assets/index-[hash].js` file is generated
- [ ] The `dist/public/` folder is uploaded to the droplet (`/var/www/growlingeyes/dist/public/`)
- [ ] **Permissions Check**: Run `chmod -R o+rX /var/www/growlingeyes/dist/public/` to ensure `nginx` (www-data) can read static files (prevents 403 errors).

### Live Verification
- [ ] PM2 restarts cleanly (`pm2 restart growlingeyes --update-env`)
- [ ] Check `pm2 logs growlingeyes` for startup errors
- [ ] **CRITICAL**: Verify the live `index.html` serves the NEW asset hash (`curl -s https://growlingeyes.com/ | grep assets/index-`)
- [ ] Site returns HTTP 200 after restart (`curl -A 'Mozilla/5.0' -I https://growlingeyes.com/`)
- [ ] Visual verification: All UI changes (hero section, favicon) are confirmed visible on the live site.
- [ ] All new endpoints tested with `curl` before marking complete
- [ ] Changes committed to `midnghtsapphire/growlingeyes` on `main`
- [ ] Standards updated in `midnghtsapphire/revvel-standards`

---

**END OF SPECIFICATION — SSOT v3.2.0**
*GrowlingEyes is a product of Freedom Angel Corps — "We believe you."*
