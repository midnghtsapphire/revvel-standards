//! Small geographic helpers: bbox parsing, haversine distance, and
//! normalisation of date / datetime ranges into RFC 3339.

use anyhow::{bail, Context, Result};
// use chrono::{DateTime, NaiveDate};
// Replaced (review 2026-10-16): SecondsFormat is needed to keep fractional seconds.
use chrono::{DateTime, NaiveDate, SecondsFormat};

/// Mean Earth radius in kilometres (IUGG).
pub const EARTH_RADIUS_KM: f64 = 6371.0088;

/// WGS84 bounding box `minlon,minlat,maxlon,maxlat`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Bbox {
    pub min_lon: f64,
    pub min_lat: f64,
    pub max_lon: f64,
    pub max_lat: f64,
}

impl Bbox {
    /// Parse `minlon,minlat,maxlon,maxlat`. Antimeridian-crossing boxes
    /// (`minlon > maxlon`) are rejected; split them into two queries.
    pub fn parse(s: &str) -> Result<Self> {
        let parts: Vec<f64> = s
            .split(',')
            .map(|p| {
                p.trim()
                    .parse::<f64>()
                    .with_context(|| format!("bbox component {p:?} is not a number"))
            })
            .collect::<Result<_>>()?;
        if parts.len() != 4 {
            bail!(
                "bbox must be minlon,minlat,maxlon,maxlat (got {} values)",
                parts.len()
            );
        }
        let b = Bbox {
            min_lon: parts[0],
            min_lat: parts[1],
            max_lon: parts[2],
            max_lat: parts[3],
        };
        if parts.iter().any(|v| !v.is_finite()) {
            bail!("bbox values must be finite");
        }
        if !(-180.0..=180.0).contains(&b.min_lon) || !(-180.0..=180.0).contains(&b.max_lon) {
            bail!("bbox longitudes must be within [-180, 180]");
        }
        if !(-90.0..=90.0).contains(&b.min_lat) || !(-90.0..=90.0).contains(&b.max_lat) {
            bail!("bbox latitudes must be within [-90, 90]");
        }
        if b.min_lon > b.max_lon || b.min_lat > b.max_lat {
            bail!("bbox min must not exceed max (antimeridian boxes are not supported)");
        }
        Ok(b)
    }

    pub fn to_array(self) -> [f64; 4] {
        [self.min_lon, self.min_lat, self.max_lon, self.max_lat]
    }

    pub fn to_csv(self) -> String {
        format!(
            "{},{},{},{}",
            self.min_lon, self.min_lat, self.max_lon, self.max_lat
        )
    }
}

/// Great-circle distance in km between two WGS84 points.
pub fn haversine_km(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let (p1, p2) = (lat1.to_radians(), lat2.to_radians());
    let dp = (lat2 - lat1).to_radians();
    let dl = (lon2 - lon1).to_radians();
    let a = (dp / 2.0).sin().powi(2) + p1.cos() * p2.cos() * (dl / 2.0).sin().powi(2);
    2.0 * EARTH_RADIUS_KM * a.sqrt().asin()
}

pub fn validate_lat_lon(lat: f64, lon: f64) -> Result<()> {
    if !lat.is_finite() || !(-90.0..=90.0).contains(&lat) {
        bail!("latitude {lat} out of range");
    }
    if !lon.is_finite() || !(-180.0..=180.0).contains(&lon) {
        bail!("longitude {lon} out of range");
    }
    Ok(())
}

/// Normalise one end of a range. `YYYY-MM-DD` becomes start-of-day or
/// end-of-day UTC; full RFC 3339 passes through; `..` / empty is open.
fn normalise_instant(s: &str, end_of_day: bool) -> Result<Option<String>> {
    let s = s.trim();
    if s.is_empty() || s == ".." {
        return Ok(None);
    }
    if let Ok(d) = NaiveDate::parse_from_str(s, "%Y-%m-%d") {
        let t = if end_of_day {
            d.and_hms_opt(23, 59, 59)
        } else {
            d.and_hms_opt(0, 0, 0)
        }
        .context("invalid time")?;
        return Ok(Some(t.and_utc().format("%Y-%m-%dT%H:%M:%SZ").to_string()));
    }
    let dt = DateTime::parse_from_rfc3339(s)
        .with_context(|| format!("{s:?} is neither YYYY-MM-DD nor RFC 3339"))?;
    // Ok(Some(dt.to_utc().format("%Y-%m-%dT%H:%M:%SZ").to_string()))
    // Replaced (review 2026-10-16): keep fractional seconds so a bound like `...00.500Z` is not moved 500 ms.
    Ok(Some(
        dt.to_utc().to_rfc3339_opts(SecondsFormat::AutoSi, true),
    ))
}

/// A closed or half-open time range. `sep` is the input separator
/// (`/` for STAC, `,` for CMR).
#[derive(Debug, Clone, PartialEq)]
pub struct TimeRange {
    pub start: Option<String>,
    pub end: Option<String>,
}

impl TimeRange {
    pub fn parse(s: &str, sep: char) -> Result<Self> {
        let (a, b) = match s.split_once(sep) {
            Some((a, b)) => (a, b),
            None => (s, s),
        };
        let r = TimeRange {
            start: normalise_instant(a, false)?,
            end: normalise_instant(b, true)?,
        };
        if r.start.is_none() && r.end.is_none() {
            bail!("time range {s:?} is fully open");
        }
        // if let (Some(a), Some(b)) = (&r.start, &r.end) {
        //     if a > b {
        //         bail!("time range start {a} is after end {b}");
        //     }
        // }
        // Replaced (review 2026-10-16): with fractional seconds the strings no longer sort chronologically ("00Z" > "00.5Z"); compare instants.
        if let (Some(a), Some(b)) = (&r.start, &r.end) {
            let (ta, tb) = (
                DateTime::parse_from_rfc3339(a).context("normalised start")?,
                DateTime::parse_from_rfc3339(b).context("normalised end")?,
            );
            if ta > tb {
                bail!("time range start {a} is after end {b}");
            }
        }
        Ok(r)
    }

    /// STAC `datetime` parameter: `start/end` with `..` for open ends.
    pub fn to_stac(&self) -> String {
        format!(
            "{}/{}",
            self.start.as_deref().unwrap_or(".."),
            self.end.as_deref().unwrap_or("..")
        )
    }

    /// CMR `temporal` parameter: `start,end` with empty open ends.
    pub fn to_cmr(&self) -> String {
        format!(
            "{},{}",
            self.start.as_deref().unwrap_or(""),
            self.end.as_deref().unwrap_or("")
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bbox_parses_and_validates() {
        let b = Bbox::parse("-88.5, 30.1,-87.9,30.9").unwrap();
        assert_eq!(b.to_array(), [-88.5, 30.1, -87.9, 30.9]);
        assert!(Bbox::parse("1,2,3").is_err());
        assert!(Bbox::parse("10,0,5,1").is_err());
        assert!(Bbox::parse("0,95,1,96").is_err());
        assert!(Bbox::parse("a,b,c,d").is_err());
        assert!(Bbox::parse("NaN,0,1,1").is_err());
    }

    #[test]
    fn haversine_known_distance() {
        // One degree of latitude ~ 111.2 km.
        let d = haversine_km(0.0, 0.0, 1.0, 0.0);
        assert!((d - 111.195).abs() < 0.05, "{d}");
        assert_eq!(haversine_km(10.0, 20.0, 10.0, 20.0), 0.0);
    }

    #[test]
    fn time_range_normalises() {
        let r = TimeRange::parse("2026-01-01/2026-10-15", '/').unwrap();
        assert_eq!(r.to_stac(), "2026-01-01T00:00:00Z/2026-10-15T23:59:59Z");
        let r = TimeRange::parse("2026-01-01,..", ',').unwrap();
        assert_eq!(r.to_cmr(), "2026-01-01T00:00:00Z,");
        assert!(TimeRange::parse("2026-10-15/2026-01-01", '/').is_err());
        assert!(TimeRange::parse("yesterday/today", '/').is_err());
        assert!(TimeRange::parse("../..", '/').is_err());
    }

    #[test]
    fn fractional_seconds_are_preserved() {
        let r = TimeRange::parse("2026-01-01T00:00:00Z/2026-01-01T00:00:00.500Z", '/').unwrap();
        assert_eq!(r.to_stac(), "2026-01-01T00:00:00Z/2026-01-01T00:00:00.500Z");
        let r = TimeRange::parse("2026-01-01T00:00:00.25+01:00,..", ',').unwrap();
        assert_eq!(r.to_cmr(), "2025-12-31T23:00:00.250Z,");
        assert!(TimeRange::parse("2026-01-01T00:00:00.5Z/2026-01-01T00:00:00Z", '/').is_err());
    }
}
