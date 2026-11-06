//! Hardened HTTP layer shared by every subcommand.

use std::sync::Arc;
use std::time::Duration;

use anyhow::Context;
use chrono::{DateTime, Utc};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, CONTENT_TYPE, RETRY_AFTER};
use reqwest::{Method, StatusCode};
use serde::de::DeserializeOwned;
use url::Url;

// use crate::evidence::{Capture, EvidenceLog};
// Replaced (review 2026-10-16): error messages now redact URLs, so import the redactor.
use crate::evidence::{redact_url, Capture, EvidenceLog};

pub const USER_AGENT: &str = concat!(
    "opendata-rs/",
    env!("CARGO_PKG_VERSION"),
    " (revvel-standards blue-ocean-sar; open-data research client)"
);

/// Maximum redirect hops followed (each hop is still allow-list checked).
pub const MAX_REDIRECTS: usize = 5;

/// Default cap on a response body (256 MiB); see `FetcherConfig::max_body_bytes`.
pub const DEFAULT_MAX_BODY_BYTES: u64 = 256 * 1024 * 1024;

#[derive(Debug, thiserror::Error)]
pub enum NetError {
    #[error("URL rejected by policy: {0}")]
    UrlRejected(String),
    #[error("redirect rejected by policy: {0}")]
    RedirectRejected(String),
    #[error("HTTP {status} from {url} after {attempts} attempt(s): {snippet}")]
    Status {
        status: u16,
        url: String,
        attempts: u32,
        snippet: String,
    },
    #[error("request to {url} failed after {attempts} attempt(s): {message}")]
    Transport {
        url: String,
        attempts: u32,
        message: String,
    },
    #[error("evidence capture failed: {0}")]
    Evidence(String),
    // Added (review 2026-10-16): bodies are streamed under a size cap.
    #[error("response from {url} exceeds the {limit}-byte body limit")]
    TooLarge { url: String, limit: u64 },
}

/// Scheme + host allow-list. Hosts match exactly (no implicit subdomains).
/// An entry `host` permits only the scheme's default port (443); an entry
/// `host:port` permits that one explicit port. Loopback `http://` in tests
/// accepts any port.
#[derive(Debug, Clone)]
pub struct HostPolicy {
    hosts: Vec<String>,
    allow_loopback_http: bool,
}

impl HostPolicy {
    pub fn new<I, S>(hosts: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        Self {
            hosts: hosts
                .into_iter()
                .map(|h| h.into().trim().trim_end_matches('.').to_ascii_lowercase())
                .collect(),
            allow_loopback_http: false,
        }
    }

    /// Permit plain `http://` to loopback addresses. Used only by the test
    /// suite's local mock servers; the CLI never sets it.
    pub fn allow_loopback_http_for_tests(mut self) -> Self {
        self.allow_loopback_http = true;
        self
    }

    pub fn hosts(&self) -> &[String] {
        &self.hosts
    }

    pub fn check(&self, url: &Url) -> Result<(), String> {
        let host = url
            .host_str()
            .ok_or_else(|| format!("{url} has no host"))?
            .trim_end_matches('.')
            .to_ascii_lowercase();
        match url.scheme() {
            "https" => {}
            "http" if self.allow_loopback_http && is_loopback(&host) => {}
            s => return Err(format!("scheme {s:?} not allowed for {host} (HTTPS only)")),
        }
        if !url.username().is_empty() || url.password().is_some() {
            return Err(format!(
                "credentials embedded in URL for {host} are not allowed"
            ));
        }
        // if !self.hosts.contains(&host) {
        //     return Err(format!(
        //         "host {host:?} is not on the allow-list [{}]",
        //         self.hosts.join(", ")
        //     ));
        // }
        // Ok(())
        // Replaced (review 2026-10-16): the allow-list is port-aware, so an allowed host cannot redirect to another service on a non-default HTTPS port.
        let entry = match url.port() {
            Some(port) if url.scheme() == "https" => format!("{host}:{port}"),
            _ => host.clone(),
        };
        if !self.hosts.contains(&entry) {
            return Err(format!(
                "host {entry:?} is not on the allow-list [{}]",
                self.hosts.join(", ")
            ));
        }
        Ok(())
    }
}

/// The allow-list entry that admits exactly this URL's host and port:
/// `host` for the default port, `host:port` for an explicit other port.
pub fn policy_entry(url: &Url) -> Option<String> {
    let host = url.host_str()?.trim_end_matches('.').to_ascii_lowercase();
    Some(match url.port() {
        Some(port) => format!("{host}:{port}"),
        None => host,
    })
}

fn is_loopback(host: &str) -> bool {
    host == "localhost"
        || host
            .trim_start_matches('[')
            .trim_end_matches(']')
            .parse::<std::net::IpAddr>()
            .map(|ip| ip.is_loopback())
            .unwrap_or(false)
}

#[derive(Debug, Clone)]
pub struct RetryConfig {
    pub max_retries: u32,
    pub base_delay: Duration,
    pub max_delay: Duration,
    /// Upper bound applied to a server-provided `Retry-After`.
    pub max_retry_after: Duration,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_retries: 4,
            base_delay: Duration::from_millis(500),
            max_delay: Duration::from_secs(30),
            max_retry_after: Duration::from_secs(120),
        }
    }
}

pub struct FetcherConfig {
    pub policy: HostPolicy,
    pub retry: RetryConfig,
    pub timeout: Duration,
    pub connect_timeout: Duration,
    pub evidence: Option<Arc<EvidenceLog>>,
    /// Extra PEM root certificates (e.g. a corporate / egress proxy CA).
    pub extra_roots_pem: Option<Vec<u8>>,
    /// Largest response body accepted; bigger bodies fail with `TooLarge`.
    pub max_body_bytes: u64,
}

impl FetcherConfig {
    pub fn new(policy: HostPolicy) -> Self {
        Self {
            policy,
            retry: RetryConfig::default(),
            timeout: Duration::from_secs(60),
            connect_timeout: Duration::from_secs(15),
            evidence: None,
            extra_roots_pem: None,
            max_body_bytes: DEFAULT_MAX_BODY_BYTES,
        }
    }
}

/// A replayable request (the body is kept so retries can resend it).
#[derive(Debug, Clone)]
pub struct Request {
    pub method: Method,
    pub url: Url,
    pub headers: HeaderMap,
    pub body: Option<(Vec<u8>, &'static str)>,
}

impl Request {
    pub fn get(url: Url) -> Self {
        Self {
            method: Method::GET,
            url,
            headers: HeaderMap::new(),
            body: None,
        }
    }

    pub fn post_json(url: Url, body: &serde_json::Value) -> Self {
        Self {
            method: Method::POST,
            url,
            headers: HeaderMap::new(),
            body: Some((
                serde_json::to_vec(body).expect("JSON value serialises"),
                "application/json",
            )),
        }
    }

    /// Add a non-secret header.
    pub fn header(mut self, name: &'static str, value: &str) -> anyhow::Result<Self> {
        self.headers.insert(
            HeaderName::from_static(name),
            HeaderValue::from_str(value).context("invalid header value")?,
        );
        Ok(self)
    }

    /// Add a secret header; it is flagged sensitive so it never appears in
    /// `Debug` output.
    pub fn secret_header(mut self, name: &'static str, secret: &Secret) -> anyhow::Result<Self> {
        let mut v =
            HeaderValue::from_str(secret.expose()).context("secret is not a valid header value")?;
        v.set_sensitive(true);
        self.headers.insert(HeaderName::from_static(name), v);
        Ok(self)
    }
}

/// A credential read from the environment. `Debug`/`Display` never reveal it.
#[derive(Clone)]
pub struct Secret(String);

impl Secret {
    /// Read from an environment variable; empty values count as unset.
    pub fn from_env(var: &str) -> Option<Self> {
        std::env::var(var)
            .ok()
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty())
            .map(Secret)
    }

    pub fn new(v: impl Into<String>) -> Self {
        Secret(v.into())
    }

    pub fn expose(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Debug for Secret {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("Secret(***)")
    }
}

#[derive(Debug, Clone)]
pub struct Response {
    pub status: StatusCode,
    pub url: Url,
    pub headers: HeaderMap,
    pub body: Vec<u8>,
    pub attempts: u32,
}

impl Response {
    pub fn json<T: DeserializeOwned>(&self) -> anyhow::Result<T> {
        serde_json::from_slice(&self.body)
            .with_context(|| format!("response from {} is not the expected JSON", self.url))
    }

    pub fn header_str(&self, name: &str) -> Option<&str> {
        self.headers.get(name).and_then(|v| v.to_str().ok())
    }
}

#[derive(Debug)]
struct RedirectBlocked(String);

impl std::fmt::Display for RedirectBlocked {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for RedirectBlocked {}

pub struct Fetcher {
    client: reqwest::Client,
    policy: HostPolicy,
    retry: RetryConfig,
    evidence: Option<Arc<EvidenceLog>>,
    max_body_bytes: u64,
}

impl Fetcher {
    pub fn new(cfg: FetcherConfig) -> anyhow::Result<Self> {
        let redirect_policy = cfg.policy.clone();
        let redirect = reqwest::redirect::Policy::custom(move |attempt| {
            if attempt.previous().len() > MAX_REDIRECTS {
                let msg = format!("more than {MAX_REDIRECTS} redirects");
                return attempt.error(RedirectBlocked(msg));
            }
            match redirect_policy.check(attempt.url()) {
                Ok(()) => attempt.follow(),
                Err(e) => {
                    // let msg = format!("redirect to {} refused: {e}", attempt.url());
                    // Replaced (review 2026-10-16): never echo credential-like query parameters.
                    let msg = format!("redirect to {} refused: {e}", redact_url(attempt.url()));
                    attempt.error(RedirectBlocked(msg))
                }
            }
        });
        let mut b = reqwest::Client::builder()
            .user_agent(USER_AGENT)
            .redirect(redirect)
            .timeout(cfg.timeout)
            .connect_timeout(cfg.connect_timeout)
            .https_only(!cfg.policy.allow_loopback_http);
        if let Some(pem) = &cfg.extra_roots_pem {
            for cert in
                reqwest::Certificate::from_pem_bundle(pem).context("parsing extra CA bundle")?
            {
                b = b.add_root_certificate(cert);
            }
        }
        Ok(Self {
            client: b.build().context("building HTTP client")?,
            policy: cfg.policy,
            retry: cfg.retry,
            evidence: cfg.evidence,
            max_body_bytes: cfg.max_body_bytes,
        })
    }

    pub fn policy(&self) -> &HostPolicy {
        &self.policy
    }

    /// Send with policy checks, retries, and evidence capture. Non-2xx after
    /// retries is an error; every response received is captured as evidence.
    pub async fn send(&self, req: &Request) -> Result<Response, NetError> {
        self.policy.check(&req.url).map_err(NetError::UrlRejected)?;
        let mut attempts: u32 = 0;
        loop {
            attempts += 1;
            let mut rb = self
                .client
                .request(req.method.clone(), req.url.clone())
                .headers(req.headers.clone());
            if let Some((body, ct)) = &req.body {
                rb = rb.header(CONTENT_TYPE, *ct).body(body.clone());
            }
            let can_retry = attempts <= self.retry.max_retries;
            let resp = match rb.send().await {
                Ok(r) => r,
                Err(e) => {
                    if let Some(msg) = find_redirect_block(&e) {
                        return Err(NetError::RedirectRejected(msg));
                    }
                    if can_retry && (e.is_timeout() || e.is_connect() || e.is_request()) {
                        tokio::time::sleep(self.backoff(attempts, None)).await;
                        continue;
                    }
                    // return Err(NetError::Transport {
                    //     url: req.url.to_string(),
                    //     attempts,
                    //     message: error_chain(&e),
                    // });
                    // Replaced (review 2026-10-16): redact the URL and strip reqwest's embedded URL.
                    return Err(NetError::Transport {
                        url: redact_url(&req.url),
                        attempts,
                        message: error_chain(&e.without_url()),
                    });
                }
            };
            let status = resp.status();
            let final_url = resp.url().clone();
            // Defence in depth: the redirect hook already checked every hop.
            self.policy
                .check(&final_url)
                .map_err(NetError::RedirectRejected)?;
            let headers = resp.headers().clone();
            // let body = match resp.bytes().await {
            //     Ok(b) => b.to_vec(),
            //     Err(e) => {
            //         if can_retry {
            //             tokio::time::sleep(self.backoff(attempts, None)).await;
            //             continue;
            //         }
            //         return Err(NetError::Transport {
            //             url: req.url.to_string(),
            //             attempts,
            //             message: error_chain(&e),
            //         });
            //     }
            // };
            // Replaced (review 2026-10-16): stream the body under max_body_bytes instead of buffering an unbounded response.
            let body = match read_capped(resp, self.max_body_bytes).await {
                Ok(Some(b)) => b,
                Ok(None) => {
                    return Err(NetError::TooLarge {
                        url: redact_url(&final_url),
                        limit: self.max_body_bytes,
                    })
                }
                Err(e) => {
                    if can_retry {
                        tokio::time::sleep(self.backoff(attempts, None)).await;
                        continue;
                    }
                    return Err(NetError::Transport {
                        url: redact_url(&req.url),
                        attempts,
                        message: error_chain(&e.without_url()),
                    });
                }
            };
            if let Some(ev) = &self.evidence {
                ev.record(Capture {
                    method: req.method.as_str(),
                    url: &req.url,
                    final_url: &final_url,
                    status: status.as_u16(),
                    request_body: req.body.as_ref().map(|(b, _)| b.as_slice()),
                    body: &body,
                })
                .await
                .map_err(|e| NetError::Evidence(format!("{e:#}")))?;
            }
            if status.is_success() {
                return Ok(Response {
                    status,
                    url: final_url,
                    headers,
                    body,
                    attempts,
                });
            }
            if can_retry && is_retryable(status) {
                let ra = headers
                    .get(RETRY_AFTER)
                    .and_then(|v| v.to_str().ok())
                    .and_then(|v| parse_retry_after(v, Utc::now()));
                tokio::time::sleep(self.backoff(attempts, ra)).await;
                continue;
            }
            let snippet: String = String::from_utf8_lossy(&body).chars().take(300).collect();
            // return Err(NetError::Status {
            //     status: status.as_u16(),
            //     url: final_url.to_string(),
            // Replaced (review 2026-10-16): redact credential-like query parameters in errors.
            return Err(NetError::Status {
                status: status.as_u16(),
                url: redact_url(&final_url),
                attempts,
                snippet,
            });
        }
    }

    /// Delay before the next attempt: `Retry-After` (capped) when given,
    /// otherwise `base * 2^(attempt-1)` capped at `max_delay`, plus jitter.
    pub fn backoff(&self, attempt: u32, retry_after: Option<Duration>) -> Duration {
        if let Some(ra) = retry_after {
            return ra.min(self.retry.max_retry_after);
        }
        let exp = self
            .retry
            .base_delay
            .saturating_mul(1u32 << attempt.saturating_sub(1).min(16))
            .min(self.retry.max_delay);
        let jitter_cap = (self.retry.base_delay.as_millis() as u64 / 2).max(1);
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.subsec_nanos() as u64)
            .unwrap_or(0);
        exp + Duration::from_millis(nanos % jitter_cap)
    }
}

/// Read the body, giving up (`Ok(None)`) as soon as it would exceed `limit`.
async fn read_capped(
    mut resp: reqwest::Response,
    limit: u64,
) -> Result<Option<Vec<u8>>, reqwest::Error> {
    if resp.content_length().is_some_and(|n| n > limit) {
        return Ok(None);
    }
    let mut body = Vec::new();
    while let Some(chunk) = resp.chunk().await? {
        if body.len() as u64 + chunk.len() as u64 > limit {
            return Ok(None);
        }
        body.extend_from_slice(&chunk);
    }
    Ok(Some(body))
}

pub fn is_retryable(status: StatusCode) -> bool {
    status == StatusCode::TOO_MANY_REQUESTS || matches!(status.as_u16(), 500 | 502 | 503 | 504)
}

/// `Retry-After` is either delta-seconds or an HTTP-date (IMF-fixdate).
pub fn parse_retry_after(v: &str, now: DateTime<Utc>) -> Option<Duration> {
    let v = v.trim();
    if let Ok(secs) = v.parse::<u64>() {
        return Some(Duration::from_secs(secs));
    }
    let when = DateTime::parse_from_rfc2822(v).ok()?.with_timezone(&Utc);
    Some((when - now).to_std().unwrap_or(Duration::ZERO))
}

fn find_redirect_block(e: &reqwest::Error) -> Option<String> {
    let mut src: Option<&(dyn std::error::Error + 'static)> = Some(e);
    while let Some(s) = src {
        if let Some(rb) = s.downcast_ref::<RedirectBlocked>() {
            return Some(rb.0.clone());
        }
        src = s.source();
    }
    None
}

fn error_chain(e: &dyn std::error::Error) -> String {
    let mut out = e.to_string();
    let mut src = e.source();
    while let Some(s) = src {
        out.push_str(": ");
        out.push_str(&s.to_string());
        src = s.source();
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn retry_after_seconds_and_date() {
        let now = DateTime::parse_from_rfc3339("2026-10-16T12:00:00Z")
            .unwrap()
            .with_timezone(&Utc);
        assert_eq!(parse_retry_after("7", now), Some(Duration::from_secs(7)));
        assert_eq!(
            parse_retry_after("Fri, 16 Oct 2026 12:00:30 GMT", now),
            Some(Duration::from_secs(30))
        );
        assert_eq!(
            parse_retry_after("Fri, 16 Oct 2026 11:00:00 GMT", now),
            Some(Duration::ZERO)
        );
        assert_eq!(parse_retry_after("soon", now), None);
    }

    #[test]
    fn retryable_statuses() {
        for s in [429u16, 500, 502, 503, 504] {
            assert!(is_retryable(StatusCode::from_u16(s).unwrap()), "{s}");
        }
        for s in [400u16, 401, 403, 404, 501] {
            assert!(!is_retryable(StatusCode::from_u16(s).unwrap()), "{s}");
        }
    }

    #[test]
    fn secret_debug_is_redacted() {
        let s = Secret::new("hunter2");
        assert_eq!(format!("{s:?}"), "Secret(***)");
        let r = Request::get(Url::parse("https://a.example/").unwrap())
            .secret_header("authorization", &Secret::new("Bearer hunter2"))
            .unwrap();
        assert!(!format!("{r:?}").contains("hunter2"));
    }

    #[test]
    fn policy_rules() {
        let p = HostPolicy::new(["Example.org"]);
        assert!(p
            .check(&Url::parse("https://example.org/x").unwrap())
            .is_ok());
        assert!(p
            .check(&Url::parse("https://EXAMPLE.org./x").unwrap())
            .is_ok());
        assert!(p
            .check(&Url::parse("http://example.org/x").unwrap())
            .is_err());
        assert!(p
            .check(&Url::parse("https://evil.example.org/x").unwrap())
            .is_err());
        assert!(p
            .check(&Url::parse("https://example.org.evil.net/x").unwrap())
            .is_err());
        assert!(p
            .check(&Url::parse("https://u:p@example.org/x").unwrap())
            .is_err());
        assert!(p
            .check(&Url::parse("ftp://example.org/x").unwrap())
            .is_err());
        let lp = HostPolicy::new(["127.0.0.1"]);
        assert!(lp
            .check(&Url::parse("http://127.0.0.1:9/x").unwrap())
            .is_err());
        let lp = lp.allow_loopback_http_for_tests();
        assert!(lp
            .check(&Url::parse("http://127.0.0.1:9/x").unwrap())
            .is_ok());
        assert!(lp
            .check(&Url::parse("http://localhost:9/x").unwrap())
            .is_err());
    }

    #[test]
    fn policy_is_port_aware_for_https() {
        let p = HostPolicy::new(["example.org"]);
        assert!(p
            .check(&Url::parse("https://example.org:443/x").unwrap())
            .is_ok());
        assert!(p
            .check(&Url::parse("https://example.org:8443/x").unwrap())
            .is_err());
        let p = HostPolicy::new(["example.org:8443"]);
        assert!(p
            .check(&Url::parse("https://example.org:8443/x").unwrap())
            .is_ok());
        assert!(p
            .check(&Url::parse("https://example.org:9443/x").unwrap())
            .is_err());
        assert!(p
            .check(&Url::parse("https://example.org/x").unwrap())
            .is_err());
        assert_eq!(
            policy_entry(&Url::parse("https://Example.org:443/x").unwrap()).as_deref(),
            Some("example.org")
        );
        assert_eq!(
            policy_entry(&Url::parse("https://example.org:8443/x").unwrap()).as_deref(),
            Some("example.org:8443")
        );
    }
}
