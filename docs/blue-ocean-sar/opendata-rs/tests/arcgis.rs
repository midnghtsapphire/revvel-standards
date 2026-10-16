mod common;

use std::time::Duration;

use common::{fetcher_for, url};
use opendata::arcgis::{self, validate_layer_url, QueryParams};
use opendata::geo::Bbox;
use serde_json::{json, Value};
use wiremock::matchers::{method, path, query_param};
use wiremock::{Mock, MockServer, ResponseTemplate};

const LAYER: &str = "/arcgis/rest/services/Roads/FeatureServer/0";

fn params(page_size: usize) -> QueryParams {
    QueryParams {
        where_clause: "1=1".into(),
        out_fields: "*".into(),
        bbox: Some(Bbox::parse("-88,30,-87,31").unwrap()),
        server_geojson: false,
        page_size,
        concurrency: 3,
        max_features: 1000,
    }
}

fn esri_point(oid: i64) -> Value {
    json!({"attributes": {"OBJECTID": oid, "name": format!("p{oid}")},
           "geometry": {"x": -87.5 + oid as f64 * 0.01, "y": 30.5}})
}

async fn mount_meta(s: &MockServer, max_record_count: u64) {
    Mock::given(method("GET"))
        .and(path(LAYER))
        .and(query_param("f", "json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "id": 0, "name": "Roads", "maxRecordCount": max_record_count,
            "objectIdField": "OBJECTID",
            "advancedQueryCapabilities": {"supportsPagination": true}
        })))
        .mount(s)
        .await;
}

async fn mount_count(s: &MockServer, n: u64) {
    Mock::given(path(format!("{LAYER}/query")))
        .and(query_param("returnCountOnly", "true"))
        .and(query_param("geometryType", "esriGeometryEnvelope"))
        .and(query_param("inSR", "4326"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({"count": n})))
        .expect(1)
        .mount(s)
        .await;
}

async fn mount_page(
    s: &MockServer,
    offset: u64,
    count: u64,
    features: Vec<Value>,
    exceeded: bool,
    delay_ms: u64,
) {
    Mock::given(path(format!("{LAYER}/query")))
        .and(query_param("resultOffset", offset.to_string()))
        .and(query_param("resultRecordCount", count.to_string()))
        .and(query_param("orderByFields", "OBJECTID"))
        .and(query_param("outSR", "4326"))
        .and(query_param("f", "json"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(json!({
                    "objectIdFieldName": "OBJECTID",
                    "geometryType": "esriGeometryPoint",
                    "features": features,
                    "exceededTransferLimit": exceeded
                }))
                .set_delay(Duration::from_millis(delay_ms)),
        )
        .expect(1)
        .mount(s)
        .await;
}

fn oids(fc: &Value) -> Vec<i64> {
    fc["features"]
        .as_array()
        .unwrap()
        .iter()
        .map(|f| f["properties"]["OBJECTID"].as_i64().unwrap())
        .collect()
}

#[tokio::test]
async fn pages_concurrently_and_preserves_order() {
    let s = MockServer::start().await;
    mount_meta(&s, 2).await;
    mount_count(&s, 5).await;
    // First page is slowest, so completion order != offset order.
    mount_page(&s, 0, 2, vec![esri_point(1), esri_point(2)], true, 300).await;
    mount_page(&s, 2, 2, vec![esri_point(3), esri_point(4)], true, 0).await;
    mount_page(&s, 4, 1, vec![esri_point(5)], false, 0).await;
    let f = fetcher_for(&s, None);
    let out = arcgis::query(&f, &url(&s, LAYER), &params(100))
        .await
        .unwrap();
    assert_eq!(out.collection["type"], "FeatureCollection");
    assert_eq!(oids(&out.collection), [1, 2, 3, 4, 5]);
    assert_eq!(out.expected_count, Some(5));
    assert_eq!(out.pages, 3);
    let f0 = &out.collection["features"][0];
    assert_eq!(f0["id"], 1);
    assert_eq!(f0["geometry"]["type"], "Point");
    assert_eq!(f0["geometry"]["coordinates"], json!([-87.49, 30.5]));
}

#[tokio::test]
async fn short_page_with_exceeded_transfer_limit_is_gap_filled() {
    let s = MockServer::start().await;
    // Advertises 4 per page but the server actually caps at 2.
    mount_meta(&s, 4).await;
    mount_count(&s, 5).await;
    mount_page(&s, 0, 4, vec![esri_point(1), esri_point(2)], true, 0).await;
    mount_page(&s, 2, 2, vec![esri_point(3), esri_point(4)], false, 0).await;
    mount_page(&s, 4, 1, vec![esri_point(5)], false, 0).await;
    let f = fetcher_for(&s, None);
    let out = arcgis::query(&f, &url(&s, LAYER), &params(100))
        .await
        .unwrap();
    assert_eq!(oids(&out.collection), [1, 2, 3, 4, 5]);
    assert_eq!(out.pages, 3);
}

#[tokio::test]
async fn arcgis_error_body_with_http_200_fails() {
    let s = MockServer::start().await;
    mount_meta(&s, 2).await;
    Mock::given(path(format!("{LAYER}/query")))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "error": {"code": 400, "message": "Invalid where clause"}
        })))
        .mount(&s)
        .await;
    let f = fetcher_for(&s, None);
    let err = arcgis::query(&f, &url(&s, LAYER), &params(100))
        .await
        .unwrap_err();
    assert!(
        format!("{err:#}").contains("Invalid where clause"),
        "{err:#}"
    );
}

#[tokio::test]
async fn server_geojson_mode_passes_features_through() {
    let s = MockServer::start().await;
    mount_meta(&s, 1000).await;
    mount_count(&s, 1).await;
    Mock::given(path(format!("{LAYER}/query")))
        .and(query_param("f", "geojson"))
        .and(query_param("resultOffset", "0"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "type": "FeatureCollection",
            "features": [{"type": "Feature", "id": 9,
                          "geometry": {"type": "Point", "coordinates": [1.0, 2.0]},
                          "properties": {"OBJECTID": 9}}],
            "properties": {"exceededTransferLimit": false}
        })))
        .expect(1)
        .mount(&s)
        .await;
    let f = fetcher_for(&s, None);
    let mut p = params(100);
    p.server_geojson = true;
    let out = arcgis::query(&f, &url(&s, LAYER), &p).await.unwrap();
    assert_eq!(out.collection["features"][0]["id"], 9);
}

#[tokio::test]
async fn max_features_guard() {
    let s = MockServer::start().await;
    mount_meta(&s, 2).await;
    mount_count(&s, 5000).await;
    let f = fetcher_for(&s, None);
    let err = arcgis::query(&f, &url(&s, LAYER), &params(100))
        .await
        .unwrap_err();
    assert!(format!("{err:#}").contains("max-features"), "{err:#}");
}

#[test]
fn layer_url_validation() {
    for ok in [
        "https://services.arcgis.com/abc/arcgis/rest/services/Roads/FeatureServer/0",
        "https://gis.example.gov/arcgis/rest/services/Hydro/MapServer/12/",
        "https://gis.example.gov/server/rest/services/x/featureserver/3",
    ] {
        assert!(validate_layer_url(ok).is_ok(), "{ok}");
    }
    for bad in [
        "http://gis.example.gov/arcgis/rest/services/Roads/FeatureServer/0",
        "https://gis.example.gov/arcgis/rest/services/Roads/FeatureServer",
        "https://gis.example.gov/arcgis/rest/services/Roads/FeatureServer/0/query",
        "https://gis.example.gov/arcgis/rest/services/Roads/ImageServer/0",
        "https://gis.example.gov/arcgis/rest/services/Roads/FeatureServer/abc",
        "https://gis.example.gov/arcgis/rest/services/Roads/FeatureServer/0?f=json",
        "https://user:pw@gis.example.gov/arcgis/rest/services/Roads/FeatureServer/0",
        "ftp://gis.example.gov/arcgis/rest/services/Roads/FeatureServer/0",
        "not a url",
    ] {
        assert!(validate_layer_url(bad).is_err(), "{bad}");
    }
}
