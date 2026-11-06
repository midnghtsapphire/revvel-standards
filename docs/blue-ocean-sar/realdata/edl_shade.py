"""Eye-Dome Lighting (EDL) for elevation grids and lidar points, viewed straight down.

EDL (Boucheny 2009; the shading Potree and CloudCompare use) darkens each pixel
by how much its neighbours sit closer to the camera, measured in log depth, so
edges, steps, cracks and pits stand out without any light direction. This
applies the same formula to a top-down view of the ground:

    depth(p)   = camera_height - z(p)              (camera above the highest point)
    response   = mean over 8 neighbours at `radius` cells of
                 max(0, log2 depth(p) - log2 depth(neighbour))
    shade      = exp(-response * 300 * strength)    (Potree's constants)

`strength` and `radius` mean what they mean in Potree (defaults 1.5 and 1.4, as
in the viewer snippet). Unlike a hillshade there is no sun azimuth, so a feature
is not hidden because it lies along the light.

Inputs:
  raster    any elevation GeoTIFF (lidar DTM/DSM, 3DEP, EA, Copernicus); nodata
            cells stay nodata
  points    a LAS/LAZ file (needs laspy, with lazrs for LAZ): points are binned
            to a grid at --res-m, keeping the highest (or, with --ground, the
            lowest class-2 ground) return per cell, then shaded

Outputs: <out>.tif (shade 0..1, same grid and CRS), <out>.png (shade x optional
hillshade, grey), <out>_manifest.json (inputs, SHA-256, parameters).

CLI::

    python edl_shade.py raster dem.tif --out dem_edl
    python edl_shade.py points tile.laz --res-m 0.5 --ground --crs EPSG:3857 --out tile_edl

Exit codes: 0 written; 2 bad input.
"""

import argparse
import hashlib
import json
import math
import os
import sys

import numpy as np


def edl(z, res, strength=1.5, radius=1.4, camera_height=None):
    """Shade (0..1, 1 = no occlusion) for elevation grid z with cell size res (m).
    NaN cells stay NaN and do not occlude their neighbours."""
    z = np.asarray(z, dtype="f8")
    if z.ndim != 2:
        raise ValueError("elevation grid must be 2-D")
    valid = ~np.isnan(z)
    if not valid.any():
        raise ValueError("elevation grid has no data")
    zmax = float(np.nanmax(z))
    # Default camera: 100 cells above the highest point, like a close Potree view.
    # Placing it a whole grid-width up made a 1 m step on a 3 km, 1 m grid shade by
    # under 0.5% (mean shade 0.998), i.e. invisible.
    h = camera_height if camera_height is not None else zmax + 100.0 * res
    if h <= zmax:
        raise ValueError("camera_height must be above the highest point")
    logd = np.log2(np.where(valid, h - z, np.nan))
    r = max(1, int(round(radius)))
    resp = np.zeros_like(z)
    n = np.zeros_like(z)
    for dy, dx in ((-r, -r), (-r, 0), (-r, r), (0, -r), (0, r), (r, -r), (r, 0), (r, r)):
        nb = np.full_like(z, np.nan)
        ys = slice(max(0, -dy), z.shape[0] - max(0, dy))
        xs = slice(max(0, -dx), z.shape[1] - max(0, dx))
        yd = slice(max(0, dy), z.shape[0] - max(0, -dy))
        xd = slice(max(0, dx), z.shape[1] - max(0, -dx))
        nb[ys, xs] = logd[yd, xd]
        ok = ~np.isnan(nb) & valid
        resp[ok] += np.maximum(0.0, logd[ok] - nb[ok])
        n[ok] += 1
    resp = np.where(n > 0, resp / np.maximum(n, 1), 0.0)
    shade = np.exp(-resp * 300.0 * strength)
    return np.where(valid, shade, np.nan)


def hillshade(z, res, azimuth=315.0, altitude=45.0):
    gy, gx = np.gradient(np.where(np.isnan(z), np.nanmean(z), z), res)
    slope = np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    az, alt = math.radians(azimuth), math.radians(altitude)
    hs = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
    return np.where(np.isnan(z), np.nan, np.clip(hs, 0, 1))


def grid_points(x, y, z, res, mode="max"):
    """Bin points to a north-up grid. Returns (z_grid, (x0, y_top), res)."""
    if len(x) == 0:
        raise ValueError("no points")
    x0, y1 = math.floor(x.min() / res) * res, math.ceil(y.max() / res) * res
    cols = ((x - x0) / res).astype(int)
    rows = ((y1 - y) / res).astype(int)
    shape = (rows.max() + 1, cols.max() + 1)
    flat = rows * shape[1] + cols
    out = np.full(shape[0] * shape[1], np.nan)
    order = np.argsort(z) if mode == "min" else np.argsort(-z)
    # first occurrence per cell after sorting = min or max z
    _, first = np.unique(flat[order], return_index=True)
    sel = order[first]
    out[flat[sel]] = z[sel]
    return out.reshape(shape), (x0, y1)


def read_points(path, ground=False):
    import laspy
    las = laspy.read(path)
    x, y, z = np.asarray(las.x), np.asarray(las.y), np.asarray(las.z)
    if ground:
        keep = np.asarray(las.classification) == 2
        if not keep.any():
            raise ValueError("no class-2 (ground) points in the file")
        x, y, z = x[keep], y[keep], z[keep]
    return x, y, z


def to_png(path, shade, hs=None):
    img = shade if hs is None else shade * (0.35 + 0.65 * hs)
    img = np.where(np.isnan(img), 0, np.clip(img, 0, 1))
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        plt.imsave(path, img, cmap="gray", vmin=0, vmax=1)
    except ImportError:
        import zlib
        import struct
        a = (img * 255).astype("u1")
        raw = b"".join(b"\x00" + row.tobytes() for row in a)

        def chunk(t, d):
            return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
        png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", a.shape[1], a.shape[0], 8, 0, 0, 0, 0))
        png += chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")
        with open(path, "wb") as fh:
            fh.write(png)


def write_tif(path, arr, transform, crs):
    import rasterio
    with rasterio.open(path, "w", driver="GTiff", width=arr.shape[1], height=arr.shape[0], count=1, dtype="float32",
                       crs=crs, transform=transform, nodata=-9999.0, compress="deflate") as dst:
        dst.write(np.where(np.isnan(arr), -9999.0, arr).astype("float32"), 1)


def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as fh:
        for b in iter(lambda: fh.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    s = p.add_subparsers(dest="cmd", required=True)
    for name in ("raster", "points"):
        q = s.add_parser(name)
        q.add_argument("path")
        q.add_argument("--out", required=True, help="output path without extension")
        q.add_argument("--strength", type=float, default=1.5)
        q.add_argument("--radius", type=float, default=1.4)
        q.add_argument("--camera-height", type=float, help="metres above datum; default: highest point + 100 cells")
        q.add_argument("--no-hillshade", action="store_true", help="PNG shows EDL alone")
    s.choices["points"].add_argument("--res-m", type=float, default=0.5)
    s.choices["points"].add_argument("--ground", action="store_true", help="class-2 ground returns, lowest per cell")
    s.choices["points"].add_argument("--crs", help="CRS of the points, written into the GeoTIFF (e.g. EPSG:3857)")
    a = p.parse_args(argv)
    try:
        if a.strength <= 0 or a.radius <= 0:
            raise ValueError("--strength and --radius must be > 0")
        if not os.path.isfile(a.path):
            raise ValueError(f"no such file: {a.path}")
        from rasterio.transform import from_origin
        if a.cmd == "raster":
            import rasterio
            with rasterio.open(a.path) as src:
                z = src.read(1).astype("f8")
                if src.nodata is not None:
                    z[z == src.nodata] = np.nan
                transform, crs = src.transform, src.crs
                res = abs(transform.a)
                if crs is not None and crs.is_geographic:
                    raise ValueError("raster is in degrees; reproject it to a metric CRS first")
            extra = {}
        else:
            if a.res_m <= 0:
                raise ValueError("--res-m must be > 0")
            x, y, zz = read_points(a.path, a.ground)
            z, (x0, y1) = grid_points(x, y, zz, a.res_m, "min" if a.ground else "max")
            res, transform, crs = a.res_m, from_origin(x0, y1, a.res_m, a.res_m), a.crs
            extra = {"points": int(len(zz)), "ground_only": a.ground, "cells_with_points": int((~np.isnan(z)).sum())}
        shade = edl(z, res, a.strength, a.radius, a.camera_height)
        hs = None if a.no_hillshade else hillshade(z, res)
    except (ValueError, OSError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    write_tif(a.out + ".tif", shade, transform, crs)
    to_png(a.out + ".png", shade, hs)
    man = {"input": {"path": a.path, "sha256": sha256(a.path)}, "mode": a.cmd, "res_m": res,
           "strength": a.strength, "radius": a.radius, "camera_height": a.camera_height,
           "outputs": [os.path.basename(a.out + ".tif"), os.path.basename(a.out + ".png")],
           "shade_mean": round(float(np.nanmean(shade)), 4), **extra}
    with open(a.out + "_manifest.json", "w") as fh:
        json.dump(man, fh, indent=1)
    print(json.dumps(man))
    return 0


if __name__ == "__main__":
    sys.exit(main())
