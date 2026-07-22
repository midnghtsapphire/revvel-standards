/*!
 * PrintBank print-engine
 * UMD: works in browser (window.PrintEngine) and Node (require).
 * Deterministic — no Math.random or Date usage.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PrintEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // --- Standard print size catalog (inches) ---
  const SIZES = [
    // 2:3
    { name: '4x6',   w: 4,  h: 6,  ratio: '2:3' },
    { name: '6x9',   w: 6,  h: 9,  ratio: '2:3' },
    { name: '8x12',  w: 8,  h: 12, ratio: '2:3' },
    { name: '12x18', w: 12, h: 18, ratio: '2:3' },
    { name: '16x24', w: 16, h: 24, ratio: '2:3' },
    { name: '20x30', w: 20, h: 30, ratio: '2:3' },
    { name: '24x36', w: 24, h: 36, ratio: '2:3' },
    // 3:4
    { name: '6x8',   w: 6,  h: 8,  ratio: '3:4' },
    { name: '9x12',  w: 9,  h: 12, ratio: '3:4' },
    { name: '12x16', w: 12, h: 16, ratio: '3:4' },
    { name: '18x24', w: 18, h: 24, ratio: '3:4' },
    // 4:5
    { name: '4x5',   w: 4,  h: 5,  ratio: '4:5' },
    { name: '8x10',  w: 8,  h: 10, ratio: '4:5' },
    { name: '16x20', w: 16, h: 20, ratio: '4:5' },
    { name: '24x30', w: 24, h: 30, ratio: '4:5' },
    // 5:7
    { name: '5x7',   w: 5,  h: 7,  ratio: '5:7' },
    { name: '10x14', w: 10, h: 14, ratio: '5:7' },
    // 11x14
    { name: '11x14', w: 11, h: 14, ratio: '11:14' },
    // Squares
    { name: '6x6',   w: 6,  h: 6,  ratio: '1:1' },
    { name: '10x10', w: 10, h: 10, ratio: '1:1' },
    { name: '20x20', w: 20, h: 20, ratio: '1:1' },
    // ISO A-series (inches, approx)
    { name: 'A4',    w: 8.27,  h: 11.69, ratio: 'ISO' },
    { name: 'A3',    w: 11.69, h: 16.54, ratio: 'ISO' },
    { name: 'A2',    w: 16.54, h: 23.39, ratio: 'ISO' },
    { name: 'A1',    w: 23.39, h: 33.11, ratio: 'ISO' },
    { name: 'A0',    w: 33.11, h: 46.81, ratio: 'ISO' }
  ];

  function getSizes() { return SIZES.slice(); }
  function getSize(name) { return SIZES.find(s => s.name === name) || null; }

  // pixels needed at a target DPI for a size in inches
  function pixelsForSize(sizeInches, dpi) {
    return {
      w: Math.round(sizeInches.w * dpi),
      h: Math.round(sizeInches.h * dpi)
    };
  }

  // effective DPI when a source image is cropped to fit a target size
  // auto-rotates source to best-fit (portrait/landscape).
  function effectiveDpi(sourcePx, targetInches) {
    const sw = sourcePx.w, sh = sourcePx.h;
    const tw = targetInches.w, th = targetInches.h;
    // try both orientations, keep whichever preserves more pixels post-crop
    const orient = (a, b) => {
      const targetRatio = tw / th;
      const srcRatio = a / b;
      let cropW, cropH;
      if (srcRatio > targetRatio) {
        // source too wide → crop width
        cropH = b;
        cropW = Math.round(b * targetRatio);
      } else {
        // source too tall → crop height
        cropW = a;
        cropH = Math.round(a / targetRatio);
      }
      const dpiW = cropW / tw;
      const dpiH = cropH / th;
      return { dpi: Math.min(dpiW, dpiH), cropW, cropH, rotated: false };
    };
    const a = orient(sw, sh);
    const b = orient(sh, sw); b.rotated = true;
    return a.dpi >= b.dpi ? a : b;
  }

  // Photo quality grade for a given source at a given target size
  function gradePhoto(sourcePx, targetInches) {
    const e = effectiveDpi(sourcePx, targetInches);
    const dpi = e.dpi;
    let grade;
    if (dpi >= 300) grade = 'gallery';
    else if (dpi >= 240) grade = 'excellent';
    else if (dpi >= 200) grade = 'good';
    else if (dpi >= 150) grade = 'acceptable';
    else grade = 'low';
    return {
      grade,
      dpi: Math.round(dpi * 10) / 10,
      cropW: e.cropW,
      cropH: e.cropH,
      rotated: e.rotated,
      printable: dpi >= 150
    };
  }

  // --- Deterministic PRNG (mulberry32) ---
  function seededRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  const GENRES = [
    'abstract', 'botanical', 'geometric', 'minimal',
    'boho', 'landscape', 'celestial', 'typography'
  ];

  const PALETTES = {
    abstract:   ['#0f172a', '#f97316', '#fde68a', '#f5f5f4'],
    botanical:  ['#14532d', '#4d7c0f', '#a3e635', '#f7fee7'],
    geometric:  ['#1e293b', '#38bdf8', '#f472b6', '#fef3c7'],
    minimal:    ['#111827', '#6b7280', '#e5e7eb', '#ffffff'],
    boho:       ['#7c2d12', '#c2410c', '#fbbf24', '#fef3c7'],
    landscape:  ['#0c4a6e', '#0284c7', '#fcd34d', '#fde68a'],
    celestial:  ['#020617', '#3730a3', '#c084fc', '#fef9c3'],
    typography: ['#000000', '#ffffff', '#dc2626', '#e5e7eb']
  };

  // Deterministic SVG generator. Aspect ratio 2:3 for print flexibility.
  function generatePrint(id, genre) {
    if (!GENRES.includes(genre)) throw new Error('unknown genre: ' + genre);
    const seed = hashSeed(genre + ':' + id);
    const rng = seededRng(seed);
    const W = 600, H = 900;
    const pal = PALETTES[genre];
    const bg = pal[3];
    let body = '';
    switch (genre) {
      case 'abstract': {
        for (let i = 0; i < 6; i++) {
          const cx = Math.round(rng() * W);
          const cy = Math.round(rng() * H);
          const r  = Math.round(60 + rng() * 200);
          const c  = pal[i % 3];
          const o  = (0.3 + rng() * 0.5).toFixed(2);
          body += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" opacity="${o}"/>`;
        }
        break;
      }
      case 'botanical': {
        for (let i = 0; i < 8; i++) {
          const x = Math.round(rng() * W);
          const y = Math.round(rng() * H);
          const rx = Math.round(20 + rng() * 40);
          const ry = Math.round(60 + rng() * 100);
          const rot = Math.round(rng() * 360);
          const c = pal[i % 3];
          body += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" transform="rotate(${rot} ${x} ${y})" opacity="0.75"/>`;
        }
        break;
      }
      case 'geometric': {
        for (let i = 0; i < 10; i++) {
          const x = Math.round(rng() * W);
          const y = Math.round(rng() * H);
          const s = Math.round(40 + rng() * 120);
          const c = pal[i % 3];
          const rot = Math.round(rng() * 90);
          body += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${c}" transform="rotate(${rot} ${x} ${y})" opacity="0.85"/>`;
        }
        break;
      }
      case 'minimal': {
        const y1 = Math.round(H * (0.3 + rng() * 0.4));
        body += `<rect x="0" y="0" width="${W}" height="${y1}" fill="${pal[2]}"/>`;
        body += `<circle cx="${Math.round(W/2)}" cy="${Math.round(y1*0.6)}" r="${Math.round(60+rng()*80)}" fill="${pal[0]}"/>`;
        break;
      }
      case 'boho': {
        for (let i = 0; i < 5; i++) {
          const y = Math.round((i + 1) * (H / 6));
          const c = pal[i % 3];
          body += `<rect x="40" y="${y}" width="${W-80}" height="${Math.round(20+rng()*40)}" fill="${c}" opacity="0.8"/>`;
        }
        break;
      }
      case 'landscape': {
        body += `<rect x="0" y="0" width="${W}" height="${Math.round(H*0.55)}" fill="${pal[1]}"/>`;
        body += `<circle cx="${Math.round(W*0.75)}" cy="${Math.round(H*0.25)}" r="${Math.round(60+rng()*40)}" fill="${pal[2]}"/>`;
        let pts = `0,${H} `;
        for (let x = 0; x <= W; x += 60) {
          const y = Math.round(H*0.55 + rng()*120);
          pts += `${x},${y} `;
        }
        pts += `${W},${H}`;
        body += `<polygon points="${pts}" fill="${pal[0]}"/>`;
        break;
      }
      case 'celestial': {
        body += `<rect x="0" y="0" width="${W}" height="${H}" fill="${pal[0]}"/>`;
        for (let i = 0; i < 40; i++) {
          const cx = Math.round(rng() * W);
          const cy = Math.round(rng() * H);
          const r  = Math.round(1 + rng() * 3);
          body += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${pal[3]}"/>`;
        }
        body += `<circle cx="${Math.round(W/2)}" cy="${Math.round(H/2)}" r="${Math.round(80+rng()*60)}" fill="${pal[2]}" opacity="0.85"/>`;
        break;
      }
      case 'typography': {
        const words = ['DREAM','BLOOM','WANDER','QUIET','RISE','HOME','BREATHE','GATHER'];
        const word = words[Math.floor(rng() * words.length)];
        body += `<rect x="0" y="0" width="${W}" height="${H}" fill="${pal[1]}"/>`;
        body += `<text x="${W/2}" y="${H/2}" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, serif" font-size="120" fill="${pal[0]}">${word}</text>`;
        break;
      }
    }
    const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>${body}</svg>`;
    return { id: `${genre}-${id}`, genre, title: titleFor(genre, id, rng), svg, width: W, height: H };
  }

  function titleFor(genre, id, rng) {
    const adj = ['Soft','Bold','Quiet','Bright','Deep','Wild','Calm','Warm'];
    const noun = {
      abstract: ['Composition','Study','Fragment','Motion'],
      botanical: ['Fern','Leaf','Garden','Frond'],
      geometric: ['Grid','Form','Angle','Field'],
      minimal: ['Horizon','Void','Whisper','Line'],
      boho: ['Weave','Sun','Sand','Loom'],
      landscape: ['Ridge','Valley','Dune','Bay'],
      celestial: ['Moon','Cosmos','Nebula','Star'],
      typography: ['Word','Print','Note','Mark']
    }[genre];
    return `${adj[Math.floor(rng()*adj.length)]} ${noun[Math.floor(rng()*noun.length)]} №${id}`;
  }

  // Build the reproducible catalog. Default 144 prints (18/genre).
  function buildCatalog(perGenre) {
    perGenre = perGenre || 18;
    const out = [];
    for (const g of GENRES) {
      for (let i = 1; i <= perGenre; i++) {
        out.push(generatePrint(i, g));
      }
    }
    return out;
  }

  return {
    SIZES,
    GENRES,
    getSizes,
    getSize,
    pixelsForSize,
    effectiveDpi,
    gradePhoto,
    generatePrint,
    buildCatalog,
    _internal: { hashSeed, seededRng }
  };
}));
