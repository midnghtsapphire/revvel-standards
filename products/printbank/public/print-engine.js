/*!
 * PrintBank print-engine (UMD)
 * Deterministic — no Math.random, no Date. Same inputs → same outputs.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PrintEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- Print size catalog ----------
  var SIZES = [
    // 2:3
    { id: '4x6',   w: 4,  h: 6,  ratio: '2:3', family: 'imperial' },
    { id: '8x12',  w: 8,  h: 12, ratio: '2:3', family: 'imperial' },
    { id: '12x18', w: 12, h: 18, ratio: '2:3', family: 'imperial' },
    { id: '16x24', w: 16, h: 24, ratio: '2:3', family: 'imperial' },
    { id: '20x30', w: 20, h: 30, ratio: '2:3', family: 'imperial' },
    { id: '24x36', w: 24, h: 36, ratio: '2:3', family: 'imperial' },
    // 3:4
    { id: '6x8',   w: 6,  h: 8,  ratio: '3:4', family: 'imperial' },
    { id: '9x12',  w: 9,  h: 12, ratio: '3:4', family: 'imperial' },
    { id: '12x16', w: 12, h: 16, ratio: '3:4', family: 'imperial' },
    { id: '18x24', w: 18, h: 24, ratio: '3:4', family: 'imperial' },
    // 4:5
    { id: '8x10',  w: 8,  h: 10, ratio: '4:5', family: 'imperial' },
    { id: '11x14', w: 11, h: 14, ratio: '4:5', family: 'imperial' },
    { id: '16x20', w: 16, h: 20, ratio: '4:5', family: 'imperial' },
    { id: '20x25', w: 20, h: 25, ratio: '4:5', family: 'imperial' },
    // 5:7
    { id: '5x7',   w: 5,  h: 7,  ratio: '5:7', family: 'imperial' },
    { id: '10x14', w: 10, h: 14, ratio: '5:7', family: 'imperial' },
    // Square
    { id: '8x8',   w: 8,  h: 8,  ratio: '1:1', family: 'imperial' },
    { id: '10x10', w: 10, h: 10, ratio: '1:1', family: 'imperial' },
    { id: '12x12', w: 12, h: 12, ratio: '1:1', family: 'imperial' },
    { id: '20x20', w: 20, h: 20, ratio: '1:1', family: 'imperial' },
    // ISO A-series (mm converted to inches at export time)
    { id: 'A4', wMm: 210,  hMm: 297,  ratio: '1:√2', family: 'iso' },
    { id: 'A3', wMm: 297,  hMm: 420,  ratio: '1:√2', family: 'iso' },
    { id: 'A2', wMm: 420,  hMm: 594,  ratio: '1:√2', family: 'iso' },
    { id: 'A1', wMm: 594,  hMm: 841,  ratio: '1:√2', family: 'iso' },
    { id: 'A0', wMm: 841,  hMm: 1189, ratio: '1:√2', family: 'iso' }
  ];

  var MM_PER_INCH = 25.4;

  function sizeInInches(size) {
    if (size.family === 'iso') {
      return { w: size.wMm / MM_PER_INCH, h: size.hMm / MM_PER_INCH };
    }
    return { w: size.w, h: size.h };
  }

  function pixelsAtDpi(size, dpi) {
    var inches = sizeInInches(size);
    return {
      w: Math.round(inches.w * dpi),
      h: Math.round(inches.h * dpi)
    };
  }

  // ---------- Photo grading ----------
  // Center-crop math: crop source to match target aspect, then compute effective DPI
  function centerCropTo(sourceW, sourceH, targetW, targetH) {
    var sourceRatio = sourceW / sourceH;
    var targetRatio = targetW / targetH;
    var cropW, cropH, offsetX, offsetY;
    if (sourceRatio > targetRatio) {
      // source wider than target — crop sides
      cropH = sourceH;
      cropW = Math.round(sourceH * targetRatio);
      offsetX = Math.round((sourceW - cropW) / 2);
      offsetY = 0;
    } else {
      cropW = sourceW;
      cropH = Math.round(sourceW / targetRatio);
      offsetX = 0;
      offsetY = Math.round((sourceH - cropH) / 2);
    }
    return { cropW: cropW, cropH: cropH, offsetX: offsetX, offsetY: offsetY };
  }

  function gradeForDpi(dpi) {
    if (dpi >= 300) return { grade: 'gallery',    exportable: true,  min: 300 };
    if (dpi >= 240) return { grade: 'excellent',  exportable: true,  min: 240 };
    if (dpi >= 180) return { grade: 'good',       exportable: true,  min: 180 };
    if (dpi >= 150) return { grade: 'acceptable', exportable: true,  min: 150 };
    return              { grade: 'low',          exportable: false, min: 0   };
  }

  // Grade one photo against one size, trying both orientations, keeping the best
  function gradePhotoAgainstSize(photoW, photoH, size) {
    var inches = sizeInInches(size);
    function tryOrient(tW, tH, rotated) {
      var crop = centerCropTo(photoW, photoH, tW, tH);
      var effDpi = Math.min(crop.cropW / tW, crop.cropH / tH);
      var g = gradeForDpi(effDpi);
      return {
        sizeId: size.id,
        rotated: rotated,
        effectiveDpi: Math.round(effDpi),
        grade: g.grade,
        exportable: g.exportable,
        crop: crop,
        targetInches: { w: tW, h: tH }
      };
    }
    var portrait = tryOrient(inches.w, inches.h, false);
    var landscape = tryOrient(inches.h, inches.w, true);
    return portrait.effectiveDpi >= landscape.effectiveDpi ? portrait : landscape;
  }

  function gradePhotoAgainstAll(photoW, photoH) {
    return SIZES.map(function (s) { return gradePhotoAgainstSize(photoW, photoH, s); });
  }

  // ---------- Deterministic PRNG (mulberry32) ----------
  function hashString(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Genres ----------
  var GENRES = [
    'abstract-geometric',
    'minimalist-lines',
    'botanical-silhouette',
    'mid-century-modern',
    'topographic',
    'bauhaus',
    'celestial',
    'monochrome-waves'
  ];

  var PALETTES = {
    'abstract-geometric':     ['#F4A261', '#E76F51', '#2A9D8F', '#264653', '#E9C46A'],
    'minimalist-lines':       ['#111111', '#F5F5F5'],
    'botanical-silhouette':   ['#2D3E2E', '#F1EDE4', '#88A47C'],
    'mid-century-modern':     ['#D8A48F', '#BB8588', '#EAD2AC', '#9CAFB7', '#4A5859'],
    'topographic':            ['#1B263B', '#415A77', '#778DA9', '#E0E1DD'],
    'bauhaus':                ['#E63946', '#F1FAEE', '#A8DADC', '#457B9D', '#1D3557'],
    'celestial':              ['#0B0C1E', '#1B1D3A', '#FFF3B0', '#E09F3E'],
    'monochrome-waves':       ['#222222', '#F8F8F8']
  };

  // ---------- SVG generator ----------
  function svgHeader(w, h) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">';
  }

  function genAbstractGeometric(rand, palette, w, h) {
    var parts = ['<rect width="' + w + '" height="' + h + '" fill="' + palette[0] + '"/>'];
    var n = 6 + Math.floor(rand() * 8);
    for (var i = 0; i < n; i++) {
      var cx = rand() * w;
      var cy = rand() * h;
      var r = 40 + rand() * (Math.min(w, h) / 3);
      var fill = palette[1 + Math.floor(rand() * (palette.length - 1))];
      var op = (0.4 + rand() * 0.5).toFixed(2);
      parts.push('<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + fill + '" opacity="' + op + '"/>');
    }
    return parts.join('');
  }

  function genMinimalistLines(rand, palette, w, h) {
    var parts = ['<rect width="' + w + '" height="' + h + '" fill="' + palette[1] + '"/>'];
    var n = 5 + Math.floor(rand() * 10);
    for (var i = 0; i < n; i++) {
      var y = (i + 1) * (h / (n + 1));
      var x1 = rand() * (w * 0.2);
      var x2 = w - rand() * (w * 0.2);
      parts.push('<line x1="' + x1.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + palette[0] + '" stroke-width="2"/>');
    }
    return parts.join('');
  }

  function genBotanical(rand, palette, w, h) {
    var parts = ['<rect width="' + w + '" height="' + h + '" fill="' + palette[1] + '"/>'];
    var cx = w / 2;
    var stemH = h * 0.7;
    parts.push('<line x1="' + cx + '" y1="' + h + '" x2="' + cx + '" y2="' + (h - stemH) + '" stroke="' + palette[0] + '" stroke-width="3"/>');
    var leaves = 4 + Math.floor(rand() * 6);
    for (var i = 0; i < leaves; i++) {
      var t = (i + 1) / (leaves + 1);
      var ly = h - stemH * t;
      var side = i % 2 === 0 ? 1 : -1;
      var lw = 30 + rand() * 60;
      var lh = 10 + rand() * 20;
      parts.push('<ellipse cx="' + (cx + side * lw / 2).toFixed(1) + '" cy="' + ly.toFixed(1) + '" rx="' + (lw / 2).toFixed(1) + '" ry="' + lh.toFixed(1) + '" fill="' + palette[2 % palette.length] + '" transform="rotate(' + (side * 20).toFixed(0) + ' ' + (cx + side * lw / 2).toFixed(1) + ' ' + ly.toFixed(1) + ')"/>');
    }
    return parts.join('');
  }

  function genMidCentury(rand, palette, w, h) {
    var parts = ['<rect width="' + w + '" height="' + h + '" fill="' + palette[2] + '"/>'];
    var rows = 3 + Math.floor(rand() * 3);
    var cols = 3 + Math.floor(rand() * 3);
    var cw = w / cols;
    var ch = h / rows;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var fill = palette[Math.floor(rand() * palette.length)];
        parts.push('<rect x="' + (c * cw).toFixed(1) + '" y="' + (r * ch).toFixed(1) + '" width="' + cw.toFixed(1) + '" height="' + ch.toFixed(1) + '" fill="' + fill + '" opacity="0.75"/>');
      }
    }
    return parts.join('');
  }

  function genTopographic(rand, palette, w, h) {
    var parts = ['<rect width="' + w + '" height="' + h + '" fill="' + palette[0] + '"/>'];
    var n = 8 + Math.floor(rand() * 6);
    for (var i = 0; i < n; i++) {
      var cx = rand() * w;
      var cy = rand() * h;
      var rx = 100 + rand() * (w / 2);
      var ry = 60 + rand() * (h / 3);
      parts.push('<ellipse cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '" fill="none" stroke="' + palette[2] + '" stroke-width="1" opacity="0.6"/>');
    }
    return parts.join('');
  }

  function genBauhaus(rand, palette, w, h) {
    var parts = ['<rect width="' + w + '" height="' + h + '" fill="' + palette[1] + '"/>'];
    var shapes = 4 + Math.floor(rand() * 4);
    for (var i = 0; i < shapes; i++) {
      var kind = Math.floor(rand() * 3);
      var fill = palette[Math.floor(rand() * palette.length)];
      var x = rand() * w;
      var y = rand() * h;
      var s = 80 + rand() * 240;
      if (kind === 0) {
        parts.push('<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (s / 2).toFixed(1) + '" fill="' + fill + '"/>');
      } else if (kind === 1) {
        parts.push('<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + s.toFixed(1) + '" height="' + s.toFixed(1) + '" fill="' + fill + '"/>');
      } else {
        parts.push('<polygon points="' + x.toFixed(1) + ',' + y.toFixed(1) + ' ' + (x + s).toFixed(1) + ',' + y.toFixed(1) + ' ' + (x + s / 2).toFixed(1) + ',' + (y - s).toFixed(1) + '" fill="' + fill + '"/>');
      }
    }
    return parts.join('');
  }

  function genCelestial(rand, palette, w, h) {
    var parts = ['<rect width="' + w + '" height="' + h + '" fill="' + palette[0] + '"/>'];
    var stars = 40 + Math.floor(rand() * 40);
    for (var i = 0; i < stars; i++) {
      var x = rand() * w;
      var y = rand() * h;
      var r = 1 + rand() * 2;
      parts.push('<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + palette[2] + '"/>');
    }
    // moon
    var mx = w * (0.3 + rand() * 0.4);
    var my = h * (0.2 + rand() * 0.3);
    var mr = 30 + rand() * 40;
    parts.push('<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="' + mr.toFixed(1) + '" fill="' + palette[3] + '"/>');
    return parts.join('');
  }

  function genMonochromeWaves(rand, palette, w, h) {
    var parts = ['<rect width="' + w + '" height="' + h + '" fill="' + palette[1] + '"/>'];
    var lines = 20 + Math.floor(rand() * 20);
    var amp = 20 + rand() * 40;
    for (var i = 0; i < lines; i++) {
      var y0 = (i + 1) * (h / (lines + 1));
      var d = 'M 0 ' + y0.toFixed(1);
      var segs = 8;
      for (var s = 1; s <= segs; s++) {
        var x = (s / segs) * w;
        var y = y0 + Math.sin((rand() * 6.28 + s) * 1.0) * amp * (rand() * 0.5 + 0.5);
        d += ' L ' + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      parts.push('<path d="' + d + '" fill="none" stroke="' + palette[0] + '" stroke-width="1" opacity="0.5"/>');
    }
    return parts.join('');
  }

  var GENERATORS = {
    'abstract-geometric':   genAbstractGeometric,
    'minimalist-lines':     genMinimalistLines,
    'botanical-silhouette': genBotanical,
    'mid-century-modern':   genMidCentury,
    'topographic':          genTopographic,
    'bauhaus':              genBauhaus,
    'celestial':            genCelestial,
    'monochrome-waves':     genMonochromeWaves
  };

  function generateSvg(seed, genre, viewW, viewH) {
    viewW = viewW || 1000;
    viewH = viewH || 1500;
    var g = genre && GENERATORS[genre] ? genre : GENRES[0];
    var rand = mulberry32(hashString(seed + '|' + g));
    var body = GENERATORS[g](rand, PALETTES[g], viewW, viewH);
    return svgHeader(viewW, viewH) + body + '</svg>';
  }

  // ---------- Catalog builder ----------
  function buildCatalog(count) {
    count = count || 144;
    var items = [];
    for (var i = 0; i < count; i++) {
      var genre = GENRES[i % GENRES.length];
      var seed = 'printbank-' + String(i).padStart(4, '0');
      items.push({
        id: seed,
        title: titleFor(genre, i),
        genre: genre,
        seed: seed
      });
    }
    return items;
  }

  function titleFor(genre, i) {
    var words = {
      'abstract-geometric':   ['Convergence', 'Orbit', 'Fragment', 'Motif'],
      'minimalist-lines':     ['Silence', 'Threshold', 'Interval', 'Horizon'],
      'botanical-silhouette': ['Fern', 'Sprig', 'Bloom', 'Herbarium'],
      'mid-century-modern':   ['Palm Springs', 'Atomic', 'Eames', 'Vista'],
      'topographic':          ['Contour', 'Basin', 'Ridge', 'Tideline'],
      'bauhaus':              ['Weimar', 'Composition', 'Primary', 'Grid'],
      'celestial':            ['Nocturne', 'Waxing Moon', 'Constellation', 'Zenith'],
      'monochrome-waves':     ['Frequency', 'Undertow', 'Signal', 'Drift']
    };
    var arr = words[genre] || ['Print'];
    return arr[i % arr.length] + ' №' + String(i + 1).padStart(3, '0');
  }

  return {
    SIZES: SIZES,
    GENRES: GENRES,
    PALETTES: PALETTES,
    MM_PER_INCH: MM_PER_INCH,
    sizeInInches: sizeInInches,
    pixelsAtDpi: pixelsAtDpi,
    centerCropTo: centerCropTo,
    gradeForDpi: gradeForDpi,
    gradePhotoAgainstSize: gradePhotoAgainstSize,
    gradePhotoAgainstAll: gradePhotoAgainstAll,
    hashString: hashString,
    mulberry32: mulberry32,
    generateSvg: generateSvg,
    buildCatalog: buildCatalog,
    titleFor: titleFor
  };
});
