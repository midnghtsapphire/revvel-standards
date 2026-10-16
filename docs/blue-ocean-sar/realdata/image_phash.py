#!/usr/bin/env python3
"""Perceptual hashes of real image files, and pairwise distances.

Computes a 64-bit DCT pHash and a 64-bit dHash for each image and the Hamming
distance between every pair. This replaces the hard-coded hashes in
image_comparison_features.csv: it only ever reports hashes of files it opened.

What it can and can't tell you:
  - Small distance (pHash <= ~8 of 64 bits): the same photo, or a resized,
    recompressed or lightly edited copy of it.
  - It does NOT recognise the same dog or person in two different photos;
    different shots of the same animal usually score as far apart as
    unrelated images.

Example:
  python image_phash.py photos/*.jpg --out hashes.csv --pairs pairs.csv
"""

import argparse
import csv
import hashlib
import itertools
import sys

import numpy as np
from PIL import Image, ImageOps
from scipy.fft import dct


def phash(img, hash_size=8, highfreq=4):
    g = ImageOps.exif_transpose(img).convert("L").resize(
        (hash_size * highfreq, hash_size * highfreq), Image.Resampling.LANCZOS)
    a = np.asarray(g, dtype="f8")
    d = dct(dct(a, axis=0, norm="ortho"), axis=1, norm="ortho")[:hash_size, :hash_size]
    med = np.median(d.ravel()[1:])  # skip the DC term
    return (d > med).ravel()


def dhash(img, hash_size=8):
    g = ImageOps.exif_transpose(img).convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    a = np.asarray(g, dtype="f8")
    return (a[:, 1:] > a[:, :-1]).ravel()


def bits_hex(bits):
    return f"{int(''.join('1' if b else '0' for b in bits), 2):016x}"


def hamming(a, b):
    return int(np.count_nonzero(a != b))


def describe(path):
    with open(path, "rb") as f:
        raw = f.read()
    with Image.open(path) as im:
        im.load()
        ph, dh = phash(im), dhash(im)
        size = im.size
    return {"file": path, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw),
            "width": size[0], "height": size[1], "phash": bits_hex(ph), "dhash": bits_hex(dh),
            "_ph": ph, "_dh": dh}


def verdict(ph_dist):
    if ph_dist == 0:
        return "identical_or_resaved_copy"
    if ph_dist <= 8:
        return "likely_same_photo_edited_or_resized"
    if ph_dist <= 14:
        return "possibly_related_check_by_eye"
    return "different_images"


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("images", nargs="+")
    ap.add_argument("--out", required=True, help="per-image hash CSV")
    ap.add_argument("--pairs", help="pairwise distance CSV")
    a = ap.parse_args(argv)
    rows = [describe(p) for p in a.images]
    cols = ["file", "sha256", "bytes", "width", "height", "phash", "dhash"]
    with open(a.out, "w", newline="") as f:
        w = csv.DictWriter(f, cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    if a.pairs:
        with open(a.pairs, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["file_a", "file_b", "phash_distance", "dhash_distance", "verdict"])
            for x, y in itertools.combinations(rows, 2):
                pd_ = hamming(x["_ph"], y["_ph"])
                w.writerow([x["file"], y["file"], pd_, hamming(x["_dh"], y["_dh"]), verdict(pd_)])
    print(f"hashed {len(rows)} images -> {a.out}" + (f", pairs -> {a.pairs}" if a.pairs else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
