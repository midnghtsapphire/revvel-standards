mod common;

use common::{fetcher_for, url};
use opendata::cmr::{self, GranuleParams};
use opendata::geo::{Bbox, TimeRange};
use opendata::net::Secret;
use serde_json::{json, Value};
use wiremock::matchers::{header, method, path, query_param};
use wiremock::{Mock, MockServer, ResponseTemplate};

fn entry(id: &str) -> Value {
    json!({
        "id": id, "title": format!("GEDI02_A_{id}.h5"), "producer_granule_id": format!("{id}.h5"),
        "time_start": "2026-02-01T00:00:00.000Z", "time_end": "2026-02-01T01:00:00.000Z",
        "links": [
            {"rel": "http://esipfed.org/ns/fedsearch/1.1/data#", "href": format!("https://data.example/{id}.h5")},
            {"rel": "http://esipfed.org/ns/fedsearch/1.1/metadata#", "href": "https://meta.example/x"}
        ]
    })
}

fn feed(ids: &[&str]) -> Value {
    json!({"feed": {"entry": ids.iter().map(|i| entry(i)).collect::<Vec<_>>()}})
}

fn params() -> GranuleParams {
    GranuleParams {
        short_name: "GEDI02_A".into(),
        version: None,
        provider: None,
        bbox: Some(Bbox::parse("-88,30,-87,31").unwrap()),
        temporal: Some(TimeRange::parse("2026-01-01,2026-03-01", ',').unwrap()),
        page_size: 2,
        limit: None,
        max_pages: 10,
    }
}

#[tokio::test]
async fn pages_with_cmr_search_after_header() {
    let s = MockServer::start().await;
    let gp = "/search/granules.json";
    // Page 3 (search-after token t2): last page, no further token.
    Mock::given(path(gp))
        .and(header("cmr-search-after", "[\"t2\"]"))
        .respond_with(
            ResponseTemplate::new(200)
                .insert_header("CMR-Hits", "5")
                .set_body_json(feed(&["G5"])),
        )
        .with_priority(1)
        .expect(1)
        .mount(&s)
        .await;
    // Page 2 (token t1).
    Mock::given(path(gp))
        .and(header("cmr-search-after", "[\"t1\"]"))
        .respond_with(
            ResponseTemplate::new(200)
                .insert_header("CMR-Hits", "5")
                .insert_header("CMR-Search-After", "[\"t2\"]")
                .set_body_json(feed(&["G3", "G4"])),
        )
        .with_priority(1)
        .expect(1)
        .mount(&s)
        .await;
    // Page 1: no token header; also check query parameters.
    Mock::given(method("GET"))
        .and(path(gp))
        .and(query_param("short_name", "GEDI02_A"))
        .and(query_param("bounding_box", "-88,30,-87,31"))
        .and(query_param(
            "temporal",
            "2026-01-01T00:00:00Z,2026-03-01T23:59:59Z",
        ))
        .and(query_param("page_size", "2"))
        .and(header("authorization", "Bearer edl-token"))
        .respond_with(
            ResponseTemplate::new(200)
                .insert_header("CMR-Hits", "5")
                .insert_header("CMR-Search-After", "[\"t1\"]")
                .set_body_json(feed(&["G1", "G2"])),
        )
        .with_priority(5)
        .expect(1)
        .mount(&s)
        .await;
    let f = fetcher_for(&s, None);
    let tok = Secret::new("edl-token");
    let out = cmr::search(&f, &url(&s, gp), &params(), Some(&tok))
        .await
        .unwrap();
    let ids: Vec<&str> = out.granules.iter().map(|g| g.id.as_str()).collect();
    assert_eq!(ids, ["G1", "G2", "G3", "G4", "G5"]);
    assert_eq!(out.pages, 3);
    assert_eq!(out.hits, Some(5));
    assert_eq!(out.granules[0].data_links, ["https://data.example/G1.h5"]);
    // The token never appears in any URL.
    for r in s.received_requests().await.unwrap() {
        assert!(!r.url.as_str().contains("edl-token"));
        assert_eq!(r.headers.get("authorization").unwrap(), "Bearer edl-token");
    }
}

#[tokio::test]
async fn repeated_search_after_token_is_an_error() {
    let s = MockServer::start().await;
    Mock::given(path("/g"))
        .respond_with(
            ResponseTemplate::new(200)
                .insert_header("CMR-Search-After", "same")
                .set_body_json(feed(&["G1"])),
        )
        .mount(&s)
        .await;
    let f = fetcher_for(&s, None);
    let err = cmr::search(&f, &url(&s, "/g"), &params(), None)
        .await
        .unwrap_err();
    assert!(
        format!("{err:#}").contains("same CMR-Search-After"),
        "{err:#}"
    );
}

#[tokio::test]
async fn cmr_400_is_not_retried_and_reports_body() {
    let s = MockServer::start().await;
    Mock::given(path("/g"))
        .respond_with(ResponseTemplate::new(400).set_body_json(json!({"errors": ["bad temporal"]})))
        .expect(1)
        .mount(&s)
        .await;
    let f = fetcher_for(&s, None);
    let err = cmr::search(&f, &url(&s, "/g"), &params(), None)
        .await
        .unwrap_err();
    assert!(format!("{err:#}").contains("bad temporal"));
}

#[test]
fn short_name_validation() {
    assert!(cmr::validate_short_name("GEDI02_A").is_ok());
    assert!(cmr::validate_short_name("ATL03.v6").is_ok());
    assert!(cmr::validate_short_name("").is_err());
    assert!(cmr::validate_short_name("a&provider=x").is_err());
}

// Added (review 2026-10-16): collection-level links CMR copies into a granule
// are marked `"inherited": true` and must not be reported as granule data.
#[test]
fn inherited_collection_data_links_are_excluded() {
    let mut e = entry("G1");
    e["links"].as_array_mut().unwrap().push(json!({
        "rel": "http://esipfed.org/ns/fedsearch/1.1/data#",
        "href": "https://collection.example/whole-dataset/",
        "inherited": true
    }));
    let g = cmr::summarise(&e).unwrap();
    assert_eq!(g.data_links, ["https://data.example/G1.h5"]);
}
