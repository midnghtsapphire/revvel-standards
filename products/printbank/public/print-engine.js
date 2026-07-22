// PrintBank engine — UMD (browser + node require)
// Deterministic: no Math.random / Date.now anywhere.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PrintEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Standard print sizes (inches unless noted). ISO A-series in mm converted.
  const MM_PER_IN = 25.4;
  const SIZES = [
    { name: '4x6', w: 4, h: 6, ratio: '2:3' },
    { name: '6x9', w: 6, h: 9, ratio: '2:3' },
    { name: '8x12', w: 8, h: 12, ratio: '2:3' },
    { name: '12x18', w: 12, h: 18, ratio: '2:3' },
    { name: '16x24', w: 16, h: 24, ratio: '2:3' },
    { name: '20x30', w: 20, h: 30, ratio: '2:3' },
    { name: '6x8', w: 6, h: 8, ratio: '3:4' },
    { name: '9x12', w: 9, h: 12, ratio: '3:4' },
    { name: '18x24', w: 18, h: 24, ratio: '3:4' },
    { name: '8x10', w: 8, h: 10, ratio: '4:5' },
    { name: '16x20', w: 16, h: 20, ratio: '4:5' },
    { name: '5x7', w: 5, h: 7, ratio: '5:7' },
    { name: '10x14', w: 10, h: 14, ratio: '5:7' },
    { name: '11x14', w: 11, h: 14, ratio: '11:14' },
    { name: '6x6', w: 6, h: 6, ratio: '1:1' },
    { name: '10x10', w: 10, h: 10, ratio: '1:1' },
    { name: '20x20', w: 20, h: 20, ratio: '1:1' },
    { name: 'A6', w: 105 / MM_PER_IN, h: 148 / MM_PER_IN, ratio: 'ISO' },
    { name: 'A5', w: 148 / MM_PER_IN, h: 210 / MM_PER_IN, ratio: 'ISO' },
    { name: 'A4', w: 210 / MM_PER_IN, h: 297 / MM_PER_IN, ratio: 'ISO' },
    { name: 'A3', w: 297 / MM_PER_IN, h: 420 / MM_PER_IN, ratio: 'ISO' },
    { name: 'A2', w: 420 / MM_PER_IN, h: 594 / MM_PER_IN, ratio: 'ISO' },
    { name: 'A1', w: 594 / MM_PER_IN, h: 841 / MM_PER_IN, ratio: 'ISO' },
    { name: 'A0', w: 841 / MM_PER_IN, h: 1189 / MM_PER_IN, ratio: 'ISO' },
  ];

  const GENRES = [
    'abstract', 'botanical', 'geometric', 'minimal',
    'celestial', 'landscape', 'typography', 'mandala',
  ];

  function pixelsForSize(size, dpi) {
    return { w: Math.round(size.w * dpi), h: Math.round(size.h * dpi) };
  }

  // Center-crop: fit source (sw x sh) into target aspect (tw x th).
  // Auto-rotate: if target orientation opposite of source, swap target.
  function cropForTarget(sw, sh, tw, th) {
    if (sw <= 0 || sh <= 0 || tw <= 0 || th <= 0) return null;
    const sPortrait = sh > sw;
    const tPortrait = th > tw;
    let TW = tw, TH = th;
    if (sPortrait !== tPortrait) { TW = th; TH = tw; }
    const targetRatio = TW / TH;
    const srcRatio = sw / sh;
    let cw, ch;
    if (srcRatio > targetRatio) {
      // source wider: crop width
      ch = sh;
      cw = Math.round(sh * targetRatio);
    } else {
      cw = sw;
      ch = Math.round(sw / targetRatio);
    }
    const x = Math.round((sw - cw) / 2);
    const y = Math.round((sh - ch) / 2);
    return { x, y, w: cw, h: ch, rotated: sPortrait !== tPortrait };
  }

  function effectiveDpi(sourcePx, sourceIn) {
    if (sourceIn <= 0) return 0;
    return sourcePx / sourceIn;
  }

  function grade(dpi) {
    if (dpi >= 300) return 'gallery';
    if (dpi >= 240) return 'excellent';
    if (dpi >= 180) return 'good';
    if (dpi >= 150) return 'acceptable';
    return 'low';
  }

  // Grade a photo against a size. Considers auto-rotate.
  function gradePhotoForSize(photoW, photoH, size) {
    const crop = cropForTarget(photoW, photoH, size.w, size.h);
    if (!crop) return { grade: 'low', dpi: 0, crop: null };
    // Effective DPI = short cropped edge / short target edge (after possible swap).
    const targetShortIn = Math.min(size.w, size.h);
    const cropShortPx = Math.min(crop.w, crop.h);
    const dpi = effectiveDpi(cropShortPx, targetShortIn);
    return { grade: grade(dpi), dpi: Math.round(dpi), crop };
  }

  // ---- Deterministic PRNG (mulberry32) ----
  function seedFrom(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const PALETTES = [
    ['#1a1a1a', '#f4f4f2', '#c9a961', '#7a8a5c'],
    ['#2b3a55', '#f5e6d3', '#e07856', '#8fa5a3'],
    ['#0f0f0f', '#e8dcc8', '#b3462e', '#525b3f'],
    ['#f7f3ec', '#1f3b4d', '#d4a373', '#606c5d'],
    ['#1d3557', '#e63946', '#f1faee', '#a8dadc'],
    ['#264653', '#2a9d8f', '#e9c46a', '#f4a261'],
    ['#22223b', '#4a4e69', '#c9ada7', '#f2e9e4'],
    ['#3d405b', '#e07a5f', '#f2cc8f', '#81b29a'],
  ];

  function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }

  function svgWrap(inner, opts) {
    const w = opts.w || 600, h = opts.h || 800, bg = opts.bg || '#f4f4f2';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">` +
      `<rect width="${w}" height="${h}" fill="${bg}"/>${inner}</svg>`;
  }

  function genAbstract(rand, pal, w, h) {
    let s = '';
    for (let i = 0; i < 8; i++) {
      const cx = rand() * w, cy = rand() * h;
      const r = 40 + rand() * 180;
      const c = pal[1 + Math.floor(rand() * (pal.length - 1))];
      const o = (0.3 + rand() * 0.5).toFixed(2);
      s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${c}" opacity="${o}"/>`;
    }
    return s;
  }
  function genBotanical(rand, pal, w, h) {
    let s = '';
    const cx = w / 2, cy = h - 40;
    s += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="60" stroke="${pal[3]}" stroke-width="4"/>`;
    const leaves = 8 + Math.floor(rand() * 6);
    for (let i = 0; i < leaves; i++) {
      const t = i / leaves;
      const y = 60 + t * (cy - 60);
      const side = i % 2 === 0 ? 1 : -1;
      const lw = 80 + rand() * 60;
      const lh = 20 + rand() * 15;
      s += `<ellipse cx="${(cx + side * lw / 2).toFixed(1)}" cy="${y.toFixed(1)}" rx="${(lw / 2).toFixed(1)}" ry="${lh.toFixed(1)}" fill="${pal[3]}" transform="rotate(${(side * (20 + rand() * 20)).toFixed(1)} ${cx + side * lw / 2} ${y})"/>`;
    }
    return s;
  }
  function genGeometric(rand, pal, w, h) {
    let s = '';
    const cols = 4 + Math.floor(rand() * 3);
    const rows = Math.round(cols * h / w);
    const cw = w / cols, ch = h / rows;
    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
      const c = pal[Math.floor(rand() * pal.length)];
      const shape = rand();
      if (shape < 0.33) {
        s += `<rect x="${x * cw}" y="${y * ch}" width="${cw}" height="${ch}" fill="${c}"/>`;
      } else if (shape < 0.66) {
        s += `<circle cx="${x * cw + cw / 2}" cy="${y * ch + ch / 2}" r="${Math.min(cw, ch) / 2}" fill="${c}"/>`;
      } else {
        s += `<polygon points="${x * cw},${y * ch + ch} ${x * cw + cw / 2},${y * ch} ${x * cw + cw},${y * ch + ch}" fill="${c}"/>`;
      }
    }
    return s;
  }
  function genMinimal(rand, pal, w, h) {
    const y = h * (0.3 + rand() * 0.4);
    return `<line x1="40" y1="${y.toFixed(1)}" x2="${w - 40}" y2="${y.toFixed(1)}" stroke="${pal[0]}" stroke-width="2"/>` +
      `<circle cx="${(w / 2).toFixed(1)}" cy="${(y - 80).toFixed(1)}" r="${(30 + rand() * 40).toFixed(1)}" fill="${pal[2]}"/>`;
  }
  function genCelestial(rand, pal, w, h) {
    let s = `<rect width="${w}" height="${h}" fill="${pal[0]}"/>`;
    for (let i = 0; i < 60; i++) {
      s += `<circle cx="${(rand() * w).toFixed(1)}" cy="${(rand() * h).toFixed(1)}" r="${(0.5 + rand() * 2).toFixed(2)}" fill="${pal[1]}"/>`;
    }
    s += `<circle cx="${(w / 2).toFixed(1)}" cy="${(h / 3).toFixed(1)}" r="${(60 + rand() * 40).toFixed(1)}" fill="${pal[2]}"/>`;
    return s;
  }
  function genLandscape(rand, pal, w, h) {
    let s = `<rect width="${w}" height="${h * 0.6}" fill="${pal[1]}"/>`;
    s += `<rect y="${h * 0.6}" width="${w}" height="${h * 0.4}" fill="${pal[3]}"/>`;
    const peaks = 3 + Math.floor(rand() * 3);
    let pts = `0,${h * 0.6} `;
    for (let i = 1; i <= peaks; i++) {
      const px = (w / peaks) * i - (w / peaks) / 2;
      const py = h * 0.6 - (100 + rand() * 200);
      pts += `${px.toFixed(0)},${py.toFixed(0)} `;
    }
    pts += `${w},${h * 0.6}`;
    s += `<polygon points="${pts}" fill="${pal[0]}"/>`;
    return s;
  }
  function genTypography(rand, pal, w, h) {
    const letters = ['A', 'B', 'M', 'K', 'S', 'R', 'H', 'N'];
    const ch = letters[Math.floor(rand() * letters.length)];
    return `<text x="${w / 2}" y="${h * 0.62}" font-family="Georgia, serif" font-size="${(Math.min(w, h) * 0.7).toFixed(0)}" text-anchor="middle" fill="${pal[0]}">${ch}</text>`;
  }
  function genMandala(rand, pal, w, h) {
    const cx = w / 2, cy = h / 2;
    const arms = 8 + Math.floor(rand() * 8);
    let s = '';
    for (let ring = 1; ring <= 5; ring++) {
      const r = (Math.min(w, h) / 2 - 20) * (ring / 5);
      const c = pal[ring % pal.length];
      s += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${c}" stroke-width="1.5"/>`;
      for (let a = 0; a < arms; a++) {
        const ang = (a / arms) * Math.PI * 2;
        const px = cx + Math.cos(ang) * r, py = cy + Math.sin(ang) * r;
        s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(3 + rand() * 4).toFixed(1)}" fill="${c}"/>`;
      }
    }
    return s;
  }

  const GEN = {
    abstract: genAbstract, botanical: genBotanical, geometric: genGeometric,
    minimal: genMinimal, celestial: genCelestial, landscape: genLandscape,
    typography: genTypography, mandala: genMandala,
  };

  function generatePrint(id) {
    const seed = seedFrom(String(id));
    const rand = rng(seed);
    const genre = GENRES[seed % GENRES.length];
    const pal = PALETTES[(seed >>> 8) % PALETTES.length];
    const w = 600, h = 800;
    const inner = GEN[genre](rand, pal, w, h);
    const svg = svgWrap(inner, { w, h, bg: pal[1] });
    return { id, genre, palette: pal, svg, title: `${genre.charAt(0).toUpperCase() + genre.slice(1)} №${id}` };
  }

  function generateCatalog(count) {
    const out = [];
    for (let i = 1; i <= count; i++) out.push(generatePrint(i));
    return out;
  }

  return {
    SIZES, GENRES, MM_PER_IN,
    pixelsForSize, cropForTarget, effectiveDpi, grade, gradePhotoForSize,
    generatePrint, generateCatalog, seedFrom, rng,
  };
});
