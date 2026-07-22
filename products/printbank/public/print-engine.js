// PrintBank print engine — UMD (browser + Node)
// Deterministic. No Math.random, no Date.now.
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
    { id: '4x6',    w: 4,     h: 6,     ratio: '2:3',   label: '4×6 in' },
    { id: '5x7',    w: 5,     h: 7,     ratio: '5:7',   label: '5×7 in' },
    { id: '6x8',    w: 6,     h: 8,     ratio: '3:4',   label: '6×8 in' },
    { id: '8x10',   w: 8,     h: 10,    ratio: '4:5',   label: '8×10 in' },
    { id: '8x12',   w: 8,     h: 12,    ratio: '2:3',   label: '8×12 in' },
    { id: '11x14',  w: 11,    h: 14,    ratio: '11:14', label: '11×14 in' },
    { id: '12x16',  w: 12,    h: 16,    ratio: '3:4',   label: '12×16 in' },
    { id: '12x18',  w: 12,    h: 18,    ratio: '2:3',   label: '12×18 in' },
    { id: '16x20',  w: 16,    h: 20,    ratio: '4:5',   label: '16×20 in' },
    { id: '16x24',  w: 16,    h: 24,    ratio: '2:3',   label: '16×24 in' },
    { id: '18x24',  w: 18,    h: 24,    ratio: '3:4',   label: '18×24 in' },
    { id: '20x30',  w: 20,    h: 30,    ratio: '2:3',   label: '20×30 in' },
    { id: '24x36',  w: 24,    h: 36,    ratio: '2:3',   label: '24×36 in' },
    { id: 'sq6',    w: 6,     h: 6,     ratio: '1:1',   label: '6×6 in' },
    { id: 'sq8',    w: 8,     h: 8,     ratio: '1:1',   label: '8×8 in' },
    { id: 'sq12',   w: 12,    h: 12,    ratio: '1:1',   label: '12×12 in' },
    { id: 'sq20',   w: 20,    h: 20,    ratio: '1:1',   label: '20×20 in' },
    { id: 'A5',     w: 5.83,  h: 8.27,  ratio: 'A',     label: 'A5' },
    { id: 'A4',     w: 8.27,  h: 11.69, ratio: 'A',     label: 'A4' },
    { id: 'A3',     w: 11.69, h: 16.54, ratio: 'A',     label: 'A3' },
    { id: 'A2',     w: 16.54, h: 23.39, ratio: 'A',     label: 'A2' },
    { id: 'A1',     w: 23.39, h: 33.11, ratio: 'A',     label: 'A1' },
    { id: 'A0',     w: 33.11, h: 46.81, ratio: 'A',     label: 'A0' },
    { id: '30x40',  w: 30,    h: 40,    ratio: '3:4',   label: '30×40 in' }
  ];

  var GENRES = [
    'botanical', 'geometric', 'abstract', 'minimal',
    'celestial', 'typographic', 'landscape', 'mandala'
  ];

  // Deterministic PRNG (mulberry32)
  function seededRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function pixelsForSize(sizeId, dpi) {
    var s = SIZES.find(function (x) { return x.id === sizeId; });
    if (!s) throw new Error('unknown size: ' + sizeId);
    return {
      w: Math.round(s.w * dpi),
      h: Math.round(s.h * dpi)
    };
  }

  // Grade a photo (in pixels) against a print size (in inches).
  // Considers auto-rotation to best-fit ratio.
  function gradePhoto(photoW, photoH, sizeId) {
    var s = SIZES.find(function (x) { return x.id === sizeId; });
    if (!s) throw new Error('unknown size: ' + sizeId);

    // Try both orientations; pick higher effective DPI after center-crop.
    function effectiveDpi(pw, ph, sw, sh) {
      var photoRatio = pw / ph;
      var printRatio = sw / sh;
      var cropW, cropH;
      if (photoRatio > printRatio) {
        // photo is wider: crop sides
        cropH = ph;
        cropW = ph * printRatio;
      } else {
        cropW = pw;
        cropH = pw / printRatio;
      }
      return Math.min(cropW / sw, cropH / sh);
    }

    var dpiA = effectiveDpi(photoW, photoH, s.w, s.h);
    var dpiB = effectiveDpi(photoW, photoH, s.h, s.w);
    var rotated = dpiB > dpiA;
    var dpi = Math.max(dpiA, dpiB);

    var grade;
    if (dpi >= 300) grade = 'gallery';
    else if (dpi >= 240) grade = 'excellent';
    else if (dpi >= 180) grade = 'good';
    else if (dpi >= 150) grade = 'acceptable';
    else grade = 'low';

    return {
      sizeId: sizeId,
      dpi: Math.round(dpi),
      grade: grade,
      rotated: rotated,
      printReady: dpi >= 150
    };
  }

  // Center-crop math
  function centerCrop(photoW, photoH, targetRatio) {
    var photoRatio = photoW / photoH;
    var cropW, cropH, x, y;
    if (photoRatio > targetRatio) {
      cropH = photoH;
      cropW = photoH * targetRatio;
      x = (photoW - cropW) / 2;
      y = 0;
    } else {
      cropW = photoW;
      cropH = photoW / targetRatio;
      x = 0;
      y = (photoH - cropH) / 2;
    }
    return { x: x, y: y, w: cropW, h: cropH };
  }

  // ---- SVG generators (deterministic) ----

  function paletteFor(rng) {
    var palettes = [
      ['#1b1b1b', '#f4efe6', '#c98a5a', '#6b8e6f'],
      ['#0f2027', '#203a43', '#2c5364', '#e0e0e0'],
      ['#f5e6d3', '#d4a373', '#a68a64', '#3c2f2f'],
      ['#eae4d3', '#2e2e2e', '#b23a48', '#6a994e'],
      ['#faf3e0', '#e07a5f', '#3d405b', '#81b29a'],
      ['#111111', '#eeeeee', '#888888', '#c0c0c0']
    ];
    return palettes[Math.floor(rng() * palettes.length)];
  }

  function genBotanical(rng, w, h, pal) {
    var parts = [];
    parts.push('<rect width="' + w + '" height="' + h + '" fill="' + pal[1] + '"/>');
    var stemX = w / 2;
    parts.push('<line x1="' + stemX + '" y1="' + (h * 0.9) + '" x2="' + stemX + '" y2="' + (h * 0.2) + '" stroke="' + pal[3] + '" stroke-width="' + (w * 0.008) + '"/>');
    var leaves = 6 + Math.floor(rng() * 5);
    for (var i = 0; i < leaves; i++) {
      var t = i / leaves;
      var y = h * 0.85 - t * h * 0.6;
      var side = i % 2 === 0 ? -1 : 1;
      var lx = stemX + side * w * (0.05 + rng() * 0.15);
      parts.push('<ellipse cx="' + lx + '" cy="' + y + '" rx="' + (w * 0.06) + '" ry="' + (w * 0.02) + '" fill="' + pal[3] + '" transform="rotate(' + (side * 30) + ' ' + lx + ' ' + y + ')"/>');
    }
    parts.push('<circle cx="' + stemX + '" cy="' + (h * 0.18) + '" r="' + (w * 0.05) + '" fill="' + pal[2] + '"/>');
    return parts.join('');
  }

  function genGeometric(rng, w, h, pal) {
    var parts = [];
    parts.push('<rect width="' + w + '" height="' + h + '" fill="' + pal[1] + '"/>');
    var count = 5 + Math.floor(rng() * 6);
    for (var i = 0; i < count; i++) {
      var cx = rng() * w;
      var cy = rng() * h;
      var r = w * (0.05 + rng() * 0.2);
      var color = pal[2 + Math.floor(rng() * 2)];
      parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + color + '" opacity="0.7"/>');
    }
    return parts.join('');
  }

  function genAbstract(rng, w, h, pal) {
    var parts = [];
    parts.push('<rect width="' + w + '" height="' + h + '" fill="' + pal[0] + '"/>');
    var count = 4 + Math.floor(rng() * 4);
    for (var i = 0; i < count; i++) {
      var x1 = rng() * w;
      var y1 = rng() * h;
      var x2 = rng() * w;
      var y2 = rng() * h;
      var color = pal[1 + Math.floor(rng() * 3)];
      parts.push('<path d="M' + x1 + ' ' + y1 + ' Q' + (w / 2) + ' ' + (rng() * h) + ' ' + x2 + ' ' + y2 + '" stroke="' + color + '" stroke-width="' + (w * 0.01) + '" fill="none"/>');
    }
    return parts.join('');
  }

  function genMinimal(rng, w, h, pal) {
    var parts = [];
    parts.push('<rect width="' + w + '" height="' + h + '" fill="' + pal[1] + '"/>');
    var cx = w / 2, cy = h / 2;
    parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + (Math.min(w, h) * 0.25) + '" fill="none" stroke="' + pal[0] + '" stroke-width="' + (w * 0.005) + '"/>');
    parts.push('<line x1="' + (w * 0.2) + '" y1="' + (h * 0.8) + '" x2="' + (w * 0.8) + '" y2="' + (h * 0.8) + '" stroke="' + pal[0] + '" stroke-width="' + (w * 0.003) + '"/>');
    return parts.join('');
  }

  function genCelestial(rng, w, h, pal) {
    var parts = [];
    parts.push('<rect width="' + w + '" height="' + h + '" fill="' + pal[0] + '"/>');
    var stars = 30 + Math.floor(rng() * 40);
    for (var i = 0; i < stars; i++) {
      var sx = rng() * w;
      var sy = rng() * h;
      var sr = w * (0.001 + rng() * 0.004);
      parts.push('<circle cx="' + sx + '" cy="' + sy + '" r="' + sr + '" fill="' + pal[1] + '"/>');
    }
    parts.push('<circle cx="' + (w * 0.5) + '" cy="' + (h * 0.35) + '" r="' + (w * 0.15) + '" fill="' + pal[1] + '" opacity="0.9"/>');
    parts.push('<circle cx="' + (w * 0.55) + '" cy="' + (h * 0.32) + '" r="' + (w * 0.13) + '" fill="' + pal[0] + '"/>');
    return parts.join('');
  }

  function genTypographic(rng, w, h, pal) {
    var words = ['CALM', 'BREATHE', 'WANDER', 'STILL', 'HOME', 'GATHER', 'DREAM', 'GROW'];
    var word = words[Math.floor(rng() * words.length)];
    var parts = [];
    parts.push('<rect width="' + w + '" height="' + h + '" fill="' + pal[1] + '"/>');
    parts.push('<text x="' + (w / 2) + '" y="' + (h / 2) + '" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, serif" font-size="' + (w * 0.18) + '" fill="' + pal[0] + '" letter-spacing="' + (w * 0.01) + '">' + word + '</text>');
    return parts.join('');
  }

  function genLandscape(rng, w, h, pal) {
    var parts = [];
    parts.push('<rect width="' + w + '" height="' + h + '" fill="' + pal[1] + '"/>');
    var horizon = h * (0.55 + rng() * 0.1);
    parts.push('<rect x="0" y="' + horizon + '" width="' + w + '" height="' + (h - horizon) + '" fill="' + pal[3] + '"/>');
    var peaks = 3 + Math.floor(rng() * 3);
    var d = 'M0 ' + horizon;
    for (var i = 1; i <= peaks; i++) {
      var px = (w / peaks) * i;
      var py = horizon - h * (0.1 + rng() * 0.25);
      d += ' L' + (px - w / (peaks * 2)) + ' ' + py + ' L' + px + ' ' + horizon;
    }
    parts.push('<path d="' + d + '" fill="' + pal[2] + '"/>');
    parts.push('<circle cx="' + (w * 0.7) + '" cy="' + (horizon - h * 0.15) + '" r="' + (w * 0.06) + '" fill="' + pal[0] + '"/>');
    return parts.join('');
  }

  function genMandala(rng, w, h, pal) {
    var parts = [];
    parts.push('<rect width="' + w + '" height="' + h + '" fill="' + pal[1] + '"/>');
    var cx = w / 2, cy = h / 2;
    var rings = 4 + Math.floor(rng() * 3);
    var petals = 8 + Math.floor(rng() * 8) * 2;
    for (var r = 1; r <= rings; r++) {
      var radius = (Math.min(w, h) * 0.05) * r;
      parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" fill="none" stroke="' + pal[0] + '" stroke-width="' + (w * 0.002) + '"/>');
    }
    for (var p = 0; p < petals; p++) {
      var angle = (p / petals) * Math.PI * 2;
      var px = cx + Math.cos(angle) * Math.min(w, h) * 0.25;
      var py = cy + Math.sin(angle) * Math.min(w, h) * 0.25;
      parts.push('<circle cx="' + px + '" cy="' + py + '" r="' + (w * 0.02) + '" fill="' + pal[2] + '"/>');
    }
    return parts.join('');
  }

  var GENERATORS = {
    botanical: genBotanical,
    geometric: genGeometric,
    abstract: genAbstract,
    minimal: genMinimal,
    celestial: genCelestial,
    typographic: genTypographic,
    landscape: genLandscape,
    mandala: genMandala
  };

  function generateSvg(seed, genre, opts) {
    opts = opts || {};
    var w = opts.width || 1000;
    var h = opts.height || 1500;
    var rng = seededRng(hashSeed(seed + ':' + genre));
    var pal = paletteFor(rng);
    var body = (GENERATORS[genre] || genGeometric)(rng, w, h, pal);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">' + body + '</svg>';
  }

  function buildCatalog(count) {
    count = count || 144;
    var items = [];
    for (var i = 0; i < count; i++) {
      var genre = GENRES[i % GENRES.length];
      var id = 'pb-' + String(i + 1).padStart(4, '0');
      items.push({
        id: id,
        title: genre.charAt(0).toUpperCase() + genre.slice(1) + ' No. ' + (Math.floor(i / GENRES.length) + 1),
        genre: genre,
        seed: id
      });
    }
    return items;
  }

  return {
    SIZES: SIZES,
    GENRES: GENRES,
    pixelsForSize: pixelsForSize,
    gradePhoto: gradePhoto,
    centerCrop: centerCrop,
    generateSvg: generateSvg,
    buildCatalog: buildCatalog,
    seededRng: seededRng,
    hashSeed: hashSeed
  };
}));
