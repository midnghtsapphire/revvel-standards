//! ArcGIS REST layer query with concurrent `resultOffset` paging.

use anyhow::{bail, Context, Result};
use futures::stream::{self, StreamExt, TryStreamExt};
use serde_json::Value;
use url::Url;

use crate::esri;
use crate::geo::Bbox;
use crate::net::{Fetcher, Request};

/// Validate a layer URL: https, and the path ends in
/// `/FeatureServer/<n>` or `/MapServer/<n>` (optional trailing slash).
pub fn validate_layer_url(s: &str) -> Result<Url> {
    let u = Url::parse(s.trim()).with_context(|| format!("{s:?} is not a URL"))?;
    if u.scheme() != "https" {
        bail!("layer URL must use https");
    }
    check_layer_path(&u)?;
    Ok(u)
}

/// Structural check shared by the CLI and tests (scheme is enforced by the
/// fetcher's host policy).
pub fn check_layer_path(u: &Url) -> Result<()> {
    if u.query().is_some() || u.fragment().is_some() {
        bail!("layer URL must not carry a query string or fragment");
    }
    if !u.username().is_empty() || u.password().is_some() {
        bail!("layer URL must not embed credentials");
    }
    let segs: Vec<&str> = u
        .path_segments()
        .map(|s| s.filter(|p| !p.is_empty()).collect())
        .unwrap_or_default();
    let n = segs.len();
    let ok = n >= 2
        && (segs[n - 2].eq_ignore_ascii_case("FeatureServer")
            || segs[n - 2].eq_ignore_ascii_case("MapServer"))
        && !segs[n - 1].is_empty()
        && segs[n - 1].len() <= 6
        && segs[n - 1].bytes().all(|b| b.is_ascii_digit());
    if !ok {
        bail!(
            "layer URL must end in /FeatureServer/<n> or /MapServer/<n>, got path {:?}",
            u.path()
        );
    }
    Ok(())
}

#[derive(Debug, Clone)]
pub struct QueryParams {
    pub where_clause: String,
    pub out_fields: String,
    pub bbox: Option<Bbox>,
    /// Ask the server for `f=geojson` instead of converting Esri JSON locally.
    pub server_geojson: bool,
    /// Upper bound on page size (the layer's maxRecordCount also applies).
    pub page_size: usize,
    pub concurrency: usize,
    pub max_features: usize,
}

#[derive(Debug, Clone)]
pub struct LayerInfo {
    pub max_record_count: usize,
    pub object_id_field: Option<String>,
    pub supports_pagination: bool,
}

#[derive(Debug, Clone)]
pub struct QueryOutcome {
    pub collection: Value,
    pub expected_count: Option<usize>,
    pub pages: usize,
}

fn layer_base(layer: &Url) -> Url {
    let mut u = layer.clone();
    let p = u.path().trim_end_matches('/').to_string();
    u.set_path(&p);
    u
}

fn query_url(layer: &Url) -> Url {
    let mut u = layer_base(layer);
    let p = format!("{}/query", u.path());
    u.set_path(&p);
    u
}

/// ArcGIS often answers errors with HTTP 200 and `{"error": {...}}`.
fn check_arcgis_error(v: &Value, what: &str) -> Result<()> {
    if let Some(e) = v.get("error") {
        let code = e.get("code").map(|c| c.to_string()).unwrap_or_default();
        let msg = e
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("unknown error");
        bail!("ArcGIS {what} error {code}: {msg}");
    }
    Ok(())
}

pub async fn layer_info(fetcher: &Fetcher, layer: &Url) -> Result<LayerInfo> {
    let mut u = layer_base(layer);
    u.query_pairs_mut().append_pair("f", "json");
    let v: Value = fetcher.send(&Request::get(u)).await?.json()?;
    check_arcgis_error(&v, "layer metadata")?;
    let oid = v
        .get("objectIdField")
        .and_then(Value::as_str)
        .map(str::to_string)
        .or_else(|| {
            v.get("fields")?
                .as_array()?
                .iter()
                .find(|f| f.get("type").and_then(Value::as_str) == Some("esriFieldTypeOID"))?
                .get("name")?
                .as_str()
                .map(str::to_string)
        });
    Ok(LayerInfo {
        max_record_count: v
            .get("maxRecordCount")
            .and_then(Value::as_u64)
            .map(|n| n as usize)
            .filter(|n| *n > 0)
            .unwrap_or(1000),
        object_id_field: oid,
        // supports_pagination: v
        //     .pointer("/advancedQueryCapabilities/supportsPagination")
        //     .and_then(Value::as_bool)
        //     .unwrap_or(true),
        // Replaced (review 2026-10-16): only an explicit `true` permits offset paging; older layers omit the capability and ignore resultOffset.
        supports_pagination: v
            .pointer("/advancedQueryCapabilities/supportsPagination")
            .and_then(Value::as_bool)
            .unwrap_or(false),
    })
}

fn base_query(u: &mut Url, p: &QueryParams) {
    let mut q = u.query_pairs_mut();
    q.append_pair("where", &p.where_clause);
    if let Some(b) = p.bbox {
        q.append_pair("geometry", &b.to_csv())
            .append_pair("geometryType", "esriGeometryEnvelope")
            .append_pair("inSR", "4326")
            .append_pair("spatialRel", "esriSpatialRelIntersects");
    }
}

pub async fn count(fetcher: &Fetcher, layer: &Url, p: &QueryParams) -> Result<Option<usize>> {
    let mut u = query_url(layer);
    base_query(&mut u, p);
    u.query_pairs_mut()
        .append_pair("returnCountOnly", "true")
        .append_pair("f", "json");
    let v: Value = fetcher.send(&Request::get(u)).await?.json()?;
    check_arcgis_error(&v, "count")?;
    Ok(v.get("count").and_then(Value::as_u64).map(|n| n as usize))
}

struct Page {
    offset: usize,
    features: Vec<Value>,
    exceeded: bool,
}

async fn fetch_page(
    fetcher: &Fetcher,
    layer: &Url,
    p: &QueryParams,
    info: &LayerInfo,
    offset: usize,
    size: usize,
    paginate: bool,
) -> Result<Page> {
    let mut u = query_url(layer);
    base_query(&mut u, p);
    {
        let mut q = u.query_pairs_mut();
        q.append_pair("outFields", &p.out_fields)
            .append_pair("returnGeometry", "true")
            .append_pair("outSR", "4326")
            .append_pair("f", if p.server_geojson { "geojson" } else { "json" });
        if paginate {
            q.append_pair("resultOffset", &offset.to_string())
                .append_pair("resultRecordCount", &size.to_string());
            if let Some(oid) = &info.object_id_field {
                // A stable order is required for offset paging to be correct.
                q.append_pair("orderByFields", oid);
            }
        }
    }
    let v: Value = fetcher.send(&Request::get(u)).await?.json()?;
    check_arcgis_error(&v, "query")?;
    let exceeded = v
        .get("exceededTransferLimit")
        .or_else(|| v.pointer("/properties/exceededTransferLimit"))
        .and_then(Value::as_bool)
        .unwrap_or(false);
    // let raw = v
    //     .get("features")
    //     .and_then(Value::as_array)
    //     .cloned()
    //     .unwrap_or_default();
    // Replaced (review 2026-10-16): a response without a features array is malformed, not an empty page.
    let raw = v
        .get("features")
        .and_then(Value::as_array)
        .cloned()
        .context("ArcGIS query response has no features array")?;
    let features = if p.server_geojson {
        raw
    } else {
        raw.iter()
            .map(|f| esri::feature_to_geojson(f, info.object_id_field.as_deref()))
            .collect()
    };
    Ok(Page {
        offset,
        features,
        exceeded,
    })
}

/// Query a layer and return a GeoJSON FeatureCollection.
///
/// Plan: read `maxRecordCount`, get the total with `returnCountOnly`, then
/// fetch all `resultOffset` windows concurrently (bounded by
/// `concurrency`). If a page comes back short with `exceededTransferLimit`
/// (server cap lower than advertised), the gap is filled sequentially. If
/// the count is unavailable, page sequentially until `exceededTransferLimit`
/// is false.
pub async fn query(fetcher: &Fetcher, layer: &Url, p: &QueryParams) -> Result<QueryOutcome> {
    check_layer_path(layer)?;
    let info = layer_info(fetcher, layer).await?;
    let page_size = p.page_size.min(info.max_record_count).max(1);
    let concurrency = p.concurrency.max(1);
    let mut pages_fetched = 0usize;

    if !info.supports_pagination {
        let page = fetch_page(fetcher, layer, p, &info, 0, page_size, false).await?;
        if page.exceeded {
            bail!(
                "layer does not support pagination and the result exceeded the transfer limit; \
                 narrow --where/--bbox"
            );
        }
        // Added (review 2026-10-16): the single-request path must honour --max-features too.
        if page.features.len() > p.max_features {
            bail!(
                "query returned {} features, above --max-features {}",
                page.features.len(),
                p.max_features
            );
        }
        return Ok(QueryOutcome {
            collection: esri::feature_collection(page.features),
            expected_count: None,
            pages: 1,
        });
    }

    let total = count(fetcher, layer, p).await?;
    let mut features: Vec<Value> = Vec::new();

    match total {
        Some(total) => {
            if total > p.max_features {
                bail!(
                    "query matches {total} features, above --max-features {}",
                    p.max_features
                );
            }
            let offsets: Vec<usize> = (0..total).step_by(page_size).collect();
            let mut pages: Vec<Page> = stream::iter(offsets)
                .map(|off| {
                    fetch_page(
                        fetcher,
                        layer,
                        p,
                        &info,
                        off,
                        page_size.min(total - off),
                        true,
                    )
                })
                .buffer_unordered(concurrency)
                .try_collect()
                .await?;
            pages_fetched += pages.len();
            pages.sort_by_key(|pg| pg.offset);
            for mut pg in pages {
                let want = page_size.min(total - pg.offset);
                // Server returned fewer than asked: fill the window.
                while pg.features.len() < want && pg.exceeded {
                    let got = pg.features.len();
                    let more =
                        fetch_page(fetcher, layer, p, &info, pg.offset + got, want - got, true)
                            .await?;
                    pages_fetched += 1;
                    if more.features.is_empty() {
                        break;
                    }
                    pg.exceeded = more.exceeded;
                    pg.features.extend(more.features);
                }
                features.extend(pg.features);
            }
        }
        None => {
            let mut offset = 0;
            loop {
                let pg = fetch_page(fetcher, layer, p, &info, offset, page_size, true).await?;
                pages_fetched += 1;
                let n = pg.features.len();
                features.extend(pg.features);
                if features.len() > p.max_features {
                    bail!("more than --max-features {} features", p.max_features);
                }
                if !pg.exceeded || n == 0 {
                    break;
                }
                offset += n;
            }
        }
    }

    Ok(QueryOutcome {
        collection: esri::feature_collection(features),
        expected_count: total,
        pages: pages_fetched,
    })
}
