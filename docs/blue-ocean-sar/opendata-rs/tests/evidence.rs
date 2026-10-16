mod common;

use std::sync::Arc;

use common::{fetcher_for, url};
use futures::future::join_all;
use opendata::evidence::{
    sha256_hex, verify_manifest, EvidenceLog, ManifestEntry, GENESIS_HASH, MANIFEST_FILE,
};
use opendata::net::Request;
use wiremock::matchers::path;
use wiremock::{Mock, MockServer, ResponseTemplate};

fn read_entries(dir: &std::path::Path) -> Vec<ManifestEntry> {
    std::fs::read_to_string(dir.join(MANIFEST_FILE))
        .unwrap()
        .lines()
        .map(|l| serde_json::from_str(l).unwrap())
        .collect()
}

async fn capture_some(dir: &std::path::Path) -> MockServer {
    let s = MockServer::start().await;
    Mock::given(path("/a"))
        .respond_with(ResponseTemplate::new(200).set_body_string("alpha"))
        .mount(&s)
        .await;
    Mock::given(path("/b"))
        .respond_with(ResponseTemplate::new(503).set_body_string("busy"))
        .up_to_n_times(1)
        .mount(&s)
        .await;
    Mock::given(path("/b"))
        .respond_with(ResponseTemplate::new(200).set_body_string("bravo"))
        .mount(&s)
        .await;
    let log = Arc::new(EvidenceLog::open(dir).await.unwrap());
    let f = fetcher_for(&s, Some(log));
    f.send(&Request::get(url(&s, "/a?api_key=SECRET1&q=x")))
        .await
        .unwrap();
    f.send(&Request::post_json(
        url(&s, "/b"),
        &serde_json::json!({"k": 1}),
    ))
    .await
    .unwrap();
    s
}

#[tokio::test]
async fn chain_is_valid_and_records_every_response() {
    let d = tempfile::tempdir().unwrap();
    capture_some(d.path()).await;
    let r = verify_manifest(d.path(), true).unwrap();
    assert_eq!(r.entries, 3, "200 + 503 + 200");
    let e = read_entries(d.path());
    assert_eq!(e[0].body.prev_hash, GENESIS_HASH);
    assert_eq!(e[1].body.prev_hash, e[0].entry_hash);
    assert_eq!(e[2].body.prev_hash, e[1].entry_hash);
    assert_eq!(e[0].body.sha256, sha256_hex(b"alpha"));
    assert_eq!(e[1].body.status, 503);
    assert_eq!(e[2].body.method, "POST");
    assert_eq!(
        e[2].body.request_body_sha256.as_deref(),
        Some(sha256_hex(br#"{"k":1}"#).as_str())
    );
    assert!(e[0].body.utc.ends_with('Z'));
    // Credential-like query parameters are redacted in the manifest.
    let text = std::fs::read_to_string(d.path().join(MANIFEST_FILE)).unwrap();
    assert!(!text.contains("SECRET1"));
    assert_eq!(
        std::fs::read(d.path().join(&e[0].body.file)).unwrap(),
        b"alpha".to_vec()
    );
}

#[tokio::test]
async fn edited_entry_breaks_verification() {
    let d = tempfile::tempdir().unwrap();
    capture_some(d.path()).await;
    let p = d.path().join(MANIFEST_FILE);
    let text = std::fs::read_to_string(&p).unwrap();
    std::fs::write(&p, text.replacen("\"status\":503", "\"status\":200", 1)).unwrap();
    let err = verify_manifest(d.path(), true).unwrap_err();
    assert!(
        format!("{err:#}").contains("entry_hash mismatch"),
        "{err:#}"
    );
}

#[tokio::test]
async fn deleted_line_breaks_chain() {
    let d = tempfile::tempdir().unwrap();
    capture_some(d.path()).await;
    let p = d.path().join(MANIFEST_FILE);
    let lines: Vec<String> = std::fs::read_to_string(&p)
        .unwrap()
        .lines()
        .map(String::from)
        .collect();
    std::fs::write(&p, format!("{}\n{}\n", lines[0], lines[2])).unwrap();
    assert!(verify_manifest(d.path(), true).is_err());
}

#[tokio::test]
async fn rehashed_forgery_still_breaks_chain() {
    // An attacker who edits an entry AND recomputes its entry_hash still
    // breaks the next entry's prev_hash link.
    let d = tempfile::tempdir().unwrap();
    capture_some(d.path()).await;
    let p = d.path().join(MANIFEST_FILE);
    let mut e = read_entries(d.path());
    e[1].body.status = 200;
    e[1].entry_hash = e[1].body.hash();
    let text: String = e
        .iter()
        .map(|x| serde_json::to_string(x).unwrap() + "\n")
        .collect();
    std::fs::write(&p, text).unwrap();
    let err = verify_manifest(d.path(), true).unwrap_err();
    assert!(format!("{err:#}").contains("line 3"), "{err:#}");
}

#[tokio::test]
async fn tampered_object_is_detected() {
    let d = tempfile::tempdir().unwrap();
    capture_some(d.path()).await;
    let e = read_entries(d.path());
    std::fs::write(d.path().join(&e[0].body.file), b"ALPHA").unwrap();
    assert!(
        verify_manifest(d.path(), false).is_ok(),
        "chain alone is intact"
    );
    assert!(
        verify_manifest(d.path(), true).is_err(),
        "object check catches it"
    );
}

#[tokio::test]
async fn reopen_continues_chain_and_refuses_broken_one() {
    let d = tempfile::tempdir().unwrap();
    capture_some(d.path()).await;
    capture_some(d.path()).await; // second session appends
    let r = verify_manifest(d.path(), true).unwrap();
    assert_eq!(r.entries, 6);
    let e = read_entries(d.path());
    assert_eq!(e[3].body.seq, 3);
    assert_eq!(e[3].body.prev_hash, e[2].entry_hash);

    let p = d.path().join(MANIFEST_FILE);
    let text = std::fs::read_to_string(&p).unwrap();
    std::fs::write(&p, text.replacen("\"seq\":1,", "\"seq\":9,", 1)).unwrap();
    assert!(EvidenceLog::open(d.path()).await.is_err());
}

#[tokio::test]
async fn concurrent_captures_keep_a_linear_chain() {
    let d = tempfile::tempdir().unwrap();
    let s = MockServer::start().await;
    Mock::given(path("/c"))
        .respond_with(ResponseTemplate::new(200).set_body_string("same body"))
        .mount(&s)
        .await;
    let log = Arc::new(EvidenceLog::open(d.path()).await.unwrap());
    let f = fetcher_for(&s, Some(log));
    let futs = (0..20).map(|i| {
        let f = &f;
        let s = &s;
        async move {
            f.send(&Request::get(url(s, &format!("/c?i={i}"))))
                .await
                .unwrap()
        }
    });
    join_all(futs).await;
    let r = verify_manifest(d.path(), true).unwrap();
    assert_eq!(r.entries, 20);
}
