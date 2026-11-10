mod common;

use common::{fetcher_for, fixture, url};
use opendata::cams;
use wiremock::matchers::path;
use wiremock::{Mock, MockServer, ResponseTemplate};

#[test]
fn radius_search_over_fixture_sorted_by_distance() {
    let cat = fixture("cams_usa_sample.json");
    let hits = cams::near(&cat, 30.6954, -88.0399, 10.0, 50).unwrap();
    let names: Vec<&str> = hits
        .iter()
        .map(|h| h.description.as_deref().unwrap())
        .collect();
    assert_eq!(names, ["Downtown Mobile", "I-10 at Broad St"]);
    assert!(hits[0].distance_km <= hits[1].distance_km);
    assert_eq!(hits[0].region, ["Alabama", "Mobile"]);
    let hits = cams::near(&cat, 30.6954, -88.0399, 10.0, 1).unwrap();
    assert_eq!(hits.len(), 1);
    assert!(cams::near(&cat, 95.0, 0.0, 1.0, 1).is_err());
    assert!(cams::near(&cat, 0.0, 0.0, -1.0, 1).is_err());
}

#[test]
fn country_is_validated_against_path_tricks() {
    let base = url::Url::parse(cams::CATALOGUE_BASE).unwrap();
    assert_eq!(
        cams::catalogue_url(&base, "USA").unwrap().as_str(),
        "https://raw.githubusercontent.com/AidanWelch/OpenTrafficCamMap/master/cameras/USA.json"
    );
    for bad in ["../x", "U", "USA/../../etc", "a b", "%2e%2e"] {
        assert!(cams::catalogue_url(&base, bad).is_err(), "{bad}");
    }
}

#[tokio::test]
async fn fetches_catalogue_through_fetcher() {
    let s = MockServer::start().await;
    Mock::given(path("/cameras/USA.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(fixture("cams_usa_sample.json")))
        .expect(1)
        .mount(&s)
        .await;
    let f = fetcher_for(&s, None);
    let hits = cams::fetch_and_search(
        &f,
        &url(&s, "/cameras/"),
        "USA",
        30.6954,
        -88.0399,
        10.0,
        10,
    )
    .await
    .unwrap();
    assert_eq!(hits.len(), 2);
}
