// PrintBank print engine — UMD (browser + Node require)
// Deterministic: no Math.random / Date usage.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PrintEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Standard print sizes (inches). ISO A-series converted from mm.
  const MM_PER_INCH = 25.4;
  const mm = (x) => x / MM_PER_INCH;

  const SIZES = [
    // 2:3 ratio
    { name: '4x6',   w: 4,  h: 6,  ratio: '2:3' },
    { name: '8x12',  w: 8,  h: 12, ratio: '2:3' },
    { name: '12x18', w: 12, h: 18, ratio: '2:3' },
    { name: '16x24', w: 16, h: 24, ratio: '2:3' },
    { name: '20x30', w: 20, h: 30, ratio: '2:3' },
    { name: '24x36', w: 24, h: 36, ratio: '2:3' },
    // 3:4 ratio
    { name: '6x8',   w: 6,  h: 8,  ratio: '3:4' },
    { name: '9x12',  w: 9,  h: 12, ratio: '3:4' },
    { name: '12x16', w: 12, h: 16, ratio: '3:4' },
    { name: '18x24', w: 18, h: 24, ratio: '3:4' },
    // 4:5 ratio
    { name: '4x5',   w: 4,  h: 5,  ratio: '4:5' },
    { name: '8x10',  w: 8,  h: 10, ratio: '4:5' },
    { name: '16x20', w: 16, h: 20, ratio: '4:5' },
    { name: '24x30', w: 24, h: 30, ratio: '4:5' },
    // 5:7
    { name: '5x7',   w: 5,  h: 7,  ratio: '5:7' },
    { name: '10x14', w: 10, h: 14, ratio: '5:7' },
    // 11x14 (classic gallery)
    { name: '11x14', w: 11, h: 14, ratio: '11:14' },
    // squares
    { name: '6x6',   w: 6,  h: 6,  ratio: '1:1' },
    { name: '10x10', w: 10, h: 10, ratio: '1:1' },
    { name: '20x20', w: 20, h: 20, ratio: '1:1' },
    // ISO A-series (mm → inches)
    { name: 'A4', w: mm(210), h: mm(297), ratio: 'ISO' },
    { name: 'A3', w: mm(297), h: mm(420), ratio: 'ISO' },
    { name: 'A2', w: mm(420), h: mm(594), ratio: 'ISO' },
    { name: 'A1', w: mm(594), h: mm(841), ratio: 'ISO' },
    { name: 'A0', w: mm(841), h: mm(1189), ratio: 'ISO' }
  ];

  const GENRES = [
    'abstract-geo', 'botanical', 'minimalist-line',
    'boho-sun', 'topographic', 'celestial',
    'typography', 'mid-century'
  ];

  // ----- DPI / crop math -----
  function pixelsForSize(size, dpi) {
    return {
      w: Math.round(size.w * dpi),
      h: Math.round(size.h * dpi)
    };
  }

  // Given source image dims + target size aspect, compute center-crop rect
  // Handles auto-rotation: try both orientations, pick the one with larger effective DPI.
  function centerCropForTarget(srcW, srcH, targetW, targetH) {
    const targetAspect = targetW / targetH;
    const srcAspect = srcW / srcH;
    let cropW, cropH;
    if (srcAspect > targetAspect) {
      // source is wider — crop width
      cropH = srcH;
      cropW = srcH * targetAspect;
    } else {
      cropW = srcW;
      cropH = srcW / targetAspect;
    }
    const x = (srcW - cropW) / 2;
    const y = (srcH - cropH) / 2;
    return { x, y, w: cropW, h: cropH };
  }

  function gradePhotoForSize(srcW, srcH, size) {
    // Try both orientations, choose better effective DPI.
    const opts = [
      { tw: size.w, th: size.h, rotated: false },
      { tw: size.h, th: size.w, rotated: true }
    ];
    let best = null;
    for (const o of opts) {
      const crop = centerCropForTarget(srcW, srcH, o.tw, o.th);
      const dpi = crop.w / o.tw; // effective DPI along width
      if (!best || dpi > best.dpi) {
        best = { dpi, crop, rotated: o.rotated, tw: o.tw, th: o.th };
      }
    }
    const dpi = best.dpi;
    let grade;
    if (dpi >= 300) grade = 'gallery';
    else if (dpi >= 240) grade = 'excellent';
    else if (dpi >= 200) grade = 'good';
    else if (dpi >= 150) grade = 'acceptable';
    else grade = 'low';
    return {
      size: size.name,
      dpi: Math.round(dpi),
      grade,
      printable: dpi >= 150,
      rotated: best.rotated,
      crop: best.crop
    };
  }

  function gradePhotoAllSizes(srcW, srcH) {
    return SIZES.map((s) => gradePhotoForSize(srcW, srcH, s));
  }

  // ----- Deterministic seeded PRNG (mulberry32) -----
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

  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // ----- Genre generators (each returns SVG string, 1000x1500 default frame) -----
  function svgHeader(w, h) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">`;
  }

  function pickPalette(rng) {
    const palettes = [
      ['#F4E9D8', '#D8A47F', '#8C5E58', '#3E2C23'],
      ['#EDE7DA', '#A8B5A2', '#5F6F52', '#2E3D2A'],
      ['#F5F1E8', '#E8B4A0', '#B58A78', '#5C3A2E'],
      ['#FAF7F2', '#C9B79C', '#7A6F5A', '#2E2A24'],
      ['#F0EDE5', '#88A0A8', '#4C6A72', '#1F2F33']
    ];
    return palettes[Math.floor(rng() * palettes.length)];
  }

  function genAbstractGeo(rng, w, h) {
    const p = pickPalette(rng);
    let s = svgHeader(w, h);
    s += `<rect width="${w}" height="${h}" fill="${p[0]}"/>`;
    const n = 6 + Math.floor(rng() * 6);
    for (let i = 0; i < n; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const r = 40 + rng() * 200;
      const c = p[1 + Math.floor(rng() * 3)];
      const shape = Math.floor(rng() * 3);
      if (shape === 0) {
        s += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="${c}" opacity="0.85"/>`;
      } else if (shape === 1) {
        s += `<rect x="${(x - r).toFixed(2)}" y="${(y - r).toFixed(2)}" width="${(r * 2).toFixed(2)}" height="${(r * 2).toFixed(2)}" fill="${c}" opacity="0.8"/>`;
      } else {
        const x2 = x + r, y2 = y + r * 1.2, x3 = x - r, y3 = y + r * 1.2;
        s += `<polygon points="${x.toFixed(2)},${y.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)} ${x3.toFixed(2)},${y3.toFixed(2)}" fill="${c}" opacity="0.85"/>`;
      }
    }
    s += `</svg>`;
    return s;
  }

  function genBotanical(rng, w, h) {
    const p = pickPalette(rng);
    let s = svgHeader(w, h);
    s += `<rect width="${w}" height="${h}" fill="${p[0]}"/>`;
    const stemX = w / 2;
    s += `<path d="M ${stemX} ${h - 50} Q ${stemX + (rng() - 0.5) * 200} ${h / 2} ${stemX} 100" stroke="${p[2]}" stroke-width="6" fill="none"/>`;
    const leaves = 8 + Math.floor(rng() * 8);
    for (let i = 0; i < leaves; i++) {
      const t = i / leaves;
      const ly = h - 100 - t * (h - 200);
      const side = i % 2 === 0 ? -1 : 1;
      const lx = stemX + side * (30 + rng() * 40);
      const rx = 40 + rng() * 60;
      const ry = 15 + rng() * 25;
      const rot = side * (20 + rng() * 40);
      s += `<ellipse cx="${lx.toFixed(2)}" cy="${ly.toFixed(2)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" fill="${p[2]}" transform="rotate(${rot.toFixed(1)} ${lx.toFixed(2)} ${ly.toFixed(2)})"/>`;
    }
    s += `</svg>`;
    return s;
  }

  function genMinimalistLine(rng, w, h) {
    const p = pickPalette(rng);
    let s = svgHeader(w, h);
    s += `<rect width="${w}" height="${h}" fill="${p[0]}"/>`;
    const cx = w / 2, cy = h / 2;
    let d = `M ${cx - 200} ${cy - 100}`;
    const pts = 6 + Math.floor(rng() * 6);
    for (let i = 0; i < pts; i++) {
      const x = cx + (rng() - 0.5) * 500;
      const y = cy + (rng() - 0.5) * 700;
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    s += `<path d="${d}" stroke="${p[3]}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `</svg>`;
    return s;
  }

  function genBohoSun(rng, w, h) {
    const p = pickPalette(rng);
    let s = svgHeader(w, h);
    s += `<rect width="${w}" height="${h}" fill="${p[0]}"/>`;
    const cx = w / 2, cy = h / 2;
    const rays = 12 + Math.floor(rng() * 8);
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2;
      const r1 = 180, r2 = 260 + rng() * 60;
      const x1 = cx + Math.cos(a) * r1;
      const y1 = cy + Math.sin(a) * r1;
      const x2 = cx + Math.cos(a) * r2;
      const y2 = cy + Math.sin(a) * r2;
      s += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${p[2]}" stroke-width="4" stroke-linecap="round"/>`;
    }
    s += `<circle cx="${cx}" cy="${cy}" r="150" fill="none" stroke="${p[3]}" stroke-width="5"/>`;
    s += `</svg>`;
    return s;
  }

  function genTopographic(rng, w, h) {
    const p = pickPalette(rng);
    let s = svgHeader(w, h);
    s += `<rect width="${w}" height="${h}" fill="${p[0]}"/>`;
    const rings = 10 + Math.floor(rng() * 8);
    const cx = w / 2 + (rng() - 0.5) * 200;
    const cy = h / 2 + (rng() - 0.5) * 300;
    for (let i = 0; i < rings; i++) {
      const r = 40 + i * (30 + rng() * 20);
      const off = (rng() - 0.5) * 30;
      s += `<ellipse cx="${(cx + off).toFixed(2)}" cy="${(cy + off).toFixed(2)}" rx="${r.toFixed(2)}" ry="${(r * 0.8).toFixed(2)}" fill="none" stroke="${p[2]}" stroke-width="2"/>`;
    }
    s += `</svg>`;
    return s;
  }

  function genCelestial(rng, w, h) {
    const p = pickPalette(rng);
    let s = svgHeader(w, h);
    s += `<rect width="${w}" height="${h}" fill="${p[3]}"/>`;
    const stars = 60 + Math.floor(rng() * 40);
    for (let i = 0; i < stars; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const r = 1 + rng() * 3;
      s += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="${p[0]}"/>`;
    }
    const cx = w / 2, cy = h / 2;
    const phase = rng();
    s += `<circle cx="${cx}" cy="${cy}" r="180" fill="${p[0]}"/>`;
    if (phase < 0.7) {
      s += `<circle cx="${(cx + 80).toFixed(2)}" cy="${cy}" r="180" fill="${p[3]}"/>`;
    }
    s += `</svg>`;
    return s;
  }

  function genTypography(rng, w, h) {
    const p = pickPalette(rng);
    const words = ['BREATHE', 'STAY WILD', 'HOME', 'GATHER', 'BE STILL', 'GROW', 'DREAM', 'HELLO'];
    const word = words[Math.floor(rng() * words.length)];
    let s = svgHeader(w, h);
    s += `<rect width="${w}" height="${h}" fill="${p[0]}"/>`;
    const fs = 200;
    s += `<text x="${w / 2}" y="${h / 2}" font-family="Georgia, serif" font-size="${fs}" font-weight="700" fill="${p[3]}" text-anchor="middle" dominant-baseline="middle" letter-spacing="4">${word}</text>`;
    s += `<line x1="${w * 0.2}" y1="${h / 2 + fs / 2 + 40}" x2="${w * 0.8}" y2="${h / 2 + fs / 2 + 40}" stroke="${p[2]}" stroke-width="3"/>`;
    s += `</svg>`;
    return s;
  }

  function genMidCentury(rng, w, h) {
    const p = pickPalette(rng);
    let s = svgHeader(w, h);
    s += `<rect width="${w}" height="${h}" fill="${p[0]}"/>`;
    const bands = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < bands; i++) {
      const bh = h / bands;
      const c = p[1 + Math.floor(rng() * 3)];
      s += `<rect x="0" y="${(i * bh).toFixed(2)}" width="${w}" height="${bh.toFixed(2)}" fill="${c}" opacity="0.6"/>`;
    }
    // starburst / atomic accent
    const cx = w * (0.3 + rng() * 0.4);
    const cy = h * (0.3 + rng() * 0.4);
    const spokes = 8 + Math.floor(rng() * 6) * 2;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      const r = 100 + rng() * 80;
      s += `<line x1="${cx.toFixed(2)}" y1="${cy.toFixed(2)}" x2="${(cx + Math.cos(a) * r).toFixed(2)}" y2="${(cy + Math.sin(a) * r).toFixed(2)}" stroke="${p[3]}" stroke-width="3"/>`;
    }
    s += `<circle cx="${cx}" cy="${cy}" r="18" fill="${p[3]}"/>`;
    s += `</svg>`;
    return s;
  }

  const GEN_MAP = {
    'abstract-geo': genAbstractGeo,
    'botanical': genBotanical,
    'minimalist-line': genMinimalistLine,
    'boho-sun': genBohoSun,
    'topographic': genTopographic,
    'celestial': genCelestial,
    'typography': genTypography,
    'mid-century': genMidCentury
  };

  function generateSVG(genre, seed, w, h) {
    w = w || 1000;
    h = h || 1500;
    const fn = GEN_MAP[genre];
    if (!fn) throw new Error('Unknown genre: ' + genre);
    const rng = mulberry32(typeof seed === 'string' ? hashStr(seed) : (seed >>> 0));
    return fn(rng, w, h);
  }

  function buildCatalog(count) {
    count = count || 144;
    const items = [];
    const perGenre = Math.ceil(count / GENRES.length);
    let idx = 0;
    for (const g of GENRES) {
      for (let i = 0; i < perGenre && idx < count; i++, idx++) {
        const seed = hashStr(g + ':' + i);
        items.push({
          id: `pb-${idx.toString().padStart(4, '0')}`,
          genre: g,
          seed,
          title: titleFor(g, i)
        });
      }
    }
    return items;
  }

  function titleFor(genre, i) {
    const prefixes = {
      'abstract-geo': ['Composition', 'Study', 'Form'],
      'botanical': ['Fern', 'Stem', 'Leaf Study'],
      'minimalist-line': ['Line', 'Contour', 'Gesture'],
      'boho-sun': ['Sun', 'Radiance', 'Halo'],
      'topographic': ['Contours', 'Terrain', 'Elevation'],
      'celestial': ['Moonphase', 'Cosmos', 'Orbit'],
      'typography': ['Word', 'Mantra', 'Type'],
      'mid-century': ['Atomic', 'Modernist', 'Bands']
    };
    const p = prefixes[genre] || ['Print'];
    return `${p[i % p.length]} No. ${i + 1}`;
  }

  return {
    SIZES,
    GENRES,
    pixelsForSize,
    centerCropForTarget,
    gradePhotoForSize,
    gradePhotoAllSizes,
    generateSVG,
    buildCatalog,
    mulberry32,
    hashStr
  };
}));
