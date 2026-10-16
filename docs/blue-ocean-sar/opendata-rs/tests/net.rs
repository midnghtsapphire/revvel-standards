mod common;

use std::time::{Duration, Instant};

use common::{fetcher_for, url};
use opendata::net::{NetError, Request, USER_AGENT};
use wiremock::matchers::{header, method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

#[tokio::test]
async fn retries_503_then_succeeds() {
    let s = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/flaky"))
        .respond_with(ResponseTemplate::new(503).insert_header("Retry-After", "0"))
        .up_to_n_times(1)
        .expect(1)
        .mount(&s)
        .await;
    Mock::given(method("GET"))
        .and(path("/flaky"))
        .respond_with(ResponseTemplate::new(200).set_body_string("ok"))
        .expect(1)
        .mount(&s)
        .await;
    let f = fetcher_for(&s, None);
    let r = f.send(&Request::get(url(&s, "/flaky"))).await.unwrap();
    assert_eq!(r.body, b"ok");
    assert_eq!(r.attempts, 2);
}

#[tokio::test]
async fn honours_retry_after_on_429() {
    let s = MockServer::start().await;
    Mock::given(path("/slow"))
        .respond_with(ResponseTemplate::new(429).insert_header("Retry-After", "1"))
        .up_to_n_times(1)
        .mount(&s)
        .await;
    Mock::given(path("/slow"))
        .respond_with(ResponseTemplate::new(200).set_body_string("ok"))
        .mount(&s)
        .await;
    let f = fetcher_for(&s, None);
    let t = Instant::now();
    let r = f.send(&Request::get(url(&s, "/slow"))).await.unwrap();
    assert_eq!(r.attempts, 2);
    // Backoff base is 5 ms in tests, so >= 1 s proves Retry-After was used.
    assert!(
        t.elapsed() >= Duration::from_millis(950),
        "{:?}",
        t.elapsed()
    );
}

#[tokio::test]
async fn gives_up_after_max_retries_with_status_error() {
    let s = MockServer::start().await;
    Mock::given(path("/down"))
        .respond_with(ResponseTemplate::new(503))
        .expect(4) // 1 + 3 retries
        .mount(&s)
        .await;
    let f = fetcher_for(&s, None);
    match f.send(&Request::get(url(&s, "/down"))).await {
        Err(NetError::Status {
            status, attempts, ..
        }) => {
            assert_eq!(status, 503);
            assert_eq!(attempts, 4);
        }
        other => panic!("expected Status error, got {other:?}"),
    }
}

#[tokio::test]
async fn does_not_retry_404() {
    let s = MockServer::start().await;
    Mock::given(path("/missing"))
        .respond_with(ResponseTemplate::new(404))
        .expect(1)
        .mount(&s)
        .await;
    let f = fetcher_for(&s, None);
    assert!(matches!(
        f.send(&Request::get(url(&s, "/missing"))).await,
        Err(NetError::Status {
            status: 404,
            attempts: 1,
            ..
        })
    ));
}

#[tokio::test]
async fn redirect_to_off_list_host_is_rejected() {
    let allowed = MockServer::start().await;
    let other = MockServer::start().await;
    Mock::given(path("/target"))
        .respond_with(ResponseTemplate::new(200).set_body_string("should never be fetched"))
        .expect(0)
        .mount(&other)
        .await;
    // "localhost" is not on the allow-list (only 127.0.0.1 is).
    let port = url::Url::parse(&other.uri()).unwrap().port().unwrap();
    let evil = format!("http://localhost:{port}/target");
    Mock::given(path("/start"))
        .respond_with(ResponseTemplate::new(302).insert_header("Location", evil.as_str()))
        .expect(1)
        .mount(&allowed)
        .await;
    let f = fetcher_for(&allowed, None);
    match f.send(&Request::get(url(&allowed, "/start"))).await {
        Err(NetError::RedirectRejected(msg)) => assert!(msg.contains("localhost"), "{msg}"),
        other => panic!("expected RedirectRejected, got {other:?}"),
    }
}

#[tokio::test]
async fn redirect_within_allow_list_is_followed() {
    let s = MockServer::start().await;
    Mock::given(path("/a"))
        .respond_with(ResponseTemplate::new(301).insert_header("Location", "/b"))
        .mount(&s)
        .await;
    Mock::given(path("/b"))
        .respond_with(ResponseTemplate::new(200).set_body_string("b"))
        .mount(&s)
        .await;
    let f = fetcher_for(&s, None);
    let r = f.send(&Request::get(url(&s, "/a"))).await.unwrap();
    assert_eq!(r.body, b"b");
    assert!(r.url.path().ends_with("/b"));
}

#[tokio::test]
async fn initial_url_outside_policy_is_rejected_without_network() {
    let s = MockServer::start().await;
    let f = fetcher_for(&s, None);
    for bad in [
        "https://example.com/x",
        "http://localhost/x",
        "ftp://127.0.0.1/x",
        "http://user:pw@127.0.0.1/x",
    ] {
        let r = f.send(&Request::get(url::Url::parse(bad).unwrap())).await;
        assert!(matches!(r, Err(NetError::UrlRejected(_))), "{bad}: {r:?}");
    }
    assert!(s.received_requests().await.unwrap().is_empty());
}

#[tokio::test]
async fn sends_project_user_agent() {
    let s = MockServer::start().await;
    Mock::given(header("user-agent", USER_AGENT))
        .respond_with(ResponseTemplate::new(200))
        .expect(1)
        .mount(&s)
        .await;
    let f = fetcher_for(&s, None);
    f.send(&Request::get(url(&s, "/ua"))).await.unwrap();
    assert!(USER_AGENT.starts_with("opendata-rs/"));
}

#[tokio::test]
async fn times_out_and_retries_a_hung_server() {
    let s = MockServer::start().await;
    Mock::given(path("/hang"))
        .respond_with(ResponseTemplate::new(200).set_delay(Duration::from_secs(5)))
        .mount(&s)
        .await;
    let host = url::Url::parse(&s.uri())
        .unwrap()
        .host_str()
        .unwrap()
        .to_string();
    let mut cfg = opendata::net::FetcherConfig::new(
        opendata::net::HostPolicy::new([host]).allow_loopback_http_for_tests(),
    );
    cfg.retry = common::fast_retry();
    cfg.retry.max_retries = 1;
    cfg.timeout = Duration::from_millis(200);
    let f = opendata::net::Fetcher::new(cfg).unwrap();
    match f.send(&Request::get(url(&s, "/hang"))).await {
        Err(NetError::Transport { attempts, .. }) => assert_eq!(attempts, 2),
        other => panic!("expected Transport timeout, got {other:?}"),
    }
}
