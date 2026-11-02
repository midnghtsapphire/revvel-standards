//! opendata-rs: an evidence-grade fetcher for public geospatial catalogues.
//!
//! Every network call goes through [`net::Fetcher`], which enforces:
//! HTTPS only, a per-source host allow-list (also applied to every redirect
//! hop), timeouts, bounded retries with exponential backoff on 429/5xx that
//! honour `Retry-After`, a project User-Agent, and optional evidence capture
//! into an append-only, hash-chained manifest ([`evidence`]).

pub mod arcgis;
pub mod cams;
pub mod cmr;
pub mod esri;
pub mod evidence;
pub mod geo;
pub mod net;
pub mod stac;
