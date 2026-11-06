#![allow(dead_code)]

use std::sync::Arc;
use std::time::Duration;

use opendata::evidence::EvidenceLog;
use opendata::net::{Fetcher, FetcherConfig, HostPolicy, RetryConfig};
use url::Url;
use wiremock::MockServer;

/// Fast retry settings so tests do not sleep for real backoff periods.
pub fn fast_retry() -> RetryConfig {
    RetryConfig {
        max_retries: 3,
        base_delay: Duration::from_millis(5),
        max_delay: Duration::from_millis(20),
        max_retry_after: Duration::from_secs(5),
    }
}

/// Fetcher whose allow-list is exactly the mock server's host (127.0.0.1).
pub fn fetcher_for(server: &MockServer, evidence: Option<Arc<EvidenceLog>>) -> Fetcher {
    let host = Url::parse(&server.uri())
        .unwrap()
        .host_str()
        .unwrap()
        .to_string();
    let mut cfg = FetcherConfig::new(HostPolicy::new([host]).allow_loopback_http_for_tests());
    cfg.retry = fast_retry();
    cfg.timeout = Duration::from_secs(10);
    cfg.evidence = evidence;
    Fetcher::new(cfg).unwrap()
}

pub fn url(server: &MockServer, path: &str) -> Url {
    Url::parse(&format!("{}{}", server.uri(), path)).unwrap()
}

pub fn fixture(name: &str) -> serde_json::Value {
    let p = format!("{}/tests/fixtures/{name}", env!("CARGO_MANIFEST_DIR"));
    serde_json::from_str(&std::fs::read_to_string(&p).unwrap()).unwrap()
}
