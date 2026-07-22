// PrintBank Print Engine
// UMD module: works in browser (window.PrintEngine) and Node (require)
// Deterministic: no Math.random, no Date. Seeded PRNG only.

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PrintEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Standard print sizes in inches. width x height (portrait canonical).
  const SIZES = [
    { name: '4x6',    w: 4,  h: 6,  ratio: '2:3' },
    { name: '6x9',    w: 6,  h: 9,  ratio: '2:3' },
    { name: '8x12',   w: 8,  h: 12, ratio: '2:3' },
    { name: '12x18',  w: 12, h: 18, ratio: '2:3' },
    { name: '16x24',  w: 16, h: 24, ratio: '2:3' },
    { name: '20x30',  w: 20, h: 30, ratio: '2:3' },
    { name: '24x36',  w: 24, h: 36, ratio: '2:3' },
    { name: '6x8',    w: 6,  h: 8,  ratio: '3:4' },
    { name: '9x12',   w: 9,  h: 12, ratio: '3:4' },
    { name: '12x16',  w: 12, h: 16, ratio: '3:4' },
    { name: '18x24',  w: 18, h: 24, ratio: '3:4' },
    { name: '8x10',   w: 8,  h: 10, ratio: '4:5' },
    { name: '11x14',  w: 11, h: 14, ratio: '11:14' },
    { name: '16x20',  w: 16, h: 20, ratio: '4:5' },
    { name: '5x7',    w: 5,  h: 7,  ratio: '5:7' },
    { name: '10x10',  w: 10, h: 10, ratio: '1:1' },
    { name: '12x12',  w: 12, h: 12, ratio: '1:1' },
    { name: '20x20',  w: 20, h: 20, ratio: '1:1' },
    { name: 'A6',     w: 4.13,  h: 5.83,  ratio: 'ISO' },
    { name: 'A5',     w: 5.83,  h: 8.27,  ratio: 'ISO' },
    { name: 'A4',     w: 8.27,  h: 11.69, ratio: 'ISO' },
    { name: 'A3',     w: 11.69, h: 16.54, ratio: 'ISO' },
    { name: 'A2',     w: 16.54, h: 23.39, ratio: 'ISO' },
    { name: 'A1',     w: 23.39, h: 33.11, ratio: 'ISO' }
  ];

  const GENRES = [
    'abstract-geometric',
    'minimalist-lines',
    'botanical-vector',
    'celestial',
    'boho-arch',
    'mid-century',
    'wave-topo',
    'typography'
  ];

  // Mulberry32 seeded PRNG — deterministic.
  function prng(seed) {
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      let x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  // Pixel math
  function pixelsForSize(sizeName, dpi) {
    const s = SIZES.find(x => x.name === sizeName);
    if (!s) throw new Error('Unknown size: ' + sizeName);
    return {
      w: Math.round(s.w * dpi),
      h: Math.round(s.h * dpi)
    };
  }

  // Center-crop math: given source (sw, sh) and target aspect (tw, th),
  // return crop rectangle inside source.
  function centerCrop(sw, sh, tw, th) {
    const srcRatio = sw / sh;
    const tgtRatio = tw / th;
    let cw, ch, cx, cy;
    if (srcRatio > tgtRatio) {
      // source is wider; crop sides
      ch = sh;
      cw = Math.round(sh * tgtRatio);
      cx = Math.round((sw - cw) / 2);
      cy = 0;
    } else {
      cw = sw;
      ch = Math.round(sw / tgtRatio);
      cx = 0;
      cy = Math.round((sh - ch) / 2);
    }
    return { x: cx, y: cy, w: cw, h: ch };
  }

  // Effective DPI after center-crop for a given photo → print size.
  // Auto-rotates: if photo landscape and size portrait (or vice versa), swaps.
  function gradePhotoForSize(photoW, photoH, sizeName) {
    const size = SIZES.find(x => x.name === sizeName);
    if (!size) throw new Error('Unknown size: ' + sizeName);
    let sw = photoW, sh = photoH;
    const photoLandscape = sw > sh;
    const sizeLandscape = size.w > size.h;
    let tw = size.w, th = size.h;
    if (photoLandscape !== sizeLandscape) {
      // rotate target so orientation matches photo
      tw = size.h; th = size.w;
    }
    const crop = centerCrop(sw, sh, tw, th);
    // effective DPI = cropped pixels / target inches (long edge)
    const dpiW = crop.w / tw;
    const dpiH = crop.h / th;
    const effectiveDpi = Math.min(dpiW, dpiH);
    let grade;
    if (effectiveDpi >= 300) grade = 'gallery';
    else if (effectiveDpi >= 240) grade = 'excellent';
    else if (effectiveDpi >= 180) grade = 'good';
    else if (effectiveDpi >= 150) grade = 'acceptable';
    else grade = 'low';
    return {
      size: sizeName,
      effectiveDpi: Math.round(effectiveDpi * 10) / 10,
      grade,
      crop,
      rotated: photoLandscape !== sizeLandscape,
      printReady: effectiveDpi >= 150
    };
  }

  // Palettes indexed by seed
  const PALETTES = [
    ['#F5E6D3', '#D4A574', '#8B5A3C', '#2C1810'],
    ['#E8F0F2', '#A8DADC', '#457B9D', '#1D3557'],
    ['#FFF3E0', '#FFB74D', '#F57C00', '#4E342E'],
    ['#F0F4E8', '#A3B565', '#5A7A3C', '#2D3A1F'],
    ['#FBE9E7', '#FF8A65', '#D84315', '#3E2723'],
    ['#ECEFF1', '#90A4AE', '#455A64', '#263238'],
    ['#FFF8E1', '#FFD54F', '#F9A825', '#4E342E'],
    ['#F3E5F5', '#BA68C8', '#7B1FA2', '#311B92']
  ];

  function pickPalette(rand) {
    return PALETTES[Math.floor(rand() * PALETTES.length)];
  }

  // SVG generators per genre. All accept (rand, palette, w, h) and return inner SVG.
  function genAbstractGeometric(rand, pal, w, h) {
    const shapes = [];
    const n = 6 + Math.floor(rand() * 6);
    for (let i = 0; i < n; i++) {
      const cx = rand() * w;
      const cy = rand() * h;
      const r = 40 + rand() * Math.min(w, h) * 0.25;
      const c = pal[1 + Math.floor(rand() * 3)];
      const op = 0.5 + rand() * 0.4;
      if (rand() < 0.5) {
        shapes.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${c}" opacity="${op.toFixed(2)}"/>`);
      } else {
        const rw = r * (1 + rand());
        const rh = r * (1 + rand());
        shapes.push(`<rect x="${(cx - rw / 2).toFixed(1)}" y="${(cy - rh / 2).toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${c}" opacity="${op.toFixed(2)}"/>`);
      }
    }
    return shapes.join('');
  }

  function genMinimalistLines(rand, pal, w, h) {
    const lines = [];
    const n = 4 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) {
      const y = (h / (n + 1)) * (i + 1) + (rand() - 0.5) * 20;
      const sw = 2 + rand() * 4;
      lines.push(`<line x1="${(w * 0.1).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(w * 0.9).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${pal[3]}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round"/>`);
    }
    return lines.join('');
  }

  function genBotanical(rand, pal, w, h) {
    const stems = [];
    const n = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const x = (w / (n + 1)) * (i + 1);
      const y0 = h * 0.9;
      const y1 = h * (0.2 + rand() * 0.3);
      stems.push(`<line x1="${x.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${pal[2]}" stroke-width="3"/>`);
      const leaves = 4 + Math.floor(rand() * 4);
      for (let j = 0; j < leaves; j++) {
        const ly = y0 - ((y0 - y1) / leaves) * (j + 1);
        const side = j % 2 === 0 ? -1 : 1;
        const lx = x + side * (20 + rand() * 30);
        stems.push(`<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${(15 + rand() * 15).toFixed(1)}" ry="${(6 + rand() * 6).toFixed(1)}" fill="${pal[1]}" transform="rotate(${(side * 30).toFixed(0)} ${lx.toFixed(1)} ${ly.toFixed(1)})"/>`);
      }
    }
    return stems.join('');
  }

  function genCelestial(rand, pal, w, h) {
    const parts = [];
    // moon
    const mx = w * (0.3 + rand() * 0.4);
    const my = h * (0.25 + rand() * 0.3);
    const mr = Math.min(w, h) * 0.15;
    parts.push(`<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="${mr.toFixed(1)}" fill="${pal[1]}"/>`);
    parts.push(`<circle cx="${(mx + mr * 0.3).toFixed(1)}" cy="${my.toFixed(1)}" r="${mr.toFixed(1)}" fill="${pal[0]}"/>`);
    const stars = 20 + Math.floor(rand() * 20);
    for (let i = 0; i < stars; i++) {
      parts.push(`<circle cx="${(rand() * w).toFixed(1)}" cy="${(rand() * h).toFixed(1)}" r="${(1 + rand() * 2).toFixed(1)}" fill="${pal[3]}"/>`);
    }
    return parts.join('');
  }

  function genBohoArch(rand, pal, w, h) {
    const parts = [];
    const aw = w * 0.6;
    const ah = h * 0.7;
    const ax = (w - aw) / 2;
    const ay = h - ah - h * 0.05;
    parts.push(`<path d="M ${ax} ${ay + ah} L ${ax} ${ay + aw / 2} A ${aw / 2} ${aw / 2} 0 0 1 ${ax + aw} ${ay + aw / 2} L ${ax + aw} ${ay + ah} Z" fill="${pal[2]}"/>`);
    // inner arch
    const iw = aw * 0.75;
    const ih = ah * 0.85;
    const ix = (w - iw) / 2;
    const iy = ay + (aw - iw) / 2 + (ah - ih) * 0.5;
    parts.push(`<path d="M ${ix} ${iy + ih} L ${ix} ${iy + iw / 2} A ${iw / 2} ${iw / 2} 0 0 1 ${ix + iw} ${iy + iw / 2} L ${ix + iw} ${iy + ih} Z" fill="${pal[1]}"/>`);
    return parts.join('');
  }

  function genMidCentury(rand, pal, w, h) {
    const parts = [];
    const n = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const cx = rand() * w;
      const cy = rand() * h;
      const r = 30 + rand() * 80;
      parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${pal[1 + Math.floor(rand() * 3)]}"/>`);
    }
    // triangle
    const tx = rand() * w;
    const ty = rand() * h;
    const ts = 60 + rand() * 60;
    parts.push(`<polygon points="${tx},${ty} ${tx + ts},${ty} ${tx + ts / 2},${ty - ts * 0.87}" fill="${pal[3]}"/>`);
    return parts.join('');
  }

  function genWaveTopo(rand, pal, w, h) {
    const parts = [];
    const n = 8 + Math.floor(rand() * 6);
    for (let i = 0; i < n; i++) {
      const y = (h / n) * i + rand() * 10;
      const amp = 10 + rand() * 20;
      const wl = 60 + rand() * 60;
      let d = `M 0 ${y.toFixed(1)}`;
      for (let x = 0; x <= w; x += wl / 4) {
        d += ` L ${x.toFixed(1)} ${(y + Math.sin(x / wl * Math.PI * 2) * amp).toFixed(1)}`;
      }
      parts.push(`<path d="${d}" fill="none" stroke="${pal[2]}" stroke-width="1.5" opacity="0.7"/>`);
    }
    return parts.join('');
  }

  function genTypography(rand, pal, w, h) {
    const words = ['BREATHE', 'HOME', 'HELLO', 'STAY', 'DREAM', 'WILD', 'CALM', 'GATHER'];
    const word = words[Math.floor(rand() * words.length)];
    const fs = Math.min(w, h) * 0.18;
    return `<text x="${(w / 2).toFixed(1)}" y="${(h / 2).toFixed(1)}" font-family="Georgia, serif" font-size="${fs.toFixed(1)}" font-weight="bold" fill="${pal[3]}" text-anchor="middle" dominant-baseline="middle" letter-spacing="4">${word}</text>`;
  }

  const GEN_MAP = {
    'abstract-geometric': genAbstractGeometric,
    'minimalist-lines': genMinimalistLines,
    'botanical-vector': genBotanical,
    'celestial': genCelestial,
    'boho-arch': genBohoArch,
    'mid-century': genMidCentury,
    'wave-topo': genWaveTopo,
    'typography': genTypography
  };

  // Generate SVG for a print. Uses ratio 2:3 canonical viewBox 800x1200.
  function generateSVG(id) {
    const seed = typeof id === 'number' ? id : hashString(String(id));
    const rand = prng(seed);
    const genre = GENRES[seed % GENRES.length];
    const pal = pickPalette(rand);
    const w = 800, h = 1200;
    const inner = GEN_MAP[genre](rand, pal, w, h);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${pal[0]}"/>${inner}</svg>`;
    return { id: seed, genre, palette: pal, svg };
  }

  function buildCatalog(count) {
    const items = [];
    for (let i = 1; i <= count; i++) {
      const meta = generateSVG(i);
      items.push({
        id: i,
        title: `Print #${String(i).padStart(3, '0')}`,
        genre: meta.genre,
        palette: meta.palette
      });
    }
    return items;
  }

  return {
    SIZES,
    GENRES,
    pixelsForSize,
    centerCrop,
    gradePhotoForSize,
    generateSVG,
    buildCatalog,
    _hash: hashString,
    _prng: prng
  };
});
