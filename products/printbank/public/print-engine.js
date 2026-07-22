// PrintBank Print Engine
// UMD module: works in browser (window.PrintEngine) and Node (require)
// Fully deterministic — no Math.random, no Date-based randomness.

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PrintEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Standard print sizes (inches). Grouped by aspect ratio family.
  const SIZES = [
    // 2:3
    { name: '4x6', w: 4, h: 6, family: '2:3' },
    { name: '6x9', w: 6, h: 9, family: '2:3' },
    { name: '8x12', w: 8, h: 12, family: '2:3' },
    { name: '12x18', w: 12, h: 18, family: '2:3' },
    { name: '16x24', w: 16, h: 24, family: '2:3' },
    { name: '20x30', w: 20, h: 30, family: '2:3' },
    { name: '24x36', w: 24, h: 36, family: '2:3' },
    // 3:4
    { name: '6x8', w: 6, h: 8, family: '3:4' },
    { name: '9x12', w: 9, h: 12, family: '3:4' },
    { name: '12x16', w: 12, h: 16, family: '3:4' },
    { name: '18x24', w: 18, h: 24, family: '3:4' },
    // 4:5
    { name: '8x10', w: 8, h: 10, family: '4:5' },
    { name: '11x14', w: 11, h: 14, family: '4:5' },
    { name: '16x20', w: 16, h: 20, family: '4:5' },
    // 5:7
    { name: '5x7', w: 5, h: 7, family: '5:7' },
    // Square
    { name: '5x5', w: 5, h: 5, family: '1:1' },
    { name: '8x8', w: 8, h: 8, family: '1:1' },
    { name: '12x12', w: 12, h: 12, family: '1:1' },
    { name: '20x20', w: 20, h: 20, family: '1:1' },
    // ISO A-series (mm → in)
    { name: 'A4', w: 8.27, h: 11.69, family: 'ISO' },
    { name: 'A3', w: 11.69, h: 16.54, family: 'ISO' },
    { name: 'A2', w: 16.54, h: 23.39, family: 'ISO' },
    { name: 'A1', w: 23.39, h: 33.11, family: 'ISO' },
    { name: 'A0', w: 33.11, h: 46.81, family: 'ISO' }
  ];

  function getSizes() {
    return SIZES.slice();
  }

  function getSize(name) {
    return SIZES.find((s) => s.name === name) || null;
  }

  // Pixels required for a given print size at a given DPI.
  function pixelsForSize(size, dpi) {
    return {
      w: Math.round(size.w * dpi),
      h: Math.round(size.h * dpi)
    };
  }

  // Given a photo of pxW × pxH and a target print size (inches),
  // compute center-crop rectangle preserving print aspect, and effective DPI.
  // Auto-rotates the target if photo is landscape and size is portrait (or vice versa).
  function computeCrop(pxW, pxH, size) {
    if (!pxW || !pxH || !size) return null;
    const photoLandscape = pxW >= pxH;
    let tw = size.w;
    let th = size.h;
    const sizeLandscape = tw >= th;
    if (photoLandscape !== sizeLandscape) {
      const t = tw;
      tw = th;
      th = t;
    }
    const targetAspect = tw / th;
    const photoAspect = pxW / pxH;
    let cropW;
    let cropH;
    if (photoAspect > targetAspect) {
      // photo is wider — crop width
      cropH = pxH;
      cropW = Math.round(pxH * targetAspect);
    } else {
      cropW = pxW;
      cropH = Math.round(pxW / targetAspect);
    }
    const x = Math.round((pxW - cropW) / 2);
    const y = Math.round((pxH - cropH) / 2);
    const effectiveDpi = Math.min(cropW / tw, cropH / th);
    return {
      x,
      y,
      w: cropW,
      h: cropH,
      printW: tw,
      printH: th,
      rotated: photoLandscape !== sizeLandscape,
      effectiveDpi: Math.round(effectiveDpi * 10) / 10
    };
  }

  // Grade a print based on effective DPI.
  function gradeDpi(dpi) {
    if (dpi >= 300) return { grade: 'gallery', label: 'Gallery (300+ DPI)', ok: true };
    if (dpi >= 240) return { grade: 'excellent', label: 'Excellent (240-299 DPI)', ok: true };
    if (dpi >= 200) return { grade: 'good', label: 'Good (200-239 DPI)', ok: true };
    if (dpi >= 150) return { grade: 'acceptable', label: 'Acceptable (150-199 DPI)', ok: true };
    return { grade: 'low', label: 'Low (<150 DPI) — do not print', ok: false };
  }

  function gradePhoto(pxW, pxH, size) {
    const crop = computeCrop(pxW, pxH, size);
    if (!crop) return null;
    return Object.assign({}, crop, gradeDpi(crop.effectiveDpi));
  }

  // Grade a photo against every standard size.
  function gradeAllSizes(pxW, pxH) {
    return SIZES.map((s) => ({ size: s, result: gradePhoto(pxW, pxH, s) }));
  }

  // ---------- Deterministic seeded RNG (mulberry32) ----------
  function seedFromString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Vector art generators ----------
  const GENRES = [
    'abstract-geometric',
    'minimal-lines',
    'botanical',
    'celestial',
    'mountain-landscape',
    'wave-ocean',
    'mandala',
    'typographic'
  ];

  const PALETTES = [
    ['#0f172a', '#1e293b', '#f1f5f9', '#f59e0b'],
    ['#052e16', '#166534', '#dcfce7', '#84cc16'],
    ['#1e1b4b', '#4338ca', '#e0e7ff', '#f472b6'],
    ['#78350f', '#c2410c', '#fed7aa', '#fef3c7'],
    ['#111827', '#374151', '#f9fafb', '#ef4444'],
    ['#134e4a', '#0f766e', '#ccfbf1', '#fbbf24']
  ];

  function pickPalette(rand) {
    return PALETTES[Math.floor(rand() * PALETTES.length)];
  }

  function genAbstractGeometric(rand, W, H, palette) {
    const parts = [`<rect width="${W}" height="${H}" fill="${palette[2]}"/>`];
    const n = 6 + Math.floor(rand() * 6);
    for (let i = 0; i < n; i++) {
      const x = rand() * W;
      const y = rand() * H;
      const s = 40 + rand() * (Math.min(W, H) * 0.4);
      const color = palette[Math.floor(rand() * palette.length)];
      const shape = rand();
      const opacity = (0.4 + rand() * 0.6).toFixed(2);
      if (shape < 0.33) {
        parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(s / 2).toFixed(1)}" fill="${color}" opacity="${opacity}"/>`);
      } else if (shape < 0.66) {
        parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" fill="${color}" opacity="${opacity}"/>`);
      } else {
        const x2 = x + s;
        const y2 = y + s;
        const x3 = x - s / 2;
        const y3 = y + s;
        parts.push(`<polygon points="${x.toFixed(1)},${y.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${x3.toFixed(1)},${y3.toFixed(1)}" fill="${color}" opacity="${opacity}"/>`);
      }
    }
    return parts.join('');
  }

  function genMinimalLines(rand, W, H, palette) {
    const parts = [`<rect width="${W}" height="${H}" fill="${palette[2]}"/>`];
    const n = 8 + Math.floor(rand() * 8);
    const stroke = palette[0];
    for (let i = 0; i < n; i++) {
      const y = (H / (n + 1)) * (i + 1);
      const w = 0.4 + rand() * 1.6;
      const x1 = W * 0.1 + rand() * W * 0.2;
      const x2 = W * 0.7 + rand() * W * 0.2;
      parts.push(`<line x1="${x1.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${stroke}" stroke-width="${w.toFixed(2)}" stroke-linecap="round"/>`);
    }
    return parts.join('');
  }

  function genBotanical(rand, W, H, palette) {
    const parts = [`<rect width="${W}" height="${H}" fill="${palette[2]}"/>`];
    const cx = W / 2;
    const stem = palette[1];
    parts.push(`<line x1="${cx}" y1="${H * 0.95}" x2="${cx}" y2="${H * 0.2}" stroke="${stem}" stroke-width="3"/>`);
    const leaves = 6 + Math.floor(rand() * 6);
    for (let i = 0; i < leaves; i++) {
      const y = H * 0.25 + (H * 0.65 * i) / leaves;
      const side = i % 2 === 0 ? 1 : -1;
      const len = 40 + rand() * 60;
      const ex = cx + side * len;
      const ey = y - 15 - rand() * 15;
      parts.push(`<path d="M ${cx} ${y.toFixed(1)} Q ${(cx + (side * len) / 2).toFixed(1)} ${(y - 30).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="${stem}" stroke-width="2" fill="none"/>`);
      parts.push(`<ellipse cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" rx="${(len / 3).toFixed(1)}" ry="${(len / 6).toFixed(1)}" fill="${palette[3]}" opacity="0.7" transform="rotate(${(side * 30).toFixed(0)} ${ex.toFixed(1)} ${ey.toFixed(1)})"/>`);
    }
    return parts.join('');
  }

  function genCelestial(rand, W, H, palette) {
    const parts = [`<rect width="${W}" height="${H}" fill="${palette[0]}"/>`];
    const moonR = Math.min(W, H) * 0.2;
    parts.push(`<circle cx="${(W / 2).toFixed(1)}" cy="${(H / 2).toFixed(1)}" r="${moonR.toFixed(1)}" fill="${palette[2]}"/>`);
    const stars = 30 + Math.floor(rand() * 30);
    for (let i = 0; i < stars; i++) {
      const x = rand() * W;
      const y = rand() * H;
      const r = 0.5 + rand() * 2;
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${palette[2]}" opacity="${(0.4 + rand() * 0.6).toFixed(2)}"/>`);
    }
    return parts.join('');
  }

  function genMountainLandscape(rand, W, H, palette) {
    const parts = [`<rect width="${W}" height="${H}" fill="${palette[2]}"/>`];
    // sun
    parts.push(`<circle cx="${(W * 0.5).toFixed(1)}" cy="${(H * 0.35).toFixed(1)}" r="${(Math.min(W, H) * 0.12).toFixed(1)}" fill="${palette[3]}"/>`);
    const layers = 3;
    for (let l = 0; l < layers; l++) {
      const baseY = H * (0.55 + l * 0.12);
      const color = l === 0 ? palette[1] : l === 1 ? palette[0] : palette[0];
      let d = `M 0 ${baseY.toFixed(1)}`;
      const peaks = 4 + Math.floor(rand() * 3);
      for (let p = 0; p <= peaks; p++) {
        const x = (W / peaks) * p;
        const y = baseY - (30 + rand() * 80);
        d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      d += ` L ${W} ${H} L 0 ${H} Z`;
      parts.push(`<path d="${d}" fill="${color}" opacity="${(0.7 + l * 0.1).toFixed(2)}"/>`);
    }
    return parts.join('');
  }

  function genWaveOcean(rand, W, H, palette) {
    const parts = [`<rect width="${W}" height="${H}" fill="${palette[2]}"/>`];
    const waves = 6 + Math.floor(rand() * 4);
    for (let i = 0; i < waves; i++) {
      const y = (H / (waves + 1)) * (i + 1);
      const amp = 8 + rand() * 20;
      let d = `M 0 ${y.toFixed(1)}`;
      const segs = 8;
      for (let s = 1; s <= segs; s++) {
        const x = (W / segs) * s;
        const yy = y + (s % 2 === 0 ? -amp : amp);
        const cx = x - W / segs / 2;
        d += ` Q ${cx.toFixed(1)} ${yy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      parts.push(`<path d="${d}" stroke="${palette[1]}" stroke-width="${(1 + rand() * 2).toFixed(2)}" fill="none" opacity="${(0.4 + rand() * 0.5).toFixed(2)}"/>`);
    }
    return parts.join('');
  }

  function genMandala(rand, W, H, palette) {
    const parts = [`<rect width="${W}" height="${H}" fill="${palette[2]}"/>`];
    const cx = W / 2;
    const cy = H / 2;
    const rings = 4 + Math.floor(rand() * 3);
    for (let r = 1; r <= rings; r++) {
      const radius = (Math.min(W, H) * 0.45 * r) / rings;
      const petals = 6 + r * 2;
      const color = palette[r % palette.length];
      for (let p = 0; p < petals; p++) {
        const a = ((Math.PI * 2) / petals) * p;
        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius;
        const pr = (Math.min(W, H) * 0.03) + rand() * 4;
        parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${pr.toFixed(2)}" fill="${color}" opacity="0.7"/>`);
      }
    }
    return parts.join('');
  }

  function genTypographic(rand, W, H, palette) {
    const words = ['DREAM', 'CREATE', 'BREATHE', 'WANDER', 'STILLNESS', 'HOME', 'GATHER', 'ALWAYS'];
    const word = words[Math.floor(rand() * words.length)];
    const parts = [`<rect width="${W}" height="${H}" fill="${palette[2]}"/>`];
    const fontSize = Math.min(W, H) * 0.18;
    parts.push(
      `<text x="${(W / 2).toFixed(1)}" y="${(H / 2).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, serif" font-size="${fontSize.toFixed(0)}" fill="${palette[0]}" letter-spacing="4">${word}</text>`
    );
    parts.push(
      `<line x1="${(W * 0.3).toFixed(1)}" y1="${(H * 0.62).toFixed(1)}" x2="${(W * 0.7).toFixed(1)}" y2="${(H * 0.62).toFixed(1)}" stroke="${palette[3]}" stroke-width="2"/>`
    );
    return parts.join('');
  }

  const GENERATORS = {
    'abstract-geometric': genAbstractGeometric,
    'minimal-lines': genMinimalLines,
    botanical: genBotanical,
    celestial: genCelestial,
    'mountain-landscape': genMountainLandscape,
    'wave-ocean': genWaveOcean,
    mandala: genMandala,
    typographic: genTypographic
  };

  // Generate SVG for a print by id (deterministic).
  function generateSvg(id, opts) {
    opts = opts || {};
    const W = opts.width || 800;
    const H = opts.height || 1000;
    const seed = seedFromString(id);
    const rand = mulberry32(seed);
    const genre = opts.genre || GENRES[seed % GENRES.length];
    const gen = GENERATORS[genre] || genAbstractGeometric;
    const palette = pickPalette(rand);
    const body = gen(rand, W, H, palette);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
  }

  // Build the print catalog — 144 prints, deterministic.
  function buildCatalog(count) {
    const n = count || 144;
    const out = [];
    for (let i = 0; i < n; i++) {
      const genre = GENRES[i % GENRES.length];
      const num = String(i + 1).padStart(3, '0');
      const id = `pb-${genre}-${num}`;
      out.push({
        id,
        title: titleFor(genre, i),
        genre,
        tags: tagsFor(genre)
      });
    }
    return out;
  }

  const TITLES = {
    'abstract-geometric': ['Composition', 'Structure', 'Assembly', 'Fragment', 'Construct'],
    'minimal-lines': ['Horizon', 'Whisper', 'Cadence', 'Pause', 'Line Study'],
    botanical: ['Fern', 'Wildflower', 'Sprig', 'Meadow', 'Leaflet'],
    celestial: ['Moonrise', 'Night Sky', 'Constellation', 'Lunar', 'Orbit'],
    'mountain-landscape': ['Ridge', 'Summit', 'Valley', 'Range', 'Peak'],
    'wave-ocean': ['Tide', 'Current', 'Shore', 'Swell', 'Deep'],
    mandala: ['Bloom', 'Circle', 'Radiance', 'Halo', 'Wheel'],
    typographic: ['Word', 'Manifest', 'Declaration', 'Verse', 'Motto']
  };

  function titleFor(genre, i) {
    const list = TITLES[genre] || ['Print'];
    return `${list[i % list.length]} No. ${String(Math.floor(i / list.length) + 1).padStart(2, '0')}`;
  }

  function tagsFor(genre) {
    const map = {
      'abstract-geometric': ['abstract', 'geometric', 'modern'],
      'minimal-lines': ['minimal', 'line-art', 'scandi'],
      botanical: ['botanical', 'plants', 'nature'],
      celestial: ['celestial', 'moon', 'stars'],
      'mountain-landscape': ['landscape', 'mountains', 'nature'],
      'wave-ocean': ['ocean', 'waves', 'coastal'],
      mandala: ['mandala', 'boho', 'symmetry'],
      typographic: ['typography', 'quote', 'words']
    };
    return map[genre] || [];
  }

  return {
    SIZES,
    GENRES,
    getSizes,
    getSize,
    pixelsForSize,
    computeCrop,
    gradeDpi,
    gradePhoto,
    gradeAllSizes,
    generateSvg,
    buildCatalog,
    seedFromString,
    mulberry32
  };
});
