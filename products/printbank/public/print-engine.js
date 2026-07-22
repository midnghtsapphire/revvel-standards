// PrintBank core engine — UMD (browser + Node require).
// Deterministic: no Math.random, no Date. Seeded LCG.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PrintEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- Standard print size catalog (inches; ISO A in mm converted) ----------
  const MM_PER_IN = 25.4;
  const SIZES = [
    // 2:3
    { name: '4×6',   w: 4,  h: 6,  ratio: '2:3' },
    { name: '8×12',  w: 8,  h: 12, ratio: '2:3' },
    { name: '16×24', w: 16, h: 24, ratio: '2:3' },
    { name: '24×36', w: 24, h: 36, ratio: '2:3' },
    // 3:4
    { name: '6×8',   w: 6,  h: 8,  ratio: '3:4' },
    { name: '12×16', w: 12, h: 16, ratio: '3:4' },
    { name: '18×24', w: 18, h: 24, ratio: '3:4' },
    // 4:5
    { name: '8×10',  w: 8,  h: 10, ratio: '4:5' },
    { name: '16×20', w: 16, h: 20, ratio: '4:5' },
    // 5:7
    { name: '5×7',   w: 5,  h: 7,  ratio: '5:7' },
    { name: '10×14', w: 10, h: 14, ratio: '5:7' },
    // 11×14 (odd but industry-standard)
    { name: '11×14', w: 11, h: 14, ratio: '11:14' },
    // squares
    { name: '5×5',   w: 5,  h: 5,  ratio: '1:1' },
    { name: '8×8',   w: 8,  h: 8,  ratio: '1:1' },
    { name: '12×12', w: 12, h: 12, ratio: '1:1' },
    { name: '20×20', w: 20, h: 20, ratio: '1:1' },
    // ISO A-series (mm → in)
    { name: 'A6', w: 105 / MM_PER_IN,  h: 148 / MM_PER_IN, ratio: 'ISO' },
    { name: 'A5', w: 148 / MM_PER_IN,  h: 210 / MM_PER_IN, ratio: 'ISO' },
    { name: 'A4', w: 210 / MM_PER_IN,  h: 297 / MM_PER_IN, ratio: 'ISO' },
    { name: 'A3', w: 297 / MM_PER_IN,  h: 420 / MM_PER_IN, ratio: 'ISO' },
    { name: 'A2', w: 420 / MM_PER_IN,  h: 594 / MM_PER_IN, ratio: 'ISO' },
    { name: 'A1', w: 594 / MM_PER_IN,  h: 841 / MM_PER_IN, ratio: 'ISO' },
    { name: 'A0', w: 841 / MM_PER_IN,  h: 1189 / MM_PER_IN, ratio: 'ISO' },
    // small
    { name: '3.5×5', w: 3.5, h: 5, ratio: '7:10' }
  ];

  const GENRES = [
    'geometric', 'botanical', 'minimalist', 'abstract',
    'celestial', 'typographic', 'landscape', 'boho'
  ];

  // ---------- DPI / pixel math ----------
  function pixelsForSize(size, dpi) {
    return {
      w: Math.round(size.w * dpi),
      h: Math.round(size.h * dpi)
    };
  }

  function effectiveDpi(photoW, photoH, size) {
    // After center-crop to the target aspect, DPI = shorter-side pixels / shorter-side inches.
    const photoAR = photoW / photoH;
    const targetAR = size.w / size.h;
    let cropW, cropH;
    if (photoAR > targetAR) {
      // photo wider — crop sides
      cropH = photoH;
      cropW = photoH * targetAR;
    } else {
      cropW = photoW;
      cropH = photoW / targetAR;
    }
    const dpiW = cropW / size.w;
    const dpiH = cropH / size.h;
    return Math.min(dpiW, dpiH);
  }

  function gradeDpi(dpi) {
    if (dpi >= 300) return 'gallery';
    if (dpi >= 240) return 'excellent';
    if (dpi >= 180) return 'good';
    if (dpi >= 150) return 'acceptable';
    return 'low';
  }

  // Try photo in native + rotated orientations; return best grade.
  function gradePhoto(photoW, photoH, size) {
    const a = effectiveDpi(photoW, photoH, size);
    const b = effectiveDpi(photoH, photoW, size);
    const dpi = Math.max(a, b);
    const rotated = b > a;
    return { dpi: Math.round(dpi * 10) / 10, grade: gradeDpi(dpi), rotated };
  }

  function cropRect(photoW, photoH, size) {
    const photoAR = photoW / photoH;
    const targetAR = size.w / size.h;
    let cw, ch;
    if (photoAR > targetAR) {
      ch = photoH;
      cw = photoH * targetAR;
    } else {
      cw = photoW;
      ch = photoW / targetAR;
    }
    return {
      x: Math.round((photoW - cw) / 2),
      y: Math.round((photoH - ch) / 2),
      w: Math.round(cw),
      h: Math.round(ch)
    };
  }

  // ---------- Seeded RNG (LCG) ----------
  function seedFromString(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function makeRng(seed) {
    let s = seed >>> 0;
    if (s === 0) s = 1;
    return function () {
      // LCG: Numerical Recipes
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }

  // ---------- Vector art generators ----------
  // Each generator takes (rng, w, h) and returns inner SVG markup string.
  const GENERATORS = {
    geometric(rng, w, h) {
      const parts = [];
      const cx = w / 2, cy = h / 2;
      const rings = 4 + Math.floor(rng() * 5);
      for (let i = 0; i < rings; i++) {
        const r = ((i + 1) / rings) * (Math.min(w, h) / 2);
        const sides = 3 + Math.floor(rng() * 6);
        const pts = [];
        for (let j = 0; j < sides; j++) {
          const a = (j / sides) * Math.PI * 2 + i * 0.15;
          pts.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`);
        }
        parts.push(`<polygon points="${pts.join(' ')}" fill="none" stroke="#1a1a1a" stroke-width="${(0.4 + rng() * 0.6).toFixed(2)}"/>`);
      }
      return parts.join('');
    },
    botanical(rng, w, h) {
      const parts = [];
      const stems = 3 + Math.floor(rng() * 4);
      for (let s = 0; s < stems; s++) {
        const x0 = (s + 1) * (w / (stems + 1));
        parts.push(`<path d="M${x0.toFixed(2)},${h} Q${(x0 + (rng() - 0.5) * w * 0.15).toFixed(2)},${(h / 2).toFixed(2)} ${x0.toFixed(2)},${(h * 0.15).toFixed(2)}" fill="none" stroke="#2f4f2f" stroke-width="1.2"/>`);
        const leaves = 5 + Math.floor(rng() * 5);
        for (let l = 0; l < leaves; l++) {
          const t = l / leaves;
          const ly = h - t * h * 0.85;
          const side = l % 2 === 0 ? 1 : -1;
          const lx = x0 + side * (10 + rng() * 20);
          parts.push(`<ellipse cx="${lx.toFixed(2)}" cy="${ly.toFixed(2)}" rx="${(6 + rng() * 6).toFixed(2)}" ry="${(3 + rng() * 3).toFixed(2)}" fill="#4a7a4a" transform="rotate(${(side * 25).toFixed(2)} ${lx.toFixed(2)} ${ly.toFixed(2)})"/>`);
        }
      }
      return parts.join('');
    },
    minimalist(rng, w, h) {
      const parts = [];
      const lines = 2 + Math.floor(rng() * 3);
      for (let i = 0; i < lines; i++) {
        const y = (i + 1) * (h / (lines + 1));
        parts.push(`<line x1="${(w * 0.1).toFixed(2)}" y1="${y.toFixed(2)}" x2="${(w * 0.9).toFixed(2)}" y2="${y.toFixed(2)}" stroke="#1a1a1a" stroke-width="1"/>`);
      }
      const cx = w * (0.3 + rng() * 0.4);
      const cy = h * (0.3 + rng() * 0.4);
      parts.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(Math.min(w, h) * 0.08).toFixed(2)}" fill="#c94a4a"/>`);
      return parts.join('');
    },
    abstract(rng, w, h) {
      const parts = [];
      const palette = ['#e4b363', '#ef6461', '#313638', '#e8e9eb', '#8aa29e'];
      const shapes = 6 + Math.floor(rng() * 6);
      for (let i = 0; i < shapes; i++) {
        const x = rng() * w;
        const y = rng() * h;
        const r = 20 + rng() * Math.min(w, h) * 0.25;
        const fill = palette[Math.floor(rng() * palette.length)];
        parts.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="${fill}" opacity="${(0.4 + rng() * 0.5).toFixed(2)}"/>`);
      }
      return parts.join('');
    },
    celestial(rng, w, h) {
      const parts = [`<rect width="${w}" height="${h}" fill="#0b1026"/>`];
      const stars = 40 + Math.floor(rng() * 40);
      for (let i = 0; i < stars; i++) {
        const x = rng() * w;
        const y = rng() * h;
        const r = 0.5 + rng() * 1.5;
        parts.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="#f8f4e3"/>`);
      }
      const mx = w * (0.3 + rng() * 0.4);
      const my = h * (0.2 + rng() * 0.3);
      const mr = Math.min(w, h) * 0.15;
      parts.push(`<circle cx="${mx.toFixed(2)}" cy="${my.toFixed(2)}" r="${mr.toFixed(2)}" fill="#f5e6c4"/>`);
      return parts.join('');
    },
    typographic(rng, w, h) {
      const words = ['CALM', 'BREATHE', 'HOME', 'STAY', 'DREAM', 'GROW', 'RISE', 'HELLO'];
      const word = words[Math.floor(rng() * words.length)];
      const fontSize = Math.min(w, h) * 0.22;
      return `<rect width="${w}" height="${h}" fill="#f4f1ea"/><text x="${(w / 2).toFixed(2)}" y="${(h / 2 + fontSize / 3).toFixed(2)}" font-family="Georgia, serif" font-size="${fontSize.toFixed(2)}" text-anchor="middle" fill="#1a1a1a" letter-spacing="4">${word}</text>`;
    },
    landscape(rng, w, h) {
      const parts = [`<rect width="${w}" height="${h}" fill="#e9d8a6"/>`];
      // sun
      const sy = h * (0.25 + rng() * 0.1);
      parts.push(`<circle cx="${(w / 2).toFixed(2)}" cy="${sy.toFixed(2)}" r="${(Math.min(w, h) * 0.12).toFixed(2)}" fill="#ee9b00"/>`);
      // mountains
      const peaks = 3 + Math.floor(rng() * 3);
      const base = h * 0.7;
      let path = `M0,${h} L0,${base}`;
      for (let i = 1; i <= peaks; i++) {
        const px = (i - 0.5) * (w / peaks);
        const py = base - (0.15 + rng() * 0.25) * h;
        path += ` L${px.toFixed(2)},${py.toFixed(2)}`;
        path += ` L${(i * (w / peaks)).toFixed(2)},${base.toFixed(2)}`;
      }
      path += ` L${w},${h} Z`;
      parts.push(`<path d="${path}" fill="#005f73"/>`);
      parts.push(`<rect y="${(h * 0.85).toFixed(2)}" width="${w}" height="${(h * 0.15).toFixed(2)}" fill="#0a9396"/>`);
      return parts.join('');
    },
    boho(rng, w, h) {
      const parts = [`<rect width="${w}" height="${h}" fill="#f2e8dc"/>`];
      const cx = w / 2, cy = h / 2;
      const petals = 8 + Math.floor(rng() * 6);
      const r1 = Math.min(w, h) * 0.15;
      const r2 = Math.min(w, h) * 0.35;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2;
        const x1 = cx + Math.cos(a) * r1;
        const y1 = cy + Math.sin(a) * r1;
        const x2 = cx + Math.cos(a) * r2;
        const y2 = cy + Math.sin(a) * r2;
        parts.push(`<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#8b5a2b" stroke-width="1.5"/>`);
      }
      parts.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r1.toFixed(2)}" fill="none" stroke="#8b5a2b" stroke-width="2"/>`);
      return parts.join('');
    }
  };

  function generateSVG(genre, seed, opts) {
    opts = opts || {};
    const w = opts.viewW || 400;
    const h = opts.viewH || 600;
    const gen = GENERATORS[genre];
    if (!gen) throw new Error('Unknown genre: ' + genre);
    const rng = makeRng(typeof seed === 'string' ? seedFromString(seed) : seed);
    const inner = gen(rng, w, h);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
  }

  function buildCatalog(count) {
    count = count || 144;
    const items = [];
    for (let i = 0; i < count; i++) {
      const genre = GENRES[i % GENRES.length];
      const idx = Math.floor(i / GENRES.length) + 1;
      const id = `${genre}-${String(idx).padStart(3, '0')}`;
      items.push({
        id,
        genre,
        title: `${genre.charAt(0).toUpperCase() + genre.slice(1)} №${idx}`,
        seed: id
      });
    }
    return items;
  }

  return {
    SIZES,
    GENRES,
    pixelsForSize,
    effectiveDpi,
    gradeDpi,
    gradePhoto,
    cropRect,
    seedFromString,
    makeRng,
    generateSVG,
    buildCatalog
  };
});
