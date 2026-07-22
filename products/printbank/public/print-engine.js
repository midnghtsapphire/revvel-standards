// PrintBank Engine - UMD (browser + Node)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PrintEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Standard print sizes (inches). Includes 2:3, 3:4, 4:5, 5:7, 11x14, squares, ISO A-series.
  const SIZES = [
    { name: '4x6',    w: 4,     h: 6,     ratio: '2:3'  },
    { name: '6x9',    w: 6,     h: 9,     ratio: '2:3'  },
    { name: '8x12',   w: 8,     h: 12,    ratio: '2:3'  },
    { name: '12x18',  w: 12,    h: 18,    ratio: '2:3'  },
    { name: '16x24',  w: 16,    h: 24,    ratio: '2:3'  },
    { name: '20x30',  w: 20,    h: 30,    ratio: '2:3'  },
    { name: '24x36',  w: 24,    h: 36,    ratio: '2:3'  },
    { name: '6x8',    w: 6,     h: 8,     ratio: '3:4'  },
    { name: '9x12',   w: 9,     h: 12,    ratio: '3:4'  },
    { name: '12x16',  w: 12,    h: 16,    ratio: '3:4'  },
    { name: '18x24',  w: 18,    h: 24,    ratio: '3:4'  },
    { name: '8x10',   w: 8,     h: 10,    ratio: '4:5'  },
    { name: '11x14',  w: 11,    h: 14,    ratio: '11:14'},
    { name: '16x20',  w: 16,    h: 20,    ratio: '4:5'  },
    { name: '5x7',    w: 5,     h: 7,     ratio: '5:7'  },
    { name: '10x14',  w: 10,    h: 14,    ratio: '5:7'  },
    { name: '6x6',    w: 6,     h: 6,     ratio: '1:1'  },
    { name: '10x10',  w: 10,    h: 10,    ratio: '1:1'  },
    { name: '20x20',  w: 20,    h: 20,    ratio: '1:1'  },
    { name: 'A6',     w: 4.13,  h: 5.83,  ratio: 'ISO A'},
    { name: 'A5',     w: 5.83,  h: 8.27,  ratio: 'ISO A'},
    { name: 'A4',     w: 8.27,  h: 11.69, ratio: 'ISO A'},
    { name: 'A3',     w: 11.69, h: 16.54, ratio: 'ISO A'},
    { name: 'A2',     w: 16.54, h: 23.39, ratio: 'ISO A'}
  ];

  const GENRES = [
    'abstract', 'geometric', 'botanical', 'minimalist',
    'celestial', 'landscape', 'typography', 'mandala'
  ];

  // ---- deterministic PRNG ----
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
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

  // ---- DPI math ----
  function pixelsForSize(size, dpi) {
    return {
      w: Math.round(size.w * dpi),
      h: Math.round(size.h * dpi)
    };
  }

  // Effective DPI after center-cropping (srcW x srcH) to size ratio.
  function effectiveDPI(srcW, srcH, size) {
    if (!srcW || !srcH) return 0;
    // Try both orientations, pick the better (higher effective DPI).
    function dpiFor(w, h, targetW, targetH) {
      const targetRatio = targetW / targetH;
      const srcRatio = w / h;
      let cropW, cropH;
      if (srcRatio > targetRatio) {
        cropH = h;
        cropW = h * targetRatio;
      } else {
        cropW = w;
        cropH = w / targetRatio;
      }
      return Math.min(cropW / targetW, cropH / targetH);
    }
    const a = dpiFor(srcW, srcH, size.w, size.h);
    const b = dpiFor(srcW, srcH, size.h, size.w);
    return Math.floor(Math.max(a, b));
  }

  function cropRect(srcW, srcH, size) {
    const targetRatio = size.w / size.h;
    const srcRatio = srcW / srcH;
    let cropW, cropH;
    if (srcRatio > targetRatio) {
      cropH = srcH;
      cropW = srcH * targetRatio;
    } else {
      cropW = srcW;
      cropH = srcW / targetRatio;
    }
    return {
      x: Math.round((srcW - cropW) / 2),
      y: Math.round((srcH - cropH) / 2),
      w: Math.round(cropW),
      h: Math.round(cropH)
    };
  }

  function gradeDPI(dpi) {
    if (dpi >= 300) return { grade: 'gallery',    ok: true  };
    if (dpi >= 240) return { grade: 'excellent',  ok: true  };
    if (dpi >= 200) return { grade: 'good',       ok: true  };
    if (dpi >= 150) return { grade: 'acceptable', ok: true  };
    return             { grade: 'low',         ok: false };
  }

  function gradePhoto(srcW, srcH) {
    return SIZES.map(function (size) {
      const dpi = effectiveDPI(srcW, srcH, size);
      const g = gradeDPI(dpi);
      return { size: size.name, w: size.w, h: size.h, dpi: dpi, grade: g.grade, ok: g.ok };
    });
  }

  // ---- Vector art generator (SVG) ----
  function svgOpen(w, h, bg) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h +
      '" preserveAspectRatio="xMidYMid slice">' +
      '<rect width="' + w + '" height="' + h + '" fill="' + bg + '"/>';
  }

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  function palette(rng) {
    const palettes = [
      ['#f5efe6', '#1b1b1b', '#c94f3d', '#3a6ea5'],
      ['#0f172a', '#f8fafc', '#38bdf8', '#f472b6'],
      ['#faf3dd', '#264653', '#2a9d8f', '#e76f51'],
      ['#111111', '#eaeaea', '#d4a373', '#7f5539'],
      ['#ecebe4', '#22223b', '#9a8c98', '#c9ada7']
    ];
    return pick(rng, palettes);
  }

  function genAbstract(rng, w, h) {
    const p = palette(rng);
    let out = svgOpen(w, h, p[0]);
    const n = 8 + Math.floor(rng() * 8);
    for (let i = 0; i < n; i++) {
      const cx = rng() * w, cy = rng() * h;
      const r = 40 + rng() * Math.min(w, h) * 0.35;
      const c = p[1 + Math.floor(rng() * (p.length - 1))];
      out += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) +
        '" r="' + r.toFixed(1) + '" fill="' + c + '" opacity="0.7"/>';
    }
    return out + '</svg>';
  }

  function genGeometric(rng, w, h) {
    const p = palette(rng);
    let out = svgOpen(w, h, p[0]);
    const step = 60 + Math.floor(rng() * 40);
    for (let x = 0; x < w; x += step) {
      for (let y = 0; y < h; y += step) {
        const c = p[1 + Math.floor(rng() * (p.length - 1))];
        if (rng() > 0.5) {
          out += '<rect x="' + x + '" y="' + y + '" width="' + step + '" height="' + step + '" fill="' + c + '"/>';
        } else {
          out += '<polygon points="' + x + ',' + (y + step) + ' ' + (x + step / 2) + ',' + y + ' ' + (x + step) + ',' + (y + step) + '" fill="' + c + '"/>';
        }
      }
    }
    return out + '</svg>';
  }

  function genBotanical(rng, w, h) {
    const p = palette(rng);
    let out = svgOpen(w, h, p[0]);
    const stemX = w / 2;
    out += '<line x1="' + stemX + '" y1="' + h + '" x2="' + stemX + '" y2="' + (h * 0.2) +
      '" stroke="' + p[2] + '" stroke-width="6"/>';
    const leaves = 6 + Math.floor(rng() * 6);
    for (let i = 0; i < leaves; i++) {
      const y = h * 0.25 + (i / leaves) * h * 0.6;
      const dir = i % 2 === 0 ? 1 : -1;
      const lx = stemX + dir * (40 + rng() * 60);
      const ly = y - 30 - rng() * 30;
      out += '<ellipse cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) +
        '" rx="40" ry="18" fill="' + p[2] + '" transform="rotate(' + (dir * 30).toFixed(0) + ' ' + lx.toFixed(1) + ' ' + ly.toFixed(1) + ')"/>';
    }
    out += '<circle cx="' + stemX + '" cy="' + (h * 0.2) + '" r="' + (30 + rng() * 20).toFixed(1) + '" fill="' + p[3] + '"/>';
    return out + '</svg>';
  }

  function genMinimalist(rng, w, h) {
    const p = palette(rng);
    let out = svgOpen(w, h, p[0]);
    const cx = w / 2, cy = h / 2;
    out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + Math.min(w, h) * 0.25 + '" fill="' + p[1] + '"/>';
    const y = h * (0.7 + rng() * 0.15);
    out += '<line x1="0" y1="' + y + '" x2="' + w + '" y2="' + y + '" stroke="' + p[2] + '" stroke-width="2"/>';
    return out + '</svg>';
  }

  function genCelestial(rng, w, h) {
    const p = palette(rng);
    let out = svgOpen(w, h, p[0]);
    const stars = 60 + Math.floor(rng() * 40);
    for (let i = 0; i < stars; i++) {
      const x = rng() * w, y = rng() * h;
      const r = 0.5 + rng() * 2.2;
      out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(2) + '" fill="' + p[1] + '"/>';
    }
    const moonR = Math.min(w, h) * 0.15;
    out += '<circle cx="' + (w * 0.7) + '" cy="' + (h * 0.3) + '" r="' + moonR + '" fill="' + p[3] + '"/>';
    return out + '</svg>';
  }

  function genLandscape(rng, w, h) {
    const p = palette(rng);
    let out = svgOpen(w, h, p[0]);
    // sky gradient stripes
    const bands = 4;
    for (let i = 0; i < bands; i++) {
      out += '<rect x="0" y="' + (i * h * 0.15) + '" width="' + w + '" height="' + (h * 0.15) +
        '" fill="' + p[1 + (i % (p.length - 1))] + '" opacity="' + (0.15 + i * 0.1).toFixed(2) + '"/>';
    }
    // mountains
    const peaks = 3 + Math.floor(rng() * 3);
    let pts = '0,' + h;
    for (let i = 0; i <= peaks; i++) {
      const x = (i / peaks) * w;
      const y = h * (0.5 + rng() * 0.2);
      pts += ' ' + x.toFixed(1) + ',' + y.toFixed(1);
    }
    pts += ' ' + w + ',' + h;
    out += '<polygon points="' + pts + '" fill="' + p[2] + '"/>';
    return out + '</svg>';
  }

  function genTypography(rng, w, h) {
    const p = palette(rng);
    const words = ['DREAM', 'CREATE', 'BREATHE', 'WANDER', 'STILL', 'LIGHT', 'HOME', 'GROW'];
    const word = pick(rng, words);
    let out = svgOpen(w, h, p[0]);
    const fs = Math.min(w, h) * 0.22;
    out += '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" ' +
      'font-family="Georgia, serif" font-size="' + fs.toFixed(1) + '" fill="' + p[1] + '">' + word + '</text>';
    out += '<line x1="' + (w * 0.2) + '" y1="' + (h * 0.65) + '" x2="' + (w * 0.8) + '" y2="' + (h * 0.65) +
      '" stroke="' + p[2] + '" stroke-width="2"/>';
    return out + '</svg>';
  }

  function genMandala(rng, w, h) {
    const p = palette(rng);
    let out = svgOpen(w, h, p[0]);
    const cx = w / 2, cy = h / 2;
    const rings = 5 + Math.floor(rng() * 3);
    for (let r = 1; r <= rings; r++) {
      const rad = (Math.min(w, h) * 0.45) * (r / rings);
      const petals = 6 + r * 2;
      const color = p[1 + (r % (p.length - 1))];
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2;
        const x = cx + Math.cos(a) * rad;
        const y = cy + Math.sin(a) * rad;
        out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (rad * 0.15).toFixed(1) +
          '" fill="none" stroke="' + color + '" stroke-width="1.5"/>';
      }
    }
    return out + '</svg>';
  }

  const GENERATORS = {
    abstract: genAbstract,
    geometric: genGeometric,
    botanical: genBotanical,
    minimalist: genMinimalist,
    celestial: genCelestial,
    landscape: genLandscape,
    typography: genTypography,
    mandala: genMandala
  };

  function generateSVG(genre, id, w, h) {
    w = w || 1200;
    h = h || 1800;
    const gen = GENERATORS[genre] || genAbstract;
    const rng = mulberry32(hashSeed(genre + ':' + id));
    return gen(rng, w, h);
  }

  function buildCatalog(count) {
    count = count || 144;
    const items = [];
    const perGenre = Math.ceil(count / GENRES.length);
    let idx = 0;
    for (let g = 0; g < GENRES.length && idx < count; g++) {
      for (let i = 0; i < perGenre && idx < count; i++, idx++) {
        const genre = GENRES[g];
        const id = genre + '-' + String(i + 1).padStart(3, '0');
        items.push({
          id: id,
          genre: genre,
          title: genre.charAt(0).toUpperCase() + genre.slice(1) + ' #' + (i + 1),
          tags: [genre, 'vector', 'printable']
        });
      }
    }
    return items;
  }

  return {
    SIZES: SIZES,
    GENRES: GENRES,
    pixelsForSize: pixelsForSize,
    effectiveDPI: effectiveDPI,
    cropRect: cropRect,
    gradeDPI: gradeDPI,
    gradePhoto: gradePhoto,
    generateSVG: generateSVG,
    buildCatalog: buildCatalog,
    _hashSeed: hashSeed,
    _mulberry32: mulberry32
  };
}));
