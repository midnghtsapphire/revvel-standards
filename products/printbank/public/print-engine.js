// PrintBank print engine — UMD (browser + Node require).
// Deterministic. No Math.random, no Date. Reproducible catalogs.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PrintEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Standard print sizes (inches). ISO A-series in mm converted to inches.
  var SIZES = [
    { name: '4x6',   w: 4,     h: 6,     ratio: '2:3',  group: 'photo' },
    { name: '5x7',   w: 5,     h: 7,     ratio: '5:7',  group: 'photo' },
    { name: '6x9',   w: 6,     h: 9,     ratio: '2:3',  group: 'photo' },
    { name: '8x10',  w: 8,     h: 10,    ratio: '4:5',  group: 'photo' },
    { name: '8x12',  w: 8,     h: 12,    ratio: '2:3',  group: 'photo' },
    { name: '11x14', w: 11,    h: 14,    ratio: '11:14',group: 'photo' },
    { name: '12x16', w: 12,    h: 16,    ratio: '3:4',  group: 'photo' },
    { name: '12x18', w: 12,    h: 18,    ratio: '2:3',  group: 'photo' },
    { name: '16x20', w: 16,    h: 20,    ratio: '4:5',  group: 'photo' },
    { name: '16x24', w: 16,    h: 24,    ratio: '2:3',  group: 'photo' },
    { name: '18x24', w: 18,    h: 24,    ratio: '3:4',  group: 'photo' },
    { name: '20x30', w: 20,    h: 30,    ratio: '2:3',  group: 'photo' },
    { name: '24x36', w: 24,    h: 36,    ratio: '2:3',  group: 'photo' },
    { name: '6x6',   w: 6,     h: 6,     ratio: '1:1',  group: 'square' },
    { name: '8x8',   w: 8,     h: 8,     ratio: '1:1',  group: 'square' },
    { name: '10x10', w: 10,    h: 10,    ratio: '1:1',  group: 'square' },
    { name: '12x12', w: 12,    h: 12,    ratio: '1:1',  group: 'square' },
    { name: '20x20', w: 20,    h: 20,    ratio: '1:1',  group: 'square' },
    { name: 'A6',    w: 4.13,  h: 5.83,  ratio: 'ISO',  group: 'iso' },
    { name: 'A5',    w: 5.83,  h: 8.27,  ratio: 'ISO',  group: 'iso' },
    { name: 'A4',    w: 8.27,  h: 11.69, ratio: 'ISO',  group: 'iso' },
    { name: 'A3',    w: 11.69, h: 16.54, ratio: 'ISO',  group: 'iso' },
    { name: 'A2',    w: 16.54, h: 23.39, ratio: 'ISO',  group: 'iso' },
    { name: 'A1',    w: 23.39, h: 33.11, ratio: 'ISO',  group: 'iso' }
  ];

  var GENRES = [
    'abstract-geometric',
    'minimal-line',
    'botanical',
    'celestial',
    'landscape',
    'typography',
    'boho',
    'mid-century'
  ];

  // Deterministic PRNG (mulberry32).
  function seedRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Pixel dimensions for a given size at a given DPI.
  function pixelDimensions(size, dpi) {
    return {
      w: Math.round(size.w * dpi),
      h: Math.round(size.h * dpi)
    };
  }

  // Center-crop math: given source w/h and target aspect (tw/th), return crop rect.
  function centerCrop(srcW, srcH, targetW, targetH) {
    var srcRatio = srcW / srcH;
    var tgtRatio = targetW / targetH;
    var cw, ch, cx, cy;
    if (srcRatio > tgtRatio) {
      // source is wider — crop sides
      ch = srcH;
      cw = Math.round(srcH * tgtRatio);
      cx = Math.round((srcW - cw) / 2);
      cy = 0;
    } else {
      // source is taller — crop top/bottom
      cw = srcW;
      ch = Math.round(srcW / tgtRatio);
      cx = 0;
      cy = Math.round((srcH - ch) / 2);
    }
    return { x: cx, y: cy, w: cw, h: ch };
  }

  // Effective DPI after center-cropping srcW×srcH into the target size's aspect.
  // Auto-rotates target to best-fit if it improves DPI.
  function effectiveDpi(srcW, srcH, size) {
    function calc(tw, th) {
      var crop = centerCrop(srcW, srcH, tw, th);
      // After crop, the crop rect scales to tw×th inches.
      var dpiW = crop.w / tw;
      var dpiH = crop.h / th;
      return Math.min(dpiW, dpiH);
    }
    var dpiPortrait = calc(size.w, size.h);
    var dpiLandscape = calc(size.h, size.w);
    if (dpiLandscape > dpiPortrait) {
      return { dpi: dpiLandscape, rotated: true };
    }
    return { dpi: dpiPortrait, rotated: false };
  }

  function grade(dpi) {
    if (dpi >= 300) return 'gallery';
    if (dpi >= 240) return 'excellent';
    if (dpi >= 180) return 'good';
    if (dpi >= 150) return 'acceptable';
    return 'low';
  }

  function gradePhotoAcrossSizes(srcW, srcH) {
    return SIZES.map(function (s) {
      var eff = effectiveDpi(srcW, srcH, s);
      return {
        size: s.name,
        w: s.w,
        h: s.h,
        group: s.group,
        dpi: Math.round(eff.dpi * 10) / 10,
        rotated: eff.rotated,
        grade: grade(eff.dpi)
      };
    });
  }

  // ---- Deterministic vector art generators ----

  function paletteFor(rng) {
    var palettes = [
      ['#f4ede4', '#c9a27a', '#8a6a4a', '#3f2e21'],
      ['#eef2f7', '#a7b8cf', '#4d6a94', '#1f2a44'],
      ['#f0efe9', '#8ba888', '#4d6a52', '#22332a'],
      ['#fdf6f0', '#e8b4a0', '#c07a63', '#5b3a2e'],
      ['#f7f4ec', '#d9c39b', '#8a6f3d', '#2f2717'],
      ['#f2eef7', '#c9a7d9', '#7a4d8a', '#2e1f3a']
    ];
    var i = Math.floor(rng() * palettes.length);
    return palettes[i];
  }

  function svgOpen(w, h, bg) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h +
      '" preserveAspectRatio="xMidYMid meet">' +
      '<rect width="' + w + '" height="' + h + '" fill="' + bg + '"/>';
  }

  function genAbstractGeometric(rng, w, h, pal) {
    var svg = svgOpen(w, h, pal[0]);
    var n = 6 + Math.floor(rng() * 6);
    for (var i = 0; i < n; i++) {
      var x = rng() * w, y = rng() * h;
      var sz = 40 + rng() * Math.min(w, h) * 0.4;
      var c = pal[1 + Math.floor(rng() * (pal.length - 1))];
      var shape = Math.floor(rng() * 3);
      if (shape === 0) {
        svg += '<rect x="' + x + '" y="' + y + '" width="' + sz + '" height="' + sz + '" fill="' + c + '"/>';
      } else if (shape === 1) {
        svg += '<circle cx="' + x + '" cy="' + y + '" r="' + (sz / 2) + '" fill="' + c + '"/>';
      } else {
        svg += '<polygon points="' + x + ',' + y + ' ' + (x + sz) + ',' + y + ' ' + (x + sz / 2) + ',' + (y + sz) + '" fill="' + c + '"/>';
      }
    }
    return svg + '</svg>';
  }

  function genMinimalLine(rng, w, h, pal) {
    var svg = svgOpen(w, h, pal[0]);
    var stroke = pal[pal.length - 1];
    var n = 3 + Math.floor(rng() * 4);
    for (var i = 0; i < n; i++) {
      var x1 = rng() * w, y1 = rng() * h;
      var x2 = rng() * w, y2 = rng() * h;
      svg += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
        '" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round"/>';
    }
    return svg + '</svg>';
  }

  function genBotanical(rng, w, h, pal) {
    var svg = svgOpen(w, h, pal[0]);
    var stemX = w / 2;
    svg += '<line x1="' + stemX + '" y1="' + h + '" x2="' + stemX + '" y2="' + (h * 0.2) +
      '" stroke="' + pal[2] + '" stroke-width="3"/>';
    var leaves = 5 + Math.floor(rng() * 5);
    for (var i = 0; i < leaves; i++) {
      var ly = h * 0.25 + (i / leaves) * h * 0.6;
      var side = i % 2 === 0 ? -1 : 1;
      var lw = 30 + rng() * 40;
      svg += '<ellipse cx="' + (stemX + side * lw / 2) + '" cy="' + ly +
        '" rx="' + lw + '" ry="12" fill="' + pal[2] +
        '" transform="rotate(' + (side * 20) + ' ' + (stemX + side * lw / 2) + ' ' + ly + ')"/>';
    }
    return svg + '</svg>';
  }

  function genCelestial(rng, w, h, pal) {
    var svg = svgOpen(w, h, pal[3]);
    var moonX = w * (0.3 + rng() * 0.4);
    var moonY = h * (0.2 + rng() * 0.3);
    var moonR = Math.min(w, h) * 0.15;
    svg += '<circle cx="' + moonX + '" cy="' + moonY + '" r="' + moonR + '" fill="' + pal[0] + '"/>';
    var stars = 30 + Math.floor(rng() * 30);
    for (var i = 0; i < stars; i++) {
      var sx = rng() * w, sy = rng() * h;
      var sr = 1 + rng() * 2;
      svg += '<circle cx="' + sx + '" cy="' + sy + '" r="' + sr + '" fill="' + pal[1] + '"/>';
    }
    return svg + '</svg>';
  }

  function genLandscape(rng, w, h, pal) {
    var svg = svgOpen(w, h, pal[0]);
    var horizon = h * (0.5 + rng() * 0.2);
    svg += '<rect y="' + horizon + '" width="' + w + '" height="' + (h - horizon) + '" fill="' + pal[2] + '"/>';
    var peaks = 3 + Math.floor(rng() * 3);
    var pts = '';
    var step = w / peaks;
    pts += '0,' + horizon;
    for (var i = 0; i < peaks; i++) {
      pts += ' ' + (i * step + step / 2) + ',' + (horizon - (100 + rng() * 150));
      pts += ' ' + ((i + 1) * step) + ',' + horizon;
    }
    svg += '<polygon points="' + pts + '" fill="' + pal[3] + '"/>';
    return svg + '</svg>';
  }

  function genTypography(rng, w, h, pal) {
    var words = ['DREAM', 'BREATHE', 'HOME', 'WANDER', 'STILL', 'GROW', 'BE HERE', 'HELLO'];
    var word = words[Math.floor(rng() * words.length)];
    var svg = svgOpen(w, h, pal[0]);
    var fontSize = Math.min(w, h) * 0.15;
    svg += '<text x="' + (w / 2) + '" y="' + (h / 2) + '" font-family="Georgia,serif"' +
      ' font-size="' + fontSize + '" fill="' + pal[3] +
      '" text-anchor="middle" dominant-baseline="middle">' + word + '</text>';
    return svg + '</svg>';
  }

  function genBoho(rng, w, h, pal) {
    var svg = svgOpen(w, h, pal[0]);
    var cx = w / 2, cy = h / 2;
    var rings = 4 + Math.floor(rng() * 3);
    for (var i = 0; i < rings; i++) {
      var r = (i + 1) * (Math.min(w, h) * 0.08);
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r +
        '" fill="none" stroke="' + pal[2] + '" stroke-width="1.5" stroke-dasharray="6 4"/>';
    }
    return svg + '</svg>';
  }

  function genMidCentury(rng, w, h, pal) {
    var svg = svgOpen(w, h, pal[0]);
    var bands = 4;
    var bw = w / bands;
    for (var i = 0; i < bands; i++) {
      svg += '<rect x="' + (i * bw) + '" y="0" width="' + bw + '" height="' + h +
        '" fill="' + pal[1 + (i % (pal.length - 1))] + '" opacity="0.7"/>';
    }
    svg += '<circle cx="' + (w / 2) + '" cy="' + (h / 2) + '" r="' + (Math.min(w, h) * 0.2) +
      '" fill="' + pal[3] + '"/>';
    return svg + '</svg>';
  }

  var GENERATORS = {
    'abstract-geometric': genAbstractGeometric,
    'minimal-line': genMinimalLine,
    'botanical': genBotanical,
    'celestial': genCelestial,
    'landscape': genLandscape,
    'typography': genTypography,
    'boho': genBoho,
    'mid-century': genMidCentury
  };

  function generateSvg(genre, seed, viewW, viewH) {
    viewW = viewW || 1000;
    viewH = viewH || 1400;
    var gen = GENERATORS[genre];
    if (!gen) throw new Error('unknown genre: ' + genre);
    var s = typeof seed === 'string' ? hashString(seed) : (seed >>> 0);
    var rng = seedRng(s);
    var pal = paletteFor(rng);
    return gen(rng, viewW, viewH, pal);
  }

  function buildCatalog(perGenre) {
    perGenre = perGenre || 18;
    var out = [];
    for (var g = 0; g < GENRES.length; g++) {
      var genre = GENRES[g];
      for (var i = 0; i < perGenre; i++) {
        var id = genre + '-' + String(i + 1).padStart(3, '0');
        out.push({
          id: id,
          genre: genre,
          title: prettyTitle(genre, i + 1),
          seed: hashString(id)
        });
      }
    }
    return out;
  }

  function prettyTitle(genre, n) {
    var g = genre.split('-').map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
    return g + ' No. ' + String(n).padStart(2, '0');
  }

  return {
    SIZES: SIZES,
    GENRES: GENRES,
    seedRng: seedRng,
    hashString: hashString,
    pixelDimensions: pixelDimensions,
    centerCrop: centerCrop,
    effectiveDpi: effectiveDpi,
    grade: grade,
    gradePhotoAcrossSizes: gradePhotoAcrossSizes,
    generateSvg: generateSvg,
    buildCatalog: buildCatalog
  };
}));
