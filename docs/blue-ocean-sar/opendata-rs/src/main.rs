use std::io::Write;
use std::path::PathBuf;
use std::process::ExitCode;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{bail, Context, Result};
use clap::{Args, Parser, Subcommand};
use url::Url;

use opendata::evidence::{verify_manifest, EvidenceLog};
use opendata::geo::{Bbox, TimeRange};
use opendata::net::{Fetcher, FetcherConfig, HostPolicy, RetryConfig, Secret};
use opendata::{arcgis, cams, cmr, stac};

#[derive(Parser)]
#[command(
    name = "opendata",
    version,
    about = "Evidence-grade open-data fetcher (STAC, ArcGIS, CMR, traffic cams)"
)]
struct Cli {
    #[command(flatten)]
    global: Global,
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Args)]
struct Global {
    /// Save raw responses + a hash-chained manifest.jsonl into this directory.
    #[arg(long, global = true)]
    evidence_dir: Option<PathBuf>,
    /// Per-request timeout in seconds.
    #[arg(long, global = true, default_value_t = 60)]
    timeout: u64,
    /// Retries on 429/5xx/transport errors (exponential backoff).
    #[arg(long, global = true, default_value_t = 4)]
    retries: u32,
    /// Max concurrent requests for multi-page fetches.
    #[arg(long, global = true, default_value_t = 4)]
    concurrency: usize,
    /// Extra PEM CA bundle (default: $OPENDATA_CA_BUNDLE, then $SSL_CERT_FILE).
    #[arg(long, global = true)]
    ca_bundle: Option<PathBuf>,
}

#[derive(Subcommand)]
enum Cmd {
    /// STAC API item search.
    Stac {
        #[command(subcommand)]
        cmd: StacCmd,
    },
    /// ArcGIS REST FeatureServer / MapServer layer query.
    Arcgis {
        #[command(subcommand)]
        cmd: ArcgisCmd,
    },
    /// NASA CMR search.
    Cmr {
        #[command(subcommand)]
        cmd: CmrCmd,
    },
    /// OpenTrafficCamMap public camera catalogue.
    Cams {
        #[command(subcommand)]
        cmd: CamsCmd,
    },
    /// Evidence manifest tools.
    Evidence {
        #[command(subcommand)]
        cmd: EvidenceCmd,
    },
}

#[derive(Subcommand)]
enum StacCmd {
    /// POST /search and follow `next` links; prints JSON lines.
    Search {
        /// earth-search | planetary-computer | cdse | https URL of a STAC API root
        #[arg(long)]
        catalog: String,
        /// Comma-separated collection ids.
        #[arg(long, value_delimiter = ',', required = true)]
        collections: Vec<String>,
        /// minlon,minlat,maxlon,maxlat
        #[arg(long, allow_hyphen_values = true)]
        bbox: String,
        /// start/end (YYYY-MM-DD or RFC 3339; `..` for open)
        #[arg(long)]
        datetime: String,
        /// Maximum eo:cloud_cover percentage (server filter + client re-check).
        #[arg(long)]
        max_cloud: Option<f64>,
        /// Stop after N items.
        #[arg(long)]
        limit: Option<usize>,
        #[arg(long, default_value_t = 100)]
        page_size: usize,
        #[arg(long, default_value_t = 50)]
        max_pages: usize,
    },
}

#[derive(Subcommand)]
enum ArcgisCmd {
    /// Query a layer and print a GeoJSON FeatureCollection.
    Query {
        /// https://.../FeatureServer/<n> or https://.../MapServer/<n>
        #[arg(long)]
        url: String,
        #[arg(long = "where", default_value = "1=1")]
        where_clause: String,
        #[arg(long, default_value = "*")]
        out_fields: String,
        /// minlon,minlat,maxlon,maxlat (WGS84)
        #[arg(long, allow_hyphen_values = true)]
        bbox: Option<String>,
        /// Ask the server for f=geojson instead of converting Esri JSON locally.
        #[arg(long)]
        geojson: bool,
        #[arg(long, default_value_t = 2000)]
        page_size: usize,
        #[arg(long, default_value_t = 100_000)]
        max_features: usize,
        /// Write the FeatureCollection here instead of stdout.
        #[arg(long)]
        out: Option<PathBuf>,
    },
}

#[derive(Subcommand)]
enum CmrCmd {
    /// Granule search; prints JSON lines. Token: $EARTHDATA_TOKEN (optional).
    Granules {
        #[arg(long)]
        short_name: String,
        #[arg(long)]
        version: Option<String>,
        #[arg(long)]
        provider: Option<String>,
        #[arg(long, allow_hyphen_values = true)]
        bbox: Option<String>,
        /// start,end (YYYY-MM-DD or RFC 3339)
        #[arg(long)]
        temporal: Option<String>,
        #[arg(long, default_value_t = 500)]
        page_size: usize,
        #[arg(long)]
        limit: Option<usize>,
        #[arg(long, default_value_t = 50)]
        max_pages: usize,
    },
}

#[derive(Subcommand)]
enum CamsCmd {
    /// Cameras within a radius of a point, nearest first; prints JSON lines.
    Near {
        /// Catalogue file name, e.g. USA
        #[arg(long, default_value = "USA")]
        country: String,
        #[arg(long, allow_hyphen_values = true)]
        lat: f64,
        #[arg(long, allow_hyphen_values = true)]
        lon: f64,
        #[arg(long, default_value_t = 10.0)]
        radius_km: f64,
        #[arg(long, default_value_t = 50)]
        limit: usize,
    },
}

#[derive(Subcommand)]
enum EvidenceCmd {
    /// Verify the hash chain and every stored object. Exit 1 on any mismatch.
    Verify {
        #[arg(long)]
        dir: PathBuf,
    },
}

fn read_ca(global: &Global) -> Result<Option<Vec<u8>>> {
    let path = global
        .ca_bundle
        .clone()
        .or_else(|| std::env::var_os("OPENDATA_CA_BUNDLE").map(PathBuf::from))
        .or_else(|| std::env::var_os("SSL_CERT_FILE").map(PathBuf::from));
    match path {
        Some(p) => {
            Ok(Some(std::fs::read(&p).with_context(|| {
                format!("reading CA bundle {}", p.display())
            })?))
        }
        None => Ok(None),
    }
}

async fn fetcher(global: &Global, hosts: Vec<String>) -> Result<Fetcher> {
    let mut cfg = FetcherConfig::new(HostPolicy::new(hosts));
    cfg.timeout = Duration::from_secs(global.timeout.max(1));
    cfg.retry = RetryConfig {
        max_retries: global.retries,
        ..RetryConfig::default()
    };
    cfg.extra_roots_pem = read_ca(global)?;
    if let Some(dir) = &global.evidence_dir {
        cfg.evidence = Some(Arc::new(EvidenceLog::open(dir).await?));
    }
    Fetcher::new(cfg)
}

fn print_lines<T: serde::Serialize>(items: &[T]) -> Result<()> {
    let stdout = std::io::stdout();
    let mut out = std::io::BufWriter::new(stdout.lock());
    for it in items {
        serde_json::to_writer(&mut out, it)?;
        out.write_all(b"\n")?;
    }
    out.flush()?;
    Ok(())
}

async fn run(cli: Cli) -> Result<()> {
    let g = &cli.global;
    match cli.cmd {
        Cmd::Stac {
            cmd:
                StacCmd::Search {
                    catalog,
                    collections,
                    bbox,
                    datetime,
                    max_cloud,
                    limit,
                    page_size,
                    max_pages,
                },
        } => {
            let cat = stac::Catalog::parse(&catalog)?;
            if let Some(mc) = max_cloud {
                if !(0.0..=100.0).contains(&mc) {
                    bail!("--max-cloud must be within 0..=100");
                }
            }
            let params = stac::SearchParams {
                collections,
                bbox: Bbox::parse(&bbox)?,
                datetime: TimeRange::parse(&datetime, '/')?,
                max_cloud,
                limit,
                page_size: page_size.clamp(1, 1000),
                max_pages: max_pages.max(1),
            };
            let key = match cat {
                stac::Catalog::PlanetaryComputer => Secret::from_env(stac::PC_KEY_ENV),
                _ => None,
            };
            let f = fetcher(g, cat.allowed_hosts()).await?;
            let res = stac::search(&f, &cat, &params, key.as_ref()).await?;
            print_lines(&res.items)?;
            eprintln!(
                "stac: {} item(s) over {} page(s); {} dropped by client cloud check{}",
                res.items.len(),
                res.pages,
                res.dropped_by_cloud_filter,
                if res.truncated {
                    "; TRUNCATED at --max-pages"
                } else {
                    ""
                }
            );
        }
        Cmd::Arcgis {
            cmd:
                ArcgisCmd::Query {
                    url,
                    where_clause,
                    out_fields,
                    bbox,
                    geojson,
                    page_size,
                    max_features,
                    out,
                },
        } => {
            let layer = arcgis::validate_layer_url(&url)?;
            // let host = layer
            //     .host_str()
            //     .context("layer URL has no host")?
            //     .to_string();
            // Replaced (review 2026-10-16): the allow-list is port-aware, so admit the port the user named.
            let host = opendata::net::policy_entry(&layer).context("layer URL has no host")?;
            let params = arcgis::QueryParams {
                where_clause,
                out_fields,
                bbox: bbox.as_deref().map(Bbox::parse).transpose()?,
                server_geojson: geojson,
                page_size: page_size.max(1),
                concurrency: g.concurrency.clamp(1, 16),
                max_features,
            };
            let f = fetcher(g, vec![host]).await?;
            let res = arcgis::query(&f, &layer, &params).await?;
            let n = res.collection["features"].as_array().map_or(0, Vec::len);
            let text = serde_json::to_string(&res.collection)?;
            match out {
                Some(p) => std::fs::write(&p, text + "\n")
                    .with_context(|| format!("writing {}", p.display()))?,
                None => println!("{text}"),
            }
            eprintln!("arcgis: {n} feature(s) over {} page request(s)", res.pages);
            if let Some(expected) = res.expected_count {
                if expected != n {
                    bail!("server reported {expected} matching features but {n} were retrieved (data changed mid-query?)");
                }
            }
        }
        Cmd::Cmr {
            cmd:
                CmrCmd::Granules {
                    short_name,
                    version,
                    provider,
                    bbox,
                    temporal,
                    page_size,
                    limit,
                    max_pages,
                },
        } => {
            let params = cmr::GranuleParams {
                short_name,
                version,
                provider,
                bbox: bbox.as_deref().map(Bbox::parse).transpose()?,
                temporal: temporal
                    .as_deref()
                    .map(|t| TimeRange::parse(t, ','))
                    .transpose()?,
                page_size,
                limit,
                max_pages: max_pages.max(1),
            };
            let base = Url::parse(cmr::CMR_GRANULES_URL)?;
            let token = Secret::from_env(cmr::EARTHDATA_TOKEN_ENV);
            // let f = fetcher(g, vec![base.host_str().unwrap_or_default().to_string()]).await?;
            // Replaced (review 2026-10-16): the allow-list is port-aware.
            let f = fetcher(g, opendata::net::policy_entry(&base).into_iter().collect()).await?;
            let res = cmr::search(&f, &base, &params, token.as_ref()).await?;
            print_lines(&res.granules)?;
            eprintln!(
                "cmr: {} granule(s) over {} page(s); CMR-Hits {}{}",
                res.granules.len(),
                res.pages,
                res.hits.map_or("unknown".to_string(), |h| h.to_string()),
                if res.truncated {
                    "; TRUNCATED at --max-pages"
                } else {
                    ""
                }
            );
        }
        Cmd::Cams {
            cmd:
                CamsCmd::Near {
                    country,
                    lat,
                    lon,
                    radius_km,
                    limit,
                },
        } => {
            let base = Url::parse(cams::CATALOGUE_BASE)?;
            let f = fetcher(g, vec![cams::CATALOGUE_HOST.to_string()]).await?;
            let hits =
                cams::fetch_and_search(&f, &base, &country, lat, lon, radius_km, limit).await?;
            print_lines(&hits)?;
            eprintln!("cams: {} camera(s) within {radius_km} km", hits.len());
        }
        Cmd::Evidence {
            cmd: EvidenceCmd::Verify { dir },
        } => {
            let r = verify_manifest(&dir, true)?;
            println!(
                "{}",
                serde_json::json!({"ok": true, "entries": r.entries, "head": r.last_hash})
            );
        }
    }
    Ok(())
}

#[tokio::main]
async fn main() -> ExitCode {
    let cli = Cli::parse();
    match run(cli).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("error: {e:#}");
            ExitCode::FAILURE
        }
    }
}
