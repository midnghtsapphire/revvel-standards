/*!
 * PrintBank print-engine.js
 * UMD: works in browser (window.PrintEngine) and Node (require).
 * Fully deterministic — no Math.random, no Date.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PrintEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ------------------------------------------------------------------
  // Standard print size catalog (inches unless noted)
  // ------------------------------------------------------------------
  const SIZES = [
    // 2:3
    { name: '4x6',   w: 4,  h: 6,  ratio: '2:3', unit: 'in' },
    { name: '8x12',  w: 8,  h: 12, ratio: '2:3', unit: 'in' },
    { name: '12x18', w: 12, h: 18, ratio: '2:3', unit: 'in' },
    { name: '16x24', w: 16, h: 24, ratio: '2:3', unit: 'in' },
    { name: '20x30', w: 20, h: 30, ratio: '2:3', unit: 'in' },
    { name: '24x36', w: 24, h: 36, ratio: '2:3', unit: 'in' },
    // 3:4
    { name: '6x8',   w: 6,  h: 8,  ratio: '3:4', unit: 'in' },
    { name: '9x12',  w: 9,  h: 12, ratio: '3:4', unit: 'in' },
    { name: '18x24', w: 18, h: 24, ratio: '3:4', unit: 'in' },
    // 4:5
    { name: '8x10',  w: 8,  h: 10, ratio: '4:5', unit: 'in' },
    { name: '16x20', w: 16, h: 20, ratio: '4:5', unit: 'in' },
    // 5:7
    { name: '5x7',   w: 5,  h: 7,  ratio: '5:7', unit: 'in' },
    { name: '10x14', w: 10, h: 14, ratio: '5:7', unit: 'in' },
    // 11x14
    { name: '11x14', w: 11, h: 14, ratio: '11:14', unit: 'in' },
    // square
    { name: '8x8',   w: 8,  h: 8,  ratio: '1:1', unit: 'in' },
    { name: '12x12', w: 12, h: 12, ratio: '1:1', unit: 'in' },
    { name: '20x20', w: 20, h: 20, ratio: '1:1', unit: 'in' },
    // ISO A-series (mm → in via /25.4)
    { name: 'A6', w: 105 / 25.4,  h: 148 / 25.4,  ratio: 'A',   unit: 'in' },
    { name: 'A5', w: 148 / 25.4,  h: 210 / 25.4,  ratio: 'A',   unit: 'in' },
    { name: 'A4', w: 210 / 25.4,  h: 297 / 25.4,  ratio: 'A',   unit: 'in' },
    { name: 'A3', w: 297 / 25.4,  h: 420 / 25.4,  ratio: 'A',   unit: 'in' },
    { name: 'A2', w: 420 / 25.4,  h: 594 / 25.4,  ratio: 'A',   unit: 'in' },
    { name: 'A1', w: 594 / 25.4,  h: 841 / 25.4,  ratio: 'A',   unit: 'in' },
    { name: 'A0', w: 841 / 25.4,  h: 1189 / 25.4, ratio: 'A',   unit: 'in' }
  ];

  function getSizes() { return SIZES.slice(); }
  function getSize(name) { return SIZES.find(s => s.name === name) || null; }

  // ------------------------------------------------------------------
  // DPI math
  // ------------------------------------------------------------------
  function pixelsForSize(size, dpi) {
    return { w: Math.round(size.w * dpi), h: Math.round(size.h * dpi) };
  }

  // Effective DPI after center-crop to size's aspect ratio.
  // photo = { w, h } in pixels. Auto-rotates size to best-fit orientation.
  function effectiveDPI(photo, size) {
    const pw = photo.w, ph = photo.h;
    const photoRatio = pw / ph;
    // choose size orientation matching photo
    const [sw, sh] = photoRatio >= 1
      ? [Math.max(size.w, size.h), Math.min(size.w, size.h)]
      : [Math.min(size.w, size.h), Math.max(size.w, size.h)];
    const sizeRatio = sw / sh;
    // center-crop photo to sizeRatio
    let cropW, cropH;
    if (photoRatio > sizeRatio) {
      cropH = ph;
      cropW = ph * sizeRatio;
    } else {
      cropW = pw;
      cropH = pw / sizeRatio;
    }
    const dpi = cropW / sw;
    return { dpi: Math.round(dpi), cropW: Math.round(cropW), cropH: Math.round(cropH), sizeW: sw, sizeH: sh };
  }

  function gradeDPI(dpi) {
    if (dpi >= 300) return 'gallery';
    if (dpi >= 240) return 'excellent';
    if (dpi >= 180) return 'good';
    if (dpi >= 150) return 'acceptable';
    return 'low';
  }

  function canExport(dpi) { return dpi >= 150; }

  function gradePhotoAllSizes(photo) {
    return SIZES.map(size => {
      const e = effectiveDPI(photo, size);
      return {
        size: size.name,
        ratio: size.ratio,
        dpi: e.dpi,
        grade: gradeDPI(e.dpi),
        canExport: canExport(e.dpi),
        crop: { w: e.cropW, h: e.cropH },
        printW: e.sizeW,
        printH: e.sizeH
      };
    });
  }

  // ------------------------------------------------------------------
  // Deterministic PRNG (mulberry32)
  // ------------------------------------------------------------------
  function seedFromString(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      let r = t;
      r = Math.imul(r ^ (r >>> 15), r | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ------------------------------------------------------------------
  // Vector art generator — 8 genres, deterministic per seed
  // ------------------------------------------------------------------
  const GENRES = ['abstract', 'geometric', 'botanical', 'minimal', 'typographic', 'celestial', 'coastal', 'cottagecore'];

  const PALETTES = {
    abstract:    ['#f4a261','#e76f51','#264653','#2a9d8f','#e9c46a'],
    geometric:   ['#0d1b2a','#1b263b','#415a77','#778da9','#e0e1dd'],
    botanical:   ['#588157','#3a5a40','#a3b18a','#dad7cd','#344e41'],
    minimal:     ['#ffffff','#f5f5f5','#222222','#888888','#dddddd'],
    typographic: ['#faf3e0','#eaddcf','#1e1e1e','#c08552','#5e503f'],
    celestial:   ['#0b0c2a','#1a1a40','#4b0082','#ffd700','#e6e6fa'],
    coastal:     ['#e0f7fa','#b3e5fc','#4fc3f7','#0277bd','#01579b'],
    cottagecore: ['#f5e6cc','#d9a679','#b5651d','#7c9473','#c9b1a4']
  };

  function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }

  function generateSVG(genre, seed, opts) {
    opts = opts || {};
    const W = opts.viewW || 1000;
    const H = opts.viewH || 1500;
    const rand = mulberry32(seedFromString(genre + ':' + seed));
    const palette = PALETTES[genre] || PALETTES.abstract;
    const bg = palette[0];
    let body = '';

    if (genre === 'abstract') {
      const blobs = 6 + Math.floor(rand() * 6);
      for (let i = 0; i < blobs; i++) {
        const cx = rand() * W, cy = rand() * H;
        const r  = 100 + rand() * 300;
        body += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${pick(rand,palette)}" opacity="${(0.4+rand()*0.5).toFixed(2)}"/>`;
      }
    } else if (genre === 'geometric') {
      const cols = 4 + Math.floor(rand()*4);
      const rows = Math.floor(cols * H / W);
      const cw = W/cols, ch = H/rows;
      for (let y=0;y<rows;y++) for (let x=0;x<cols;x++) {
        body += `<rect x="${(x*cw).toFixed(1)}" y="${(y*ch).toFixed(1)}" width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" fill="${pick(rand,palette)}"/>`;
      }
    } else if (genre === 'botanical') {
      const stems = 3 + Math.floor(rand()*4);
      for (let i=0;i<stems;i++) {
        const x = (i+1) * W/(stems+1);
        body += `<path d="M${x.toFixed(1)} ${H} Q ${(x+ (rand()-0.5)*100).toFixed(1)} ${(H/2).toFixed(1)} ${x.toFixed(1)} ${(H*0.15).toFixed(1)}" stroke="${palette[1]}" stroke-width="6" fill="none"/>`;
        const leaves = 4 + Math.floor(rand()*5);
        for (let j=0;j<leaves;j++) {
          const ly = H*0.2 + (H*0.7)*(j/leaves);
          const side = j%2 ? 1 : -1;
          body += `<ellipse cx="${(x+side*40).toFixed(1)}" cy="${ly.toFixed(1)}" rx="30" ry="12" fill="${pick(rand,palette)}" transform="rotate(${(side*30).toFixed(0)} ${x.toFixed(1)} ${ly.toFixed(1)})"/>`;
        }
      }
    } else if (genre === 'minimal') {
      const lines = 1 + Math.floor(rand()*3);
      for (let i=0;i<lines;i++) {
        const y = H*0.3 + rand()*H*0.4;
        body += `<line x1="${(W*0.1).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(W*0.9).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${palette[2]}" stroke-width="3"/>`;
      }
      body += `<circle cx="${(W/2).toFixed(1)}" cy="${(H/2).toFixed(1)}" r="${(80+rand()*80).toFixed(1)}" fill="none" stroke="${palette[2]}" stroke-width="2"/>`;
    } else if (genre === 'typographic') {
      const words = ['HELLO','DREAM','HOME','LOVE','BREATHE','WANDER','GROW','STAY'];
      const word = words[Math.floor(rand()*words.length)];
      body += `<text x="${(W/2).toFixed(1)}" y="${(H/2).toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-size="${(140+rand()*100).toFixed(0)}" fill="${palette[2]}">${word}</text>`;
    } else if (genre === 'celestial') {
      const stars = 60 + Math.floor(rand()*80);
      for (let i=0;i<stars;i++) {
        body += `<circle cx="${(rand()*W).toFixed(1)}" cy="${(rand()*H).toFixed(1)}" r="${(0.5+rand()*2).toFixed(2)}" fill="${palette[3]}"/>`;
      }
      body += `<circle cx="${(W*0.7).toFixed(1)}" cy="${(H*0.25).toFixed(1)}" r="${(60+rand()*40).toFixed(1)}" fill="${palette[4]}" opacity="0.9"/>`;
    } else if (genre === 'coastal') {
      const waves = 5 + Math.floor(rand()*4);
      for (let i=0;i<waves;i++) {
        const y = H*(0.3 + i*0.1);
        let d = `M0 ${y.toFixed(1)}`;
        for (let x=0;x<=W;x+=100) {
          d += ` Q ${(x+50).toFixed(1)} ${(y + (rand()-0.5)*40).toFixed(1)} ${(x+100).toFixed(1)} ${y.toFixed(1)}`;
        }
        body += `<path d="${d}" stroke="${pick(rand,palette)}" stroke-width="3" fill="none"/>`;
      }
    } else if (genre === 'cottagecore') {
      const flowers = 8 + Math.floor(rand()*8);
      for (let i=0;i<flowers;i++) {
        const cx = rand()*W, cy = rand()*H;
        const petals = 5 + Math.floor(rand()*3);
        for (let p=0;p<petals;p++) {
          const a = (p/petals) * Math.PI * 2;
          const px = cx + Math.cos(a)*20;
          const py = cy + Math.sin(a)*20;
          body += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="18" fill="${pick(rand,palette)}" opacity="0.85"/>`;
        }
        body += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="10" fill="${palette[2]}"/>`;
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${bg}"/>${body}</svg>`;
  }

  function buildCatalog(perGenre) {
    perGenre = perGenre || 18;
    const out = [];
    for (const g of GENRES) {
      for (let i = 0; i < perGenre; i++) {
        const id = `${g}-${String(i+1).padStart(3,'0')}`;
        out.push({
          id,
          genre: g,
          seed: i + 1,
          title: `${g.charAt(0).toUpperCase()+g.slice(1)} #${i+1}`
        });
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
    effectiveDPI,
    gradeDPI,
    canExport,
    gradePhotoAllSizes,
    generateSVG,
    buildCatalog,
    seedFromString,
    mulberry32
  };
}));
