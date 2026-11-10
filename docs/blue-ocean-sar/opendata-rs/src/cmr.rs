//! NASA CMR granule search with `CMR-Search-After` paging.

use anyhow::{bail, Context, Result};
use serde::Serialize;
use serde_json::Value;
use url::Url;

use crate::geo::{Bbox, TimeRange};
use crate::net::{Fetcher, Request, Secret};

pub const CMR_GRANULES_URL: &str = "https://cmr.earthdata.nasa.gov/search/granules.json";
pub const EARTHDATA_TOKEN_ENV: &str = "EARTHDATA_TOKEN";
/// CMR's maximum page size.
pub const CMR_MAX_PAGE_SIZE: usize = 2000;

#[derive(Debug, Clone)]
pub struct GranuleParams {
    pub short_name: String,
    pub version: Option<String>,
    pub provider: Option<String>,
    pub bbox: Option<Bbox>,
    pub temporal: Option<TimeRange>,
    pub page_size: usize,
    pub limit: Option<usize>,
    pub max_pages: usize,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct GranuleSummary {
    pub id: String,
    pub title: Option<String>,
    pub producer_granule_id: Option<String>,
    pub time_start: Option<String>,
    pub time_end: Option<String>,
    pub data_links: Vec<String>,
}

#[derive(Debug, Clone, Default)]
pub struct GranuleOutcome {
    pub granules: Vec<GranuleSummary>,
    pub hits: Option<u64>,
    pub pages: usize,
    pub truncated: bool,
}

pub fn validate_short_name(s: &str) -> Result<()> {
    if s.is_empty()
        || s.len() > 80
        || !s
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"_-.".contains(&b))
    {
        bail!("short name {s:?} must be 1-80 chars of [A-Za-z0-9_.-]");
    }
    Ok(())
}

pub fn build_url(base: &Url, p: &GranuleParams) -> Url {
    let mut u = base.clone();
    {
        let mut q = u.query_pairs_mut();
        q.append_pair("short_name", &p.short_name);
        if let Some(v) = &p.version {
            q.append_pair("version", v);
        }
        if let Some(v) = &p.provider {
            q.append_pair("provider", v);
        }
        if let Some(b) = p.bbox {
            q.append_pair("bounding_box", &b.to_csv());
        }
        if let Some(t) = &p.temporal {
            q.append_pair("temporal", &t.to_cmr());
        }
        q.append_pair(
            "page_size",
            &p.page_size.clamp(1, CMR_MAX_PAGE_SIZE).to_string(),
        );
    }
    u
}

pub fn summarise(entry: &Value) -> Option<GranuleSummary> {
    let s = |k: &str| entry.get(k).and_then(Value::as_str).map(str::to_string);
    let data_links = entry
        .get("links")
        .and_then(Value::as_array)
        .map(|ls| {
            ls.iter()
                .filter(|l| {
                    l.get("rel")
                        .and_then(Value::as_str)
                        .is_some_and(|r| r.ends_with("/data#"))
                })
                // Added (review 2026-10-16): skip collection-level links CMR copies into each granule (`"inherited": true`).
                .filter(|l| l.get("inherited").and_then(Value::as_bool) != Some(true))
                .filter_map(|l| l.get("href").and_then(Value::as_str).map(str::to_string))
                .collect()
        })
        .unwrap_or_default();
    Some(GranuleSummary {
        id: s("id")?,
        title: s("title"),
        producer_granule_id: s("producer_granule_id"),
        time_start: s("time_start"),
        time_end: s("time_end"),
        data_links,
    })
}

pub async fn search(
    fetcher: &Fetcher,
    base: &Url,
    p: &GranuleParams,
    token: Option<&Secret>,
) -> Result<GranuleOutcome> {
    validate_short_name(&p.short_name)?;
    let url = build_url(base, p);
    let mut out = GranuleOutcome::default();
    let mut search_after: Option<String> = None;
    loop {
        let mut req = Request::get(url.clone());
        if let Some(t) = token {
            req = req.secret_header(
                "authorization",
                &Secret::new(format!("Bearer {}", t.expose())),
            )?;
        }
        if let Some(sa) = &search_after {
            req = req.header("cmr-search-after", sa)?;
        }
        let resp = fetcher.send(&req).await?;
        out.pages += 1;
        if out.hits.is_none() {
            out.hits = resp.header_str("cmr-hits").and_then(|h| h.parse().ok());
        }
        let v: Value = resp.json()?;
        let entries = v
            .pointer("/feed/entry")
            .and_then(Value::as_array)
            .context("CMR response has no feed.entry array")?;
        for e in entries {
            if let Some(g) = summarise(e) {
                out.granules.push(g);
                if p.limit.is_some_and(|l| out.granules.len() >= l) {
                    return Ok(out);
                }
            }
        }
        let next = resp.header_str("cmr-search-after").map(str::to_string);
        match next {
            Some(n) if !entries.is_empty() => {
                if search_after.as_deref() == Some(n.as_str()) {
                    bail!("CMR returned the same CMR-Search-After token twice");
                }
                if out.pages >= p.max_pages {
                    out.truncated = true;
                    return Ok(out);
                }
                search_after = Some(n);
            }
            _ => return Ok(out),
        }
        if out.hits.is_some_and(|h| out.granules.len() as u64 >= h) {
            return Ok(out);
        }
    }
}
