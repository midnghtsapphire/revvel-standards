# Method Module: Riverine Drowning / Body Recovery — First Line-of-Sight Search

**Module type:** Water recovery (moving freshwater)
**Distinct from:** Wilderness/alpine missing-person (e.g., Shtuka-type), which is a terrain/exposure/route problem. This is a **fluid-dynamics** problem.
**Status:** Remote analytical support only. Do not put untrained people in flood-stage water.

---

## 0. The One Rule That Governs Everything

> **Geolocate the incident to a specific river REACH before trusting any adjective.**
> Press releases describe how the water *felt* to responders. Gauges describe what the water
> *did*. They frequently disagree. Find the gauge that actually controls the incident reach —
> which may not be the nearest or most obvious one.

**Worked example (Okanogan, 5/27/2026):**
- Press release: "elevated runoff, elevated current speed, dangerous."
- Nearest gauge (Okanogan at Oroville, USGS 12439500): **151 cfs**, flat, warm (18–22 °C). Looks calm.
- But incident was "south of Oroville," *below the Similkameen confluence*.
- Similkameen at Nighthawk (USGS 12442500): **~5,200 cfs** — ~30× higher.
- The governing reach carried the Similkameen's flood, not the Okanogan's trickle.
- **Lesson:** the obvious gauge was the wrong gauge. Confluences, dams, and tributaries
  redefine which gauge matters.

---

## 1. Decision Inputs (what actually moves a body in a river)

Ranked by impact in moving freshwater:

1. **Discharge (cfs) and current velocity** on the *governing reach* — sets drift distance.
2. **Last-seen point (LKP) + physical anchors** — here, a recovered firearm fixed the entry point. Search DOWNSTREAM of it.
3. **Channel morphology** — snags, strainers, log jams, bridge pilings, undercut banks, eddies, inside of bends. Bodies hang up here.
4. **Water temperature** — drives refloat timing (gas formation). Cold = stays down longer. (Here it was warm, ~64–72 °F → faster refloat, days not weeks.)
5. **Depth / holes / recirculation zones** — a body can stay local for days.
6. **Debris load** — both a snag mechanism and a search hazard.

**Low relevance in this setting (don't waste budget):**
- Tides — irrelevant on an inland freshwater river.
- Wind — only matters for a *floating* body on open/slow water.
- LIDAR of surrounding terrain — useful for access/staging, NOT for in-water prediction. Bathymetry > topo here.

---

## 2. Tool & Repository Stack

### Hydrology (highest value)
- **USGS NWIS Instantaneous Values API** — `https://waterservices.usgs.gov/nwis/iv/`
  - params: `sites`, `startDT`, `endDT`, `parameterCd=00060,00065,00010`, `format=json`
  - 00060=discharge, 00065=gauge height, 00010=water temp
- **USGS National Water Dashboard** — `https://dashboard.waterdata.usgs.gov` — find ALL gauges near a reach, including tributaries.
- **USGS Water Quality Portal** — site metadata, lat/long, drainage area, HUC.
- Identify confluences/dams via the site list; pull the tributary gauge too.

### Mapping / morphology
- **USGS National Map / 3DEP** — elevation + LIDAR where available; channel structure.
- **USGS NHD (National Hydrography Dataset)** — stream network, flow direction, confluences.
- **NOAA / NWS archived observations** — temp, precip, wind for the dates (refloat + conditions).
- **Google Earth historical imagery + Sentinel-2 / Landsat** — normal vs. flood channel, debris-catching features, sandbars, bends.
- **FEMA flood maps + USACE** — floodplain & channel engineering.
- **County GIS** (e.g., Okanogan County parcel/aerial) — bank access, staging, land ownership.

### Refloat-timing references
- Cold-water drowning literature (gas formation vs. temperature). Treat as rough bracket, not a clock.

---

## 3. Procedure (repeatable checklist)

1. **Geolocate incident** to lat/long or named reach. Note position relative to confluences/dams.
2. **Inventory gauges** on that reach AND upstream tributaries (Dashboard + site list).
3. **Pull IV data** for the incident date window from the *governing* gauge(s). Compare to press-release adjectives — flag mismatches.
4. **Fix the anchor** (LKP, recovered evidence). All drift modeling runs downstream from here.
5. **Estimate drift envelope:** velocity × elapsed time = max plausible travel; bracket low/high.
6. **Map snag zones** within that envelope from imagery (bends, jams, pilings, eddies).
7. **Rank search cells** by P(snag) × accessibility.
8. **Cross-check refloat window** vs. water temp to decide surface vs. subsurface search emphasis.
9. **Hand verified tips to authorities;** never let unverified social chatter set geography (see §4).
10. **Document & version** — every assumption logged so the model is auditable later.

---

## 4. Social Media / OSINT Handling (discipline, not noise)

- Social monitoring is legitimate **tip intake**, NOT a geography driver.
- Treat anonymous comments ("X was heading to Omak") as **unverified, third-hand**. Different town,
  different reach — building a search theory on it risks chasing a false premise and can defame a
  real, possibly-uninvolved person, especially when the decedent's identity is unconfirmed.
- Pipeline: collect → tag confidence → route to investigators for verification → only promote to
  search planning if independently corroborated.
- Physical evidence (LKP, recovered firearm, current direction) outranks all chatter.

---

## 5. Ethics / Safety Gates (hard stops)

- Official search "suspended" ≠ "closed." Coordinate with the lead agency (here, Okanogan County
  Sheriff) before independent action — avoid duplicating or endangering.
- Flood-stage water killed the in-person search; remote analysts add value WITHOUT entering water.
- Decedent dignity + family privacy: no naming, no speculation, no publishing identity.
- Your role in the app: drift modeling, snag mapping, gauge analysis, verified-tip organization.

---

## 6. Reusable Code Stub (USGS pull)

```python
import requests
def pull_usgs(site, start, end, params="00060,00065,00010"):
    r = requests.get("https://waterservices.usgs.gov/nwis/iv/",
        params={"sites":site,"startDT":start,"endDT":end,
                "parameterCd":params,"format":"json"}, timeout=30)
    out={}
    for s in r.json().get("value",{}).get("timeSeries",[]):
        name=s["variable"]["variableName"]
        vals=[(v["dateTime"],v["value"]) for v in s["values"][0]["value"]]
        out[name]=vals
    return out
# Always pull the tributary gauge too if a confluence sits between LKP and the obvious gauge.
```

---

## 7. Case Card (for the repository index)

| Field | Value |
|---|---|
| Case type | Riverine drowning recovery |
| Location | Okanogan River south of Oroville, WA (below Similkameen confluence) |
| Date | 5/27/2026, ~2:30 PM report |
| Anchor evidence | Firearm recovered at last-seen point |
| Obvious gauge | Okanogan @ Oroville 12439500 — 151 cfs (misleading) |
| Governing gauge | Similkameen @ Nighthawk 12442500 — ~5,200 cfs |
| Water temp | ~18–22 °C (warm → shorter refloat window) |
| Key lesson | Reach-geolocation beats narrative adjectives; pick the gauge that controls the reach |
| Tides/wind | N/A (inland freshwater, fast current) |
