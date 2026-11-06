use opendata::esri::{feature_to_geojson, geometry_to_geojson};
use serde_json::{json, Value};

/// Twice the signed area; > 0 means counter-clockwise.
fn area2(ring: &Value) -> f64 {
    let r = ring.as_array().unwrap();
    let n = r.len();
    (0..n)
        .map(|i| {
            let (a, b) = (&r[i], &r[(i + 1) % n]);
            a[0].as_f64().unwrap() * b[1].as_f64().unwrap()
                - b[0].as_f64().unwrap() * a[1].as_f64().unwrap()
        })
        .sum()
}

#[test]
fn point_and_empty_point() {
    assert_eq!(
        geometry_to_geojson(&json!({"x": 1.5, "y": -2.0, "spatialReference": {"wkid": 4326}})),
        json!({"type": "Point", "coordinates": [1.5, -2.0]})
    );
    assert_eq!(
        geometry_to_geojson(&json!({"x": null, "y": null})),
        Value::Null
    );
    assert_eq!(
        geometry_to_geojson(&json!({"x": 1, "y": 2, "z": 3, "hasZ": true})),
        json!({"type": "Point", "coordinates": [1.0, 2.0, 3.0]})
    );
}

#[test]
fn multipoint() {
    assert_eq!(
        geometry_to_geojson(&json!({"points": [[0, 0], [1, 1]]})),
        json!({"type": "MultiPoint", "coordinates": [[0.0, 0.0], [1.0, 1.0]]})
    );
}

#[test]
fn polyline_single_and_multi() {
    assert_eq!(
        geometry_to_geojson(&json!({"paths": [[[0, 0], [1, 1], [2, 1]]]})),
        json!({"type": "LineString", "coordinates": [[0.0, 0.0], [1.0, 1.0], [2.0, 1.0]]})
    );
    let g = geometry_to_geojson(&json!({"paths": [[[0, 0], [1, 1]], [[5, 5], [6, 6]]]}));
    assert_eq!(g["type"], "MultiLineString");
    assert_eq!(g["coordinates"].as_array().unwrap().len(), 2);
}

#[test]
fn polygon_with_hole_is_reoriented_for_rfc7946() {
    // Esri: exterior clockwise, hole counter-clockwise.
    let esri = json!({"rings": [
        [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]],
        [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]]
    ]});
    let g = geometry_to_geojson(&esri);
    assert_eq!(g["type"], "Polygon");
    let rings = g["coordinates"].as_array().unwrap();
    assert_eq!(rings.len(), 2, "hole must be attached to its exterior");
    assert!(area2(&rings[0]) > 0.0, "exterior must be CCW");
    assert!(area2(&rings[1]) < 0.0, "hole must be CW");
    assert_eq!(
        rings[0][0],
        rings[0][rings[0].as_array().unwrap().len() - 1]
    );
}

#[test]
fn two_exteriors_make_a_multipolygon_and_holes_go_to_the_right_one() {
    let esri = json!({"rings": [
        [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]],
        [[20, 0], [20, 10], [30, 10], [30, 0], [20, 0]],
        [[22, 2], [24, 2], [24, 4], [22, 4], [22, 2]]
    ]});
    let g = geometry_to_geojson(&esri);
    assert_eq!(g["type"], "MultiPolygon");
    let polys = g["coordinates"].as_array().unwrap();
    assert_eq!(polys.len(), 2);
    assert_eq!(polys[0].as_array().unwrap().len(), 1);
    assert_eq!(
        polys[1].as_array().unwrap().len(),
        2,
        "hole belongs to the second exterior"
    );
    for p in polys {
        assert!(area2(&p[0]) > 0.0);
    }
}

#[test]
fn unclosed_ring_is_closed() {
    let g = geometry_to_geojson(&json!({"rings": [[[0, 0], [0, 1], [1, 1], [1, 0]]]}));
    let ring = g["coordinates"][0].as_array().unwrap();
    assert_eq!(ring.len(), 5);
    assert_eq!(ring[0], ring[4]);
}

#[test]
fn envelope_becomes_polygon() {
    let g = geometry_to_geojson(&json!({"xmin": 0, "ymin": 0, "xmax": 2, "ymax": 1}));
    assert_eq!(g["type"], "Polygon");
    assert!(area2(&g["coordinates"][0]) > 0.0);
}

#[test]
fn feature_conversion_keeps_attributes_and_id() {
    let f = feature_to_geojson(
        &json!({"attributes": {"FID": 7, "name": "x"}, "geometry": {"x": 1, "y": 2}}),
        Some("FID"),
    );
    assert_eq!(f["type"], "Feature");
    assert_eq!(f["id"], 7);
    assert_eq!(f["properties"]["name"], "x");
    let nogeom = feature_to_geojson(&json!({"attributes": {"a": 1}}), None);
    assert_eq!(nogeom["geometry"], Value::Null);
    assert!(nogeom.get("id").is_none());
}

// Added (review 2026-10-16): a malformed part makes the whole geometry null
// rather than a silently partial one.
#[test]
fn malformed_hole_or_path_yields_null_not_partial_geometry() {
    let esri = json!({"rings": [
        [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]],
        [[2, 2], ["bad", 2], [4, 4], [2, 4], [2, 2]]
    ]});
    assert_eq!(geometry_to_geojson(&esri), Value::Null);
    let esri = json!({"paths": [[[0, 0], [1, 1]], [[5, 5], [null, 6]]]});
    assert_eq!(geometry_to_geojson(&esri), Value::Null);
}
