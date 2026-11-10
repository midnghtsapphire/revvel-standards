//! OpenTrafficCamMap (github.com/AidanWelch/OpenTrafficCamMap) radius search.
//!
//! The catalogue is a JSON tree `{state: {county: [camera, ...]}}` per
//! country. We only read the catalogue; camera stream URLs are reported but
//! never fetched (they point at many third-party hosts).

use anyhow::{bail, Context, Result};
use serde::Serialize;
use serde_json::Value;
use url::Url;

use crate::geo::{haversine_km, validate_lat_lon};
use crate::net::{Fetcher, Request};

pub const CATALOGUE_HOST: &str = "raw.githubusercontent.com";
pub const CATALOGUE_BASE: &str =
    "https://raw.githubusercontent.com/AidanWelch/OpenTrafficCamMap/master/cameras/";

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct CameraHit {
    pub distance_km: f64,
    pub region: Vec<String>,
    pub description: Option<String>,
    pub latitude: f64,
    pub longitude: f64,
    pub direction: Option<String>,
    pub url: Option<String>,
    pub format: Option<String>,
}

pub fn validate_country(c: &str) -> Result<()> {
    if c.len() < 2
        || c.len() > 40
        || !c
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
    {
        bail!("country {c:?} must be 2-40 chars of [A-Za-z0-9_-] (e.g. USA)");
    }
    Ok(())
}

pub fn catalogue_url(base: &Url, country: &str) -> Result<Url> {
    validate_country(country)?;
    base.join(&format!("{country}.json"))
        .context("building catalogue URL")
}

fn walk(v: &Value, path: &mut Vec<String>, f: &mut dyn FnMut(&[String], &Value)) {
    match v {
        Value::Object(m) => {
            if m.contains_key("latitude") && m.contains_key("longitude") {
                f(path, v);
                return;
            }
            for (k, child) in m {
                path.push(k.clone());
                walk(child, path, f);
                path.pop();
            }
        }
        Value::Array(a) => a.iter().for_each(|c| walk(c, path, f)),
        _ => {}
    }
}

fn num(v: Option<&Value>) -> Option<f64> {
    match v? {
        Value::Number(n) => n.as_f64(),
        Value::String(s) => s.trim().parse().ok(),
        _ => None,
    }
    .filter(|f: &f64| f.is_finite())
}

/// Pure search over an already-parsed catalogue.
pub fn near(
    catalogue: &Value,
    lat: f64,
    lon: f64,
    radius_km: f64,
    limit: usize,
) -> Result<Vec<CameraHit>> {
    validate_lat_lon(lat, lon)?;
    if !(radius_km.is_finite() && radius_km > 0.0) {
        bail!("radius must be a positive number of km");
    }
    let mut hits = Vec::new();
    walk(catalogue, &mut Vec::new(), &mut |path, cam| {
        let (Some(clat), Some(clon)) = (num(cam.get("latitude")), num(cam.get("longitude"))) else {
            return;
        };
        if validate_lat_lon(clat, clon).is_err() {
            return;
        }
        let d = haversine_km(lat, lon, clat, clon);
        if d <= radius_km {
            let s = |k: &str| cam.get(k).and_then(Value::as_str).map(str::to_string);
            hits.push(CameraHit {
                distance_km: (d * 1000.0).round() / 1000.0,
                region: path.to_vec(),
                description: s("description"),
                latitude: clat,
                longitude: clon,
                direction: s("direction"),
                url: s("url"),
                format: s("format"),
            });
        }
    });
    hits.sort_by(|a, b| a.distance_km.total_cmp(&b.distance_km));
    hits.truncate(limit);
    Ok(hits)
}

pub async fn fetch_and_search(
    fetcher: &Fetcher,
    base: &Url,
    country: &str,
    lat: f64,
    lon: f64,
    radius_km: f64,
    limit: usize,
) -> Result<Vec<CameraHit>> {
    let url = catalogue_url(base, country)?;
    let v: Value = fetcher.send(&Request::get(url)).await?.json()?;
    near(&v, lat, lon, radius_km, limit)
}
