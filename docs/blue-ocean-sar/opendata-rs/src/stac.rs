//! STAC API item search (`POST /search`) with `next`-link paging.

use std::collections::BTreeMap;

use anyhow::{bail, Context, Result};
use serde::Serialize;
use serde_json::{json, Map, Value};
use url::Url;

use crate::geo::{Bbox, TimeRange};
// use crate::net::{Fetcher, Request, Secret};
// Replaced (review 2026-10-16): allow-list entries are port-aware.
use crate::net::{policy_entry, Fetcher, Request, Secret};

/// Environment variable holding an optional Planetary Computer key.
pub const PC_KEY_ENV: &str = "PC_SDK_SUBSCRIPTION_KEY";

#[derive(Debug, Clone, PartialEq)]
pub enum Catalog {
    EarthSearch,
    PlanetaryComputer,
    Cdse,
    Custom(Url),
}

impl Catalog {
    pub fn parse(s: &str) -> Result<Self> {
        Ok(match s {
            "earth-search" => Catalog::EarthSearch,
            "planetary-computer" | "pc" => Catalog::PlanetaryComputer,
            "cdse" => Catalog::Cdse,
            other => {
                let u = Url::parse(other)
                    .with_context(|| format!("--catalog must be earth-search|planetary-computer|cdse or a URL, got {other:?}"))?;
                if u.scheme() != "https" {
                    bail!("custom STAC catalog must use https");
                }
                Catalog::Custom(u)
            }
        })
    }

    pub fn search_url(&self) -> Url {
        let s = match self {
            Catalog::EarthSearch => "https://earth-search.aws.element84.com/v1/search",
            Catalog::PlanetaryComputer => {
                "https://planetarycomputer.microsoft.com/api/stac/v1/search"
            }
            Catalog::Cdse => "https://stac.dataspace.copernicus.eu/v1/search",
            Catalog::Custom(u) => {
                let mut u = u.clone();
                if !u.path().trim_end_matches('/').ends_with("/search") {
                    let p = format!("{}/search", u.path().trim_end_matches('/'));
                    u.set_path(&p);
                }
                return u;
            }
        };
        Url::parse(s).expect("static URL")
    }

    /// Hosts this catalogue may talk to (redirects included).
    pub fn allowed_hosts(&self) -> Vec<String> {
        // match self.search_url().host_str() {
        //     Some(h) => vec![h.to_string()],
        //     None => vec![],
        // }
        // Replaced (review 2026-10-16): built-in catalogs admit only the default port; a custom catalog keeps the port it names.
        policy_entry(&self.search_url()).into_iter().collect()
    }

    /// CDSE's STAC implements CQL2 filtering rather than the `query` extension.
    fn uses_cql2(&self) -> bool {
        matches!(self, Catalog::Cdse)
    }
}

#[derive(Debug, Clone)]
pub struct SearchParams {
    pub collections: Vec<String>,
    pub bbox: Bbox,
    pub datetime: TimeRange,
    pub max_cloud: Option<f64>,
    /// Stop after this many items (after client-side filtering).
    pub limit: Option<usize>,
    pub page_size: usize,
    pub max_pages: usize,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct ItemSummary {
    pub id: String,
    pub collection: Option<String>,
    pub datetime: Option<String>,
    pub cloud_cover: Option<f64>,
    pub assets: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Default)]
pub struct SearchOutcome {
    pub items: Vec<ItemSummary>,
    pub pages: usize,
    /// Items the server returned that failed the client-side cloud check.
    pub dropped_by_cloud_filter: usize,
    /// True if paging stopped because `max_pages` was reached.
    pub truncated: bool,
}

pub fn build_body(cat: &Catalog, p: &SearchParams) -> Value {
    let mut body = json!({
        "collections": p.collections,
        "bbox": p.bbox.to_array(),
        "datetime": p.datetime.to_stac(),
        "limit": p.page_size,
    });
    if let Some(mc) = p.max_cloud {
        if cat.uses_cql2() {
            body["filter-lang"] = json!("cql2-json");
            body["filter"] = json!({"op": "<=", "args": [{"property": "eo:cloud_cover"}, mc]});
        } else {
            body["query"] = json!({"eo:cloud_cover": {"lte": mc}});
        }
    }
    body
}

pub fn summarise(item: &Value) -> Option<ItemSummary> {
    let id = item.get("id")?.as_str()?.to_string();
    let props = item.get("properties");
    let assets = item
        .get("assets")
        .and_then(Value::as_object)
        .map(|m| {
            m.iter()
                .filter_map(|(k, a)| Some((k.clone(), a.get("href")?.as_str()?.to_string())))
                .collect()
        })
        .unwrap_or_default();
    Some(ItemSummary {
        id,
        collection: item
            .get("collection")
            .and_then(Value::as_str)
            .map(str::to_string),
        datetime: props
            .and_then(|p| p.get("datetime"))
            .and_then(Value::as_str)
            .map(str::to_string),
        cloud_cover: props
            .and_then(|p| p.get("eo:cloud_cover"))
            .and_then(Value::as_f64),
        assets,
    })
}

fn merge(base: &Value, patch: &Value) -> Value {
    let mut out = base.as_object().cloned().unwrap_or_default();
    if let Some(p) = patch.as_object() {
        for (k, v) in p {
            out.insert(k.clone(), v.clone());
        }
    }
    Value::Object(out)
}

/// Build the follow-up request from a STAC `next` link. POST links may carry
/// a `body` and `merge` flag (STAC API Item Search, "Paging" section).
pub fn next_request(
    link: &Map<String, Value>,
    original_body: &Value,
    auth: Option<&Secret>,
) -> Result<Request> {
    let href = link
        .get("href")
        .and_then(Value::as_str)
        .context("next link has no href")?;
    let url = Url::parse(href)
        .with_context(|| format!("next link href {href:?} is not an absolute URL"))?;
    let method = link
        .get("method")
        .and_then(Value::as_str)
        .unwrap_or("GET")
        .to_ascii_uppercase();
    let req = match method.as_str() {
        "POST" => {
            let merge_flag = link.get("merge").and_then(Value::as_bool).unwrap_or(false);
            let body = match link.get("body") {
                Some(b) if merge_flag => merge(original_body, b),
                Some(b) => b.clone(),
                None => original_body.clone(),
            };
            Request::post_json(url, &body)
        }
        "GET" => Request::get(url),
        m => bail!("unsupported next-link method {m}"),
    };
    attach_auth(req, auth)
}

fn attach_auth(req: Request, auth: Option<&Secret>) -> Result<Request> {
    match auth {
        Some(k) => req.secret_header("ocp-apim-subscription-key", k),
        None => Ok(req),
    }
}

/// The credential to send to `cat`: the Planetary Computer key goes to
/// Planetary Computer only, never to any other catalog.
pub fn auth_for<'a>(cat: &Catalog, auth: Option<&'a Secret>) -> Option<&'a Secret> {
    auth.filter(|_| matches!(cat, Catalog::PlanetaryComputer))
}

/// The first search request (body plus any credential `cat` may receive).
pub fn initial_request(cat: &Catalog, p: &SearchParams, auth: Option<&Secret>) -> Result<Request> {
    attach_auth(
        Request::post_json(cat.search_url(), &build_body(cat, p)),
        auth_for(cat, auth),
    )
}

/// Run the search. `auth` is sent only for Planetary Computer.
pub async fn search(
    fetcher: &Fetcher,
    cat: &Catalog,
    p: &SearchParams,
    auth: Option<&Secret>,
) -> Result<SearchOutcome> {
    let body = build_body(cat, p);
    // let mut req = attach_auth(Request::post_json(cat.search_url(), &body), auth)?;
    // Replaced (review 2026-10-16): the doc promised PC-only auth but any catalog received the key; gate it here.
    let auth = auth_for(cat, auth);
    let mut req = initial_request(cat, p, auth)?;
    let mut out = SearchOutcome::default();
    let mut seen_requests: Vec<(String, Option<Vec<u8>>)> = Vec::new();
    loop {
        let key = (
            req.url.to_string(),
            req.body.as_ref().map(|(b, _)| b.clone()),
        );
        if seen_requests.contains(&key) {
            bail!(
                "STAC next link loops back to an already-fetched page ({})",
                req.url
            );
        }
        seen_requests.push(key);

        let resp = fetcher.send(&req).await?;
        out.pages += 1;
        let fc: Value = resp.json()?;
        if fc.get("type").and_then(Value::as_str) != Some("FeatureCollection") {
            bail!(
                "STAC search response from {} is not a FeatureCollection",
                resp.url
            );
        }
        // let features = fc
        //     .get("features")
        //     .and_then(Value::as_array)
        //     .cloned()
        //     .unwrap_or_default();
        // Replaced (review 2026-10-16): a FeatureCollection without a features array is malformed, not empty.
        let features = fc
            .get("features")
            .and_then(Value::as_array)
            .cloned()
            .with_context(|| {
                format!(
                    "STAC search response from {} has no features array",
                    crate::evidence::redact_url(&resp.url)
                )
            })?;
        for f in &features {
            let Some(s) = summarise(f) else { continue };
            if let (Some(max), Some(cc)) = (p.max_cloud, s.cloud_cover) {
                if cc > max {
                    out.dropped_by_cloud_filter += 1;
                    continue;
                }
            }
            out.items.push(s);
            if p.limit.is_some_and(|l| out.items.len() >= l) {
                return Ok(out);
            }
        }
        let next = fc
            .get("links")
            .and_then(Value::as_array)
            .and_then(|ls| {
                ls.iter()
                    .find(|l| l.get("rel").and_then(Value::as_str) == Some("next"))
            })
            .and_then(Value::as_object);
        let Some(next) = next else { return Ok(out) };
        if features.is_empty() {
            return Ok(out); // defensive: a next link on an empty page
        }
        if out.pages >= p.max_pages {
            out.truncated = true;
            return Ok(out);
        }
        req = next_request(next, &body, auth)?;
    }
}
