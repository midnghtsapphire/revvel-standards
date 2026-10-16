mod common;

use common::{fetcher_for, url};
use opendata::geo::{Bbox, TimeRange};
use opendata::net::Secret;
use opendata::stac::{self, Catalog, SearchParams};
use serde_json::{json, Value};
use wiremock::matchers::{body_partial_json, header, method, path, query_param};
use wiremock::{Mock, MockServer, ResponseTemplate};

fn item(id: &str, cloud: f64) -> Value {
    json!({
        "type": "Feature", "stac_version": "1.0.0", "id": id, "collection": "sentinel-2-l2a",
        "geometry": null, "bbox": [0,0,1,1],
        "properties": {"datetime": "2026-03-01T10:00:00Z", "eo:cloud_cover": cloud},
        "assets": {"B04": {"href": format!("https://data.example/{id}/B04.tif")},
                   "visual": {"href": format!("https://data.example/{id}/TCI.tif")}},
        "links": []
    })
}

fn params(max_cloud: Option<f64>, limit: Option<usize>) -> SearchParams {
    SearchParams {
        collections: vec!["sentinel-2-l2a".into()],
        bbox: Bbox::parse("-88.5,30.1,-87.9,30.9").unwrap(),
        datetime: TimeRange::parse("2026-01-01/2026-10-15", '/').unwrap(),
        max_cloud,
        limit,
        page_size: 2,
        max_pages: 10,
    }
}

async fn mount_three_pages(s: &MockServer) {
    // Page 2: POST with merged body (original fields + token).
    let p2 = json!({
        "type": "FeatureCollection",
        "features": [item("c", 5.0), item("d", 50.0)],
        "links": [{"rel": "next", "href": format!("{}/search?token=p3", s.uri()), "method": "GET"}]
    });
    Mock::given(method("POST"))
        .and(path("/search"))
        .and(body_partial_json(
            json!({"token": "p2", "collections": ["sentinel-2-l2a"], "limit": 2}),
        ))
        .respond_with(ResponseTemplate::new(200).set_body_json(p2))
        .with_priority(1)
        .expect(1)
        .mount(s)
        .await;
    // Page 1: initial POST.
    let p1 = json!({
        "type": "FeatureCollection",
        "features": [item("a", 1.0), item("b", 10.0)],
        "links": [{"rel": "next", "href": format!("{}/search", s.uri()), "method": "POST",
                   "body": {"token": "p2"}, "merge": true}]
    });
    Mock::given(method("POST"))
        .and(path("/search"))
        .and(body_partial_json(json!({
            "datetime": "2026-01-01T00:00:00Z/2026-10-15T23:59:59Z",
            "bbox": [-88.5, 30.1, -87.9, 30.9]
        })))
        .respond_with(ResponseTemplate::new(200).set_body_json(p1))
        .with_priority(5)
        .expect(1)
        .mount(s)
        .await;
    // Page 3: GET next link, no further next.
    let p3 = json!({"type": "FeatureCollection", "features": [item("e", 0.0)], "links": [{"rel": "self", "href": "x"}]});
    Mock::given(method("GET"))
        .and(path("/search"))
        .and(query_param("token", "p3"))
        .respond_with(ResponseTemplate::new(200).set_body_json(p3))
        .expect(1)
        .mount(s)
        .await;
}

#[tokio::test]
async fn follows_post_and_get_next_links_and_filters_cloud() {
    let s = MockServer::start().await;
    mount_three_pages(&s).await;
    let f = fetcher_for(&s, None);
    let cat = Catalog::Custom(url(&s, "/"));
    let out = stac::search(&f, &cat, &params(Some(20.0), None), None)
        .await
        .unwrap();
    let ids: Vec<&str> = out.items.iter().map(|i| i.id.as_str()).collect();
    assert_eq!(ids, ["a", "b", "c", "e"]);
    assert_eq!(out.pages, 3);
    assert_eq!(out.dropped_by_cloud_filter, 1);
    assert!(!out.truncated);
    assert_eq!(out.items[0].assets["B04"], "https://data.example/a/B04.tif");
    assert_eq!(out.items[0].cloud_cover, Some(1.0));
}

#[tokio::test]
async fn limit_stops_paging_early() {
    let s = MockServer::start().await;
    let page = json!({
        "type": "FeatureCollection", "features": [item("a", 1.0), item("b", 1.0)],
        "links": [{"rel": "next", "href": format!("{}/search?token=never", s.uri())}]
    });
    Mock::given(method("POST"))
        .respond_with(ResponseTemplate::new(200).set_body_json(page))
        .expect(1)
        .mount(&s)
        .await;
    let f = fetcher_for(&s, None);
    let out = stac::search(
        &f,
        &Catalog::Custom(url(&s, "/search")),
        &params(None, Some(2)),
        None,
    )
    .await
    .unwrap();
    assert_eq!(out.items.len(), 2);
    assert_eq!(out.pages, 1);
}

#[tokio::test]
async fn next_link_loop_is_detected() {
    let s = MockServer::start().await;
    let page = json!({
        "type": "FeatureCollection", "features": [item("a", 1.0)],
        "links": [{"rel": "next", "href": format!("{}/search?token=same", s.uri())}]
    });
    Mock::given(method("POST"))
        .respond_with(ResponseTemplate::new(200).set_body_json(page.clone()))
        .mount(&s)
        .await;
    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(200).set_body_json(page))
        .mount(&s)
        .await;
    let f = fetcher_for(&s, None);
    let err = stac::search(
        &f,
        &Catalog::Custom(url(&s, "/")),
        &params(None, None),
        None,
    )
    .await
    .unwrap_err();
    assert!(format!("{err:#}").contains("loops back"), "{err:#}");
}

#[tokio::test]
async fn next_link_to_off_list_host_is_rejected() {
    let s = MockServer::start().await;
    let page = json!({
        "type": "FeatureCollection", "features": [item("a", 1.0)],
        "links": [{"rel": "next", "href": "https://attacker.example/search?t=1"}]
    });
    Mock::given(method("POST"))
        .respond_with(ResponseTemplate::new(200).set_body_json(page))
        .mount(&s)
        .await;
    let f = fetcher_for(&s, None);
    let err = stac::search(
        &f,
        &Catalog::Custom(url(&s, "/")),
        &params(None, None),
        None,
    )
    .await
    .unwrap_err();
    assert!(format!("{err:#}").contains("attacker.example"), "{err:#}");
}

#[tokio::test]
async fn planetary_computer_key_sent_as_header_not_in_url() {
    let s = MockServer::start().await;
    Mock::given(method("POST"))
        .and(header("ocp-apim-subscription-key", "k-123"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(json!({"type": "FeatureCollection", "features": []})),
        )
        .expect(1)
        .mount(&s)
        .await;
    let f = fetcher_for(&s, None);
    let key = Secret::new("k-123");
    stac::search(
        &f,
        &Catalog::Custom(url(&s, "/")),
        &params(None, None),
        Some(&key),
    )
    .await
    .unwrap();
    let reqs = s.received_requests().await.unwrap();
    assert!(!reqs[0].url.as_str().contains("k-123"));
}

#[test]
fn catalog_presets_and_bodies() {
    assert_eq!(
        Catalog::parse("earth-search")
            .unwrap()
            .search_url()
            .as_str(),
        "https://earth-search.aws.element84.com/v1/search"
    );
    assert_eq!(
        Catalog::parse("planetary-computer")
            .unwrap()
            .allowed_hosts(),
        ["planetarycomputer.microsoft.com"]
    );
    assert!(Catalog::parse("http://insecure.example/stac").is_err());
    assert!(Catalog::parse("nonsense").is_err());
    let p = params(Some(20.0), None);
    let es = stac::build_body(&Catalog::EarthSearch, &p);
    assert_eq!(es["query"]["eo:cloud_cover"]["lte"], 20.0);
    let cdse = stac::build_body(&Catalog::Cdse, &p);
    assert_eq!(cdse["filter-lang"], "cql2-json");
    assert!(cdse.get("query").is_none());
}
