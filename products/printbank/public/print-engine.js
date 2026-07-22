/**
 * PrintBank print engine (UMD).
 * Deterministic — no Math.random, no Date.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PrintEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- Standard print sizes (inches) ----
  const SIZES = [
    { name: '4x6',   w: 4,    h: 6,    ratio: '2:3' },
    { name: '6x9',   w: 6,    h: 9,    ratio: '2:3' },
    { name: '8x12',  w: 8,    h: 12,   ratio: '2:3' },
    { name: '12x18', w: 12,   h: 18,   ratio: '2:3' },
    { name: '16x24', w: 16,   h: 24,   ratio: '2:3' },
    { name: '20x30', w: 20,   h: 30,   ratio: '2:3' },
    { name: '24x36', w: 24,   h: 36,   ratio: '2:3' },
    { name: '6x8',   w: 6,    h: 8,    ratio: '3:4' },
    { name: '9x12',  w: 9,    h: 12,   ratio: '3:4' },
    { name: '18x24', w: 18,   h: 24,   ratio: '3:4' },
    { name: '8x10',  w: 8,    h: 10,   ratio: '4:5' },
    { name: '11x14', w: 11,   h: 14,   ratio: '11:14' },
    { name: '16x20', w: 16,   h: 20,   ratio: '4:5' },
    { name: '5x7',   w: 5,    h: 7,    ratio: '5:7' },
    { name: '10x14', w: 10,   h: 14,   ratio: '5:7' },
    { name: '6x6',   w: 6,    h: 6,    ratio: '1:1' },
    { name: '10x10', w: 10,   h: 10,   ratio: '1:1' },
    { name: '12x12', w: 12,   h: 12,   ratio: '1:1' },
    { name: '20x20', w: 20,   h: 20,   ratio: '1:1' },
    { name: 'A4',    w: 8.27, h: 11.69, ratio: 'ISO' },
    { name: 'A3',    w: 11.69, h: 16.54, ratio: 'ISO' },
    { name: 'A2',    w: 16.54, h: 23.39, ratio: 'ISO' },
    { name: 'A1',    w: 23.39, h: 33.11, ratio: 'ISO' },
    { name: 'A0',    w: 33.11, h: 46.81, ratio: 'ISO' },
  ];

  const GENRES = ['abstract', 'botanical', 'geometric', 'celestial', 'minimal', 'typography', 'landscape', 'mandala'];

  // ---- DPI math ----
  function pixelsForSize(size, dpi) {
    return { w: Math.round(size.w * dpi), h: Math.round(size.h * dpi) };
  }

  function effectiveDpi(photoW, photoH, size) {
    // Center-crop to size ratio, compute DPI on the shorter dimension.
    const targetRatio = size.w / size.h;
    const photoRatio = photoW / photoH;
    let cropW, cropH;
    if (photoRatio > targetRatio) {
      cropH = photoH;
      cropW = Math.round(photoH * targetRatio);
    } else {
      cropW = photoW;
      cropH = Math.round(photoW / targetRatio);
    }
    const dpiW = cropW / size.w;
    const dpiH = cropH / size.h;
    return Math.min(dpiW, dpiH);
  }

  function gradeDpi(dpi) {
    if (dpi >= 300) return { grade: 'gallery',    label: 'Gallery (300+ DPI)',   ok: true };
    if (dpi >= 240) return { grade: 'excellent',  label: 'Excellent (240+ DPI)', ok: true };
    if (dpi >= 200) return { grade: 'good',       label: 'Good (200+ DPI)',      ok: true };
    if (dpi >= 150) return { grade: 'acceptable', label: 'Acceptable (150+ DPI)', ok: true };
    return { grade: 'low', label: 'Too low (< 150 DPI)', ok: false };
  }

  function gradePhotoForSize(photoW, photoH, size) {
    // Try both orientations; pick the better one.
    const straight = effectiveDpi(photoW, photoH, size);
    const rotated  = effectiveDpi(photoH, photoW, size);
    const dpi = Math.max(straight, rotated);
    const rotate = rotated > straight;
    return { dpi: Math.round(dpi), rotate, ...gradeDpi(dpi) };
  }

  function centerCropRect(photoW, photoH, size, rotate) {
    const w = rotate ? photoH : photoW;
    const h = rotate ? photoW : photoH;
    const targetRatio = size.w / size.h;
    const photoRatio = w / h;
    let cropW, cropH;
    if (photoRatio > targetRatio) {
      cropH = h;
      cropW = Math.round(h * targetRatio);
    } else {
      cropW = w;
      cropH = Math.round(w / targetRatio);
    }
    return { x: Math.round((w - cropW) / 2), y: Math.round((h - cropH) / 2), w: cropW, h: cropH };
  }

  // ---- Seeded PRNG (mulberry32) ----
  function seedFromString(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function palette(rng) {
    const hues = [rng() * 360, (rng() * 360 + 120) % 360, (rng() * 360 + 240) % 360];
    return hues.map(h => `hsl(${h.toFixed(0)}, ${(40 + rng() * 40).toFixed(0)}%, ${(35 + rng() * 30).toFixed(0)}%)`);
  }

  // ---- Vector art generators (return SVG string, viewBox 0 0 1000 1000) ----
  function genAbstract(rng, p) {
    let s = '';
    for (let i = 0; i < 8; i++) {
      const cx = rng() * 1000, cy = rng() * 1000, r = 80 + rng() * 300;
      s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${p[i % 3]}" fill-opacity="0.55"/>`;
    }
    return s;
  }
  function genBotanical(rng, p) {
    let s = `<rect width="1000" height="1000" fill="${p[2]}" fill-opacity="0.12"/>`;
    for (let i = 0; i < 12; i++) {
      const x = rng() * 1000, y = 200 + rng() * 800;
      const len = 200 + rng() * 400;
      s += `<path d="M${x.toFixed(1)},${y.toFixed(1)} q${(rng()*100-50).toFixed(1)},${(-len/2).toFixed(1)} 0,${(-len).toFixed(1)}" stroke="${p[0]}" stroke-width="3" fill="none"/>`;
      for (let j = 0; j < 5; j++) {
        const ly = y - (j+1) * len / 6;
        const lx = x + (j % 2 === 0 ? 30 : -30);
        s += `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="20" ry="40" fill="${p[1]}" fill-opacity="0.7"/>`;
      }
    }
    return s;
  }
  function genGeometric(rng, p) {
    let s = '';
    const grid = 6 + Math.floor(rng() * 4);
    const cell = 1000 / grid;
    for (let i = 0; i < grid; i++) {
      for (let j = 0; j < grid; j++) {
        const kind = Math.floor(rng() * 3);
        const c = p[Math.floor(rng() * 3)];
        if (kind === 0) s += `<rect x="${(i*cell).toFixed(1)}" y="${(j*cell).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" fill="${c}"/>`;
        else if (kind === 1) s += `<circle cx="${(i*cell+cell/2).toFixed(1)}" cy="${(j*cell+cell/2).toFixed(1)}" r="${(cell/2.2).toFixed(1)}" fill="${c}"/>`;
        else s += `<polygon points="${(i*cell).toFixed(1)},${(j*cell+cell).toFixed(1)} ${(i*cell+cell/2).toFixed(1)},${(j*cell).toFixed(1)} ${(i*cell+cell).toFixed(1)},${(j*cell+cell).toFixed(1)}" fill="${c}"/>`;
      }
    }
    return s;
  }
  function genCelestial(rng, p) {
    let s = `<rect width="1000" height="1000" fill="${p[0]}"/>`;
    for (let i = 0; i < 120; i++) {
      const x = rng() * 1000, y = rng() * 1000, r = rng() * 3 + 0.5;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#fff" fill-opacity="${(0.5 + rng() * 0.5).toFixed(2)}"/>`;
    }
    const mx = 500, my = 500, mr = 150 + rng() * 100;
    s += `<circle cx="${mx}" cy="${my}" r="${mr.toFixed(1)}" fill="${p[1]}" fill-opacity="0.9"/>`;
    return s;
  }
  function genMinimal(rng, p) {
    const y = 300 + rng() * 400;
    return `<rect width="1000" height="1000" fill="${p[2]}" fill-opacity="0.08"/>` +
           `<line x1="100" y1="${y.toFixed(1)}" x2="900" y2="${y.toFixed(1)}" stroke="${p[0]}" stroke-width="2"/>` +
           `<circle cx="${(200 + rng() * 600).toFixed(1)}" cy="${y.toFixed(1)}" r="40" fill="${p[1]}"/>`;
  }
  function genTypography(rng, p) {
    const words = ['DREAM', 'BLOOM', 'RISE', 'CALM', 'HOME', 'LOVE', 'BREATHE', 'WILD'];
    const w = words[Math.floor(rng() * words.length)];
    return `<rect width="1000" height="1000" fill="${p[2]}" fill-opacity="0.1"/>` +
           `<text x="500" y="560" text-anchor="middle" font-family="Georgia, serif" font-size="180" font-weight="bold" fill="${p[0]}">${w}</text>`;
  }
  function genLandscape(rng, p) {
    let s = `<rect width="1000" height="600" fill="${p[0]}" fill-opacity="0.6"/>`;
    s += `<rect y="600" width="1000" height="400" fill="${p[2]}" fill-opacity="0.5"/>`;
    let path = 'M0,600';
    for (let x = 0; x <= 1000; x += 50) {
      const y = 600 - (100 + rng() * 200);
      path += ` L${x},${y.toFixed(1)}`;
    }
    path += ' L1000,600 Z';
    s += `<path d="${path}" fill="${p[1]}" fill-opacity="0.8"/>`;
    return s;
  }
  function genMandala(rng, p) {
    const cx = 500, cy = 500;
    const petals = 8 + Math.floor(rng() * 8);
    let s = '';
    for (let ring = 1; ring <= 4; ring++) {
      const r = ring * 90;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(30 + rng() * 20).toFixed(1)}" fill="${p[ring % 3]}" fill-opacity="0.5"/>`;
      }
    }
    return s;
  }

  const GENERATORS = {
    abstract: genAbstract, botanical: genBotanical, geometric: genGeometric,
    celestial: genCelestial, minimal: genMinimal, typography: genTypography,
    landscape: genLandscape, mandala: genMandala
  };

  function generatePrint(id) {
    const rng = mulberry32(seedFromString(id));
    const genre = GENRES[Math.floor(rng() * GENRES.length)];
    const p = palette(rng);
    const body = GENERATORS[genre](rng, p);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
    return { id, genre, svg, palette: p };
  }

  function generateCatalog(count) {
    const out = [];
    for (let i = 1; i <= count; i++) out.push(generatePrint(`print-${String(i).padStart(4, '0')}`));
    return out;
  }

  return {
    SIZES, GENRES,
    pixelsForSize, effectiveDpi, gradeDpi, gradePhotoForSize, centerCropRect,
    seedFromString, mulberry32,
    generatePrint, generateCatalog,
  };
}));
