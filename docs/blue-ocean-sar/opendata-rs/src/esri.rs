//! Esri JSON -> GeoJSON (RFC 7946) conversion.
//!
//! Esri polygons are a flat list of rings where exterior rings are
//! clockwise and holes counter-clockwise. GeoJSON wants each polygon as
//! `[exterior, holes...]` with exterior counter-clockwise, so rings are
//! classified by signed area, holes are assigned to the exterior that
//! contains them, and every ring is reversed on output.

use serde_json::{json, Map, Value};

type Pos = Vec<f64>;
type Ring = Vec<Pos>;

fn position(v: &Value, dims: usize) -> Option<Pos> {
    let arr = v.as_array()?;
    if arr.len() < 2 {
        return None;
    }
    let p: Vec<f64> = arr
        .iter()
        .take(dims)
        .map(|n| n.as_f64())
        .collect::<Option<_>>()?;
    if p.len() < 2 || p.iter().any(|c| !c.is_finite()) {
        return None;
    }
    Some(p)
}

fn positions(v: &Value, dims: usize) -> Option<Vec<Pos>> {
    v.as_array()?.iter().map(|p| position(p, dims)).collect()
}

fn pos_json(p: &Pos) -> Value {
    Value::Array(p.iter().map(|c| json!(c)).collect())
}

fn line_json(l: &[Pos]) -> Value {
    Value::Array(l.iter().map(pos_json).collect())
}

/// Twice the signed area (shoelace). Positive = counter-clockwise.
fn signed_area2(ring: &[Pos]) -> f64 {
    let n = ring.len();
    if n < 3 {
        return 0.0;
    }
    (0..n)
        .map(|i| {
            let (a, b) = (&ring[i], &ring[(i + 1) % n]);
            a[0] * b[1] - b[0] * a[1]
        })
        .sum()
}

/// Even-odd point-in-ring test.
fn point_in_ring(pt: &Pos, ring: &[Pos]) -> bool {
    let (x, y) = (pt[0], pt[1]);
    let mut inside = false;
    let n = ring.len();
    let mut j = n.wrapping_sub(1);
    for i in 0..n {
        let (xi, yi) = (ring[i][0], ring[i][1]);
        let (xj, yj) = (ring[j][0], ring[j][1]);
        if (yi > y) != (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi {
            inside = !inside;
        }
        j = i;
    }
    inside
}

fn close_ring(mut r: Ring) -> Ring {
    if let (Some(first), Some(last)) = (r.first().cloned(), r.last()) {
        if *last != first {
            r.push(first);
        }
    }
    r
}

/// Convert Esri `rings` into a list of GeoJSON polygons (each a list of rings).
fn rings_to_polygons(rings: Vec<Ring>) -> Vec<Vec<Ring>> {
    let rings: Vec<Ring> = rings
        .into_iter()
        .filter(|r| r.len() >= 3)
        .map(close_ring)
        .collect();
    let mut outers: Vec<Vec<Ring>> = Vec::new();
    let mut holes: Vec<Ring> = Vec::new();
    for r in rings {
        let a = signed_area2(&r);
        if a < 0.0 {
            outers.push(vec![r]); // clockwise = Esri exterior
        } else if a > 0.0 {
            holes.push(r);
        }
    }
    if outers.is_empty() {
        // Mis-oriented input (all rings CCW): treat each as an exterior.
        // They are already CCW, which is what GeoJSON wants.
        return holes.into_iter().map(|h| vec![h]).collect();
    }
    for h in holes {
        match outers.iter_mut().find(|p| point_in_ring(&h[0], &p[0])) {
            Some(p) => p.push(h),
            None => outers.push(vec![h]), // orphan hole: promote to exterior
        }
    }
    for poly in outers.iter_mut() {
        for (i, ring) in poly.iter_mut().enumerate() {
            let ccw = signed_area2(ring) > 0.0;
            // exterior must be CCW, holes CW (RFC 7946 §3.1.6)
            if (i == 0) != ccw {
                ring.reverse();
            }
        }
    }
    outers
}

/// Convert one Esri geometry object to a GeoJSON geometry (or `null`).
pub fn geometry_to_geojson(g: &Value) -> Value {
    let Some(obj) = g.as_object() else {
        return Value::Null;
    };
    let dims = if obj.get("hasZ").and_then(Value::as_bool).unwrap_or(false) {
        3
    } else {
        2
    };
    if let (Some(x), Some(y)) = (obj.get("x"), obj.get("y")) {
        let (Some(x), Some(y)) = (x.as_f64(), y.as_f64()) else {
            return Value::Null; // empty point (x: null / "NaN")
        };
        let mut c = vec![json!(x), json!(y)];
        if dims == 3 {
            if let Some(z) = obj.get("z").and_then(Value::as_f64) {
                c.push(json!(z));
            }
        }
        return json!({"type": "Point", "coordinates": c});
    }
    if let Some(pts) = obj.get("points").and_then(|p| positions(p, dims)) {
        if pts.is_empty() {
            return Value::Null;
        }
        return json!({"type": "MultiPoint", "coordinates": line_json(&pts)});
    }
    if let Some(paths) = obj.get("paths").and_then(Value::as_array) {
        // let lines: Vec<Vec<Pos>> = paths
        //     .iter()
        //     .filter_map(|p| positions(p, dims))
        //     .filter(|l| l.len() >= 2)
        //     .collect();
        // Replaced (review 2026-10-16): all-or-null; a malformed path makes the geometry null instead of silently partial.
        let Some(parsed) = paths
            .iter()
            .map(|p| positions(p, dims))
            .collect::<Option<Vec<Vec<Pos>>>>()
        else {
            return Value::Null;
        };
        let lines: Vec<Vec<Pos>> = parsed.into_iter().filter(|l| l.len() >= 2).collect();
        return match lines.len() {
            0 => Value::Null,
            1 => json!({"type": "LineString", "coordinates": line_json(&lines[0])}),
            _ => json!({
                "type": "MultiLineString",
                "coordinates": lines.iter().map(|l| line_json(l)).collect::<Vec<_>>()
            }),
        };
    }
    if let Some(rings) = obj.get("rings").and_then(Value::as_array) {
        // let rings: Vec<Ring> = rings.iter().filter_map(|r| positions(r, dims)).collect();
        // Replaced (review 2026-10-16): all-or-null; dropping a malformed hole would turn it into a filled polygon.
        let Some(rings) = rings
            .iter()
            .map(|r| positions(r, dims))
            .collect::<Option<Vec<Ring>>>()
        else {
            return Value::Null;
        };
        let polys = rings_to_polygons(rings);
        let poly_json = |p: &Vec<Ring>| Value::Array(p.iter().map(|r| line_json(r)).collect());
        return match polys.len() {
            0 => Value::Null,
            1 => json!({"type": "Polygon", "coordinates": poly_json(&polys[0])}),
            _ => json!({
                "type": "MultiPolygon",
                "coordinates": polys.iter().map(poly_json).collect::<Vec<_>>()
            }),
        };
    }
    if let (Some(x0), Some(y0), Some(x1), Some(y1)) = (
        obj.get("xmin").and_then(Value::as_f64),
        obj.get("ymin").and_then(Value::as_f64),
        obj.get("xmax").and_then(Value::as_f64),
        obj.get("ymax").and_then(Value::as_f64),
    ) {
        return json!({"type": "Polygon", "coordinates": [[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]]});
    }
    Value::Null
}

/// Convert an Esri feature (`{attributes, geometry}`) to a GeoJSON Feature.
pub fn feature_to_geojson(f: &Value, oid_field: Option<&str>) -> Value {
    let attrs = f
        .get("attributes")
        .cloned()
        .unwrap_or(Value::Object(Map::new()));
    let geometry = f
        .get("geometry")
        .map(geometry_to_geojson)
        .unwrap_or(Value::Null);
    let mut out = Map::new();
    out.insert("type".into(), json!("Feature"));
    if let Some(id) = oid_field
        .and_then(|k| attrs.get(k))
        .filter(|v| v.is_number() || v.is_string())
    {
        out.insert("id".into(), id.clone());
    }
    out.insert("geometry".into(), geometry);
    out.insert("properties".into(), attrs);
    Value::Object(out)
}

pub fn feature_collection(features: Vec<Value>) -> Value {
    json!({"type": "FeatureCollection", "features": features})
}
