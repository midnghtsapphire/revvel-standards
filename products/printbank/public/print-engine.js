/**
 * PrintBank engine — print-size math and procedural vector art.
 *
 * Everything here is deterministic (seeded RNG, no Date/Math.random) so the
 * catalog is reproducible and testable. Works in Node (CommonJS) and in the
 * browser via `window.PrintEngine`.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.PrintEngine = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const MM_PER_INCH = 25.4;

  // ---------------------------------------------------------------------------
  // Aspect ratios and standard print sizes
  // ---------------------------------------------------------------------------

  const RATIOS = [
    { id: "2x3", label: "2:3", w: 2, h: 3 },
    { id: "3x4", label: "3:4", w: 3, h: 4 },
    { id: "4x5", label: "4:5", w: 4, h: 5 },
    { id: "5x7", label: "5:7", w: 5, h: 7 },
    { id: "iso", label: "ISO A-series", w: 1, h: Math.SQRT2 },
    { id: "square", label: "1:1", w: 1, h: 1 },
    { id: "11x14", label: "11:14", w: 11, h: 14 },
  ];

  function isoSize(id, wMm, hMm) {
    return {
      id: id.toLowerCase(),
      label: id,
      ratioId: "iso",
      inches: [wMm / MM_PER_INCH, hMm / MM_PER_INCH],
      display: `${id} (${wMm} × ${hMm} mm)`,
    };
  }

  function inchSize(ratioId, wIn, hIn) {
    return {
      id: `${wIn}x${hIn}in`,
      label: `${wIn}″ × ${hIn}″`,
      ratioId,
      inches: [wIn, hIn],
      display: `${wIn}″ × ${hIn}″`,
    };
  }

  const SIZES = [
    inchSize("2x3", 4, 6),
    inchSize("2x3", 8, 12),
    inchSize("2x3", 12, 18),
    inchSize("2x3", 16, 24),
    inchSize("2x3", 20, 30),
    inchSize("2x3", 24, 36),
    inchSize("3x4", 6, 8),
    inchSize("3x4", 9, 12),
    inchSize("3x4", 12, 16),
    inchSize("3x4", 18, 24),
    inchSize("4x5", 4, 5),
    inchSize("4x5", 8, 10),
    inchSize("4x5", 16, 20),
    inchSize("5x7", 5, 7),
    inchSize("11x14", 11, 14),
    inchSize("square", 8, 8),
    inchSize("square", 10, 10),
    inchSize("square", 12, 12),
    isoSize("A5", 148, 210),
    isoSize("A4", 210, 297),
    isoSize("A3", 297, 420),
    isoSize("A2", 420, 594),
    isoSize("A1", 594, 841),
    isoSize("A0", 841, 1189),
  ];

  function listRatios() {
    return RATIOS.slice();
  }

  function listSizes() {
    return SIZES.slice();
  }

  function sizesForRatio(ratioId) {
    return SIZES.filter((s) => s.ratioId === ratioId);
  }

  function getSize(sizeId) {
    const size = SIZES.find((s) => s.id === sizeId);
    if (!size) throw new Error(`Unknown size id: ${sizeId}`);
    return size;
  }

  function getRatio(ratioId) {
    const ratio = RATIOS.find((r) => r.id === ratioId);
    if (!ratio) throw new Error(`Unknown ratio id: ${ratioId}`);
    return ratio;
  }

  /** Pixel dimensions needed to print a size at a given DPI. */
  function pixelsForSize(sizeOrId, dpi) {
    const size = typeof sizeOrId === "string" ? getSize(sizeOrId) : sizeOrId;
    if (!Number.isFinite(dpi) || dpi <= 0) {
      throw new Error(`dpi must be a positive number, got ${dpi}`);
    }
    return {
      width: Math.round(size.inches[0] * dpi),
      height: Math.round(size.inches[1] * dpi),
    };
  }

  // ---------------------------------------------------------------------------
  // Photo → print-size grading
  // ---------------------------------------------------------------------------

  /**
   * Largest centered rectangle of srcW×srcH matching targetW:targetH.
   * Returns integer x/y/width/height suitable for canvas drawImage cropping.
   */
  function centerCropRect(srcW, srcH, targetW, targetH) {
    if (srcW <= 0 || srcH <= 0 || targetW <= 0 || targetH <= 0) {
      throw new Error("centerCropRect requires positive dimensions");
    }
    const targetAspect = targetW / targetH;
    const srcAspect = srcW / srcH;
    let width = srcW;
    let height = srcH;
    if (srcAspect > targetAspect) {
      width = srcH * targetAspect;
    } else {
      height = srcW / targetAspect;
    }
    return {
      x: Math.round((srcW - width) / 2),
      y: Math.round((srcH - height) / 2),
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  const GRADE_THRESHOLDS = [
    { min: 300, grade: "gallery", note: "True 300 DPI — gallery / retail quality" },
    { min: 240, grade: "excellent", note: "Crisp at arm's length viewing" },
    { min: 180, grade: "good", note: "Great for home walls" },
    { min: 150, grade: "acceptable", note: "Fine viewed from a few feet away" },
    { min: 0, grade: "low", note: "Below 150 DPI — likely to look soft" },
  ];

  /**
   * Grade a photo (by pixel dimensions) for a target print size.
   * Orientation-agnostic: the photo is auto-rotated to best fit the size.
   */
  function gradePhotoForSize(photo, sizeOrId) {
    const size = typeof sizeOrId === "string" ? getSize(sizeOrId) : sizeOrId;
    const { width: pw, height: ph } = photo;
    if (!Number.isFinite(pw) || !Number.isFinite(ph) || pw <= 0 || ph <= 0) {
      throw new Error("photo must have positive width and height");
    }
    const [inW, inH] = size.inches;
    // Try both orientations, keep the better one.
    const upright = centerCropRect(pw, ph, inW, inH);
    const rotated = centerCropRect(pw, ph, inH, inW);
    const dpiUpright = upright.width / inW;
    const dpiRotated = rotated.width / inH;
    const rotate = dpiRotated > dpiUpright;
    const crop = rotate ? rotated : upright;
    const effectiveDpi = Math.floor(rotate ? dpiRotated : dpiUpright);
    const tier = GRADE_THRESHOLDS.find((t) => effectiveDpi >= t.min);
    return {
      sizeId: size.id,
      label: size.display,
      effectiveDpi,
      grade: tier.grade,
      note: tier.note,
      printable: effectiveDpi >= 150,
      rotate,
      crop,
    };
  }

  /** Grade a photo against every size, best (highest DPI) first. */
  function recommendSizes(photo) {
    return SIZES.map((size) => gradePhotoForSize(photo, size)).sort(
      (a, b) => b.effectiveDpi - a.effectiveDpi
    );
  }

  // ---------------------------------------------------------------------------
  // Seeded RNG
  // ---------------------------------------------------------------------------

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function rnd(rng, min, max) {
    return min + rng() * (max - min);
  }

  // ---------------------------------------------------------------------------
  // Genres: palettes, titles, generators
  // ---------------------------------------------------------------------------

  const GENRES = [
    {
      id: "botanical",
      label: "Botanical",
      palettes: [
        { bg: "#f6f1e7", ink: ["#4a5d43", "#7d8f69", "#b0a17a"] },
        { bg: "#eef0e9", ink: ["#39603d", "#8aa17c", "#c9b79c"] },
        { bg: "#f9f5ee", ink: ["#5b6d5b", "#95a786", "#d0c3a5"] },
      ],
      words: [["Wild", "Pressed", "Quiet", "Meadow", "Fern"], ["Stems", "Leaves", "Garden", "Herbarium", "Grasses"]],
    },
    {
      id: "bauhaus",
      label: "Bauhaus",
      palettes: [
        { bg: "#f2e8da", ink: ["#d94f30", "#26547c", "#efb215", "#1d1d1b"] },
        { bg: "#ece5d8", ink: ["#b23a48", "#2e5266", "#e0a458", "#22223b"] },
        { bg: "#f4efe6", ink: ["#c8402f", "#25507a", "#e8b021", "#2b2b28"] },
      ],
      words: [["Form", "Circle", "Weimar", "Modern", "Grid"], ["Study", "No. 4", "Composition", "Balance", "Motion"]],
    },
    {
      id: "japandi",
      label: "Japandi",
      palettes: [
        { bg: "#efe9df", ink: ["#b28769", "#8c7364", "#5f574f"] },
        { bg: "#f3ede2", ink: ["#c19a76", "#96705b", "#6d635a"] },
        { bg: "#ede6d8", ink: ["#a9805e", "#7f6a5c", "#544c44"] },
      ],
      words: [["Calm", "Paper", "Stone", "Wabi", "Amber"], ["Sun", "Arch", "Horizon", "Sabi", "Dusk"]],
    },
    {
      id: "lineart",
      label: "Line Art",
      palettes: [
        { bg: "#faf6ef", ink: ["#1f1d1a"] },
        { bg: "#f5efe4", ink: ["#2a2622"] },
        { bg: "#fbf8f2", ink: ["#26221e"] },
      ],
      words: [["One Line", "Contour", "Figure", "Gesture", "Profile"], ["Study", "Sketch", "No. 7", "Drawing", "Portrait"]],
    },
    {
      id: "boho",
      label: "Boho",
      palettes: [
        { bg: "#f7efe3", ink: ["#c96f4a", "#d9a566", "#8a5a44", "#e3c9a8"] },
        { bg: "#f4ead9", ink: ["#b96a45", "#cf9a5b", "#7d5540", "#dec4a1"] },
        { bg: "#f8f1e5", ink: ["#d17a50", "#e0af70", "#95604a", "#e8d2b0"] },
      ],
      words: [["Desert", "Terra", "Golden", "Sunset", "Canyon"], ["Arches", "Sun", "Rays", "Dunes", "Bloom"]],
    },
    {
      id: "midcentury",
      label: "Mid-Century",
      palettes: [
        { bg: "#f1e6d0", ink: ["#d97b29", "#7a8450", "#5a3e2b", "#c9a227"] },
        { bg: "#efe3cd", ink: ["#c86e2c", "#6f7b48", "#4f3626", "#bd9723"] },
        { bg: "#f3e9d5", ink: ["#e08532", "#828d57", "#63452f", "#d4ad2c"] },
      ],
      words: [["Atomic", "Retro", "Palm", "Modern", "Sunrise"], ["Hills", "Ranges", "Springs", "Horizon", "Valley"]],
    },
    {
      id: "kids",
      label: "Kids & Nursery",
      palettes: [
        { bg: "#fdf6ec", ink: ["#f2b5a0", "#a8c6df", "#f5d491", "#b8d8be"] },
        { bg: "#fbf3ea", ink: ["#eaa98f", "#9cbcd8", "#f0cc82", "#a9d0b0"] },
        { bg: "#fef8f0", ink: ["#f7c2ae", "#b3cfe6", "#f8dca0", "#c4e0ca"] },
      ],
      words: [["Little", "Dreamy", "Starry", "Happy", "Cozy"], ["Clouds", "Stars", "Rainbow", "Sky", "Moon"]],
    },
    {
      id: "typography",
      label: "Typography",
      palettes: [
        { bg: "#f6f1e7", ink: ["#20201e"] },
        { bg: "#1f1d1a", ink: ["#f2ead9"] },
        { bg: "#efe6d6", ink: ["#3a2f26"] },
      ],
      words: [["breathe", "stay wild", "slow down", "be here", "good vibes", "onward", "grow", "begin again"], [""]],
      phrases: true,
    },
  ];

  function listGenres() {
    return GENRES.map((g) => ({ id: g.id, label: g.label }));
  }

  function getGenre(genreId) {
    const genre = GENRES.find((g) => g.id === genreId);
    if (!genre) throw new Error(`Unknown genre id: ${genreId}`);
    return genre;
  }

  function makeTitle(genre, rng) {
    if (genre.phrases) {
      const phrase = pick(rng, genre.words[0]);
      return phrase
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
    return `${pick(rng, genre.words[0])} ${pick(rng, genre.words[1])}`;
  }

  // --- SVG shape helpers ---

  function svgEl(tag, attrs) {
    const parts = Object.keys(attrs)
      .map((k) => `${k}="${attrs[k]}"`)
      .join(" ");
    return `<${tag} ${parts}/>`;
  }

  function drawBotanical(rng, W, H, pal) {
    const parts = [];
    const stems = 2 + Math.floor(rng() * 3);
    for (let s = 0; s < stems; s += 1) {
      const color = pick(rng, pal.ink);
      const x0 = rnd(rng, W * 0.25, W * 0.75);
      const sway = rnd(rng, -W * 0.15, W * 0.15);
      const top = rnd(rng, H * 0.12, H * 0.3);
      parts.push(
        `<path d="M ${x0} ${H * 0.92} Q ${x0 + sway} ${H * 0.55} ${x0 + sway * 1.4} ${top}" stroke="${color}" stroke-width="${rnd(rng, 3, 6).toFixed(1)}" fill="none" stroke-linecap="round"/>`
      );
      const leaves = 4 + Math.floor(rng() * 5);
      for (let i = 0; i < leaves; i += 1) {
        const t = 0.25 + (i / leaves) * 0.6;
        const lx = x0 + sway * t * 1.2;
        const ly = H * 0.92 - (H * 0.92 - top) * t;
        const len = rnd(rng, W * 0.05, W * 0.12);
        const angle = (i % 2 === 0 ? -1 : 1) * rnd(rng, 25, 60);
        parts.push(
          `<ellipse cx="${(lx + len * 0.6).toFixed(1)}" cy="${ly.toFixed(1)}" rx="${len.toFixed(1)}" ry="${(len * 0.32).toFixed(1)}" fill="${color}" opacity="${rnd(rng, 0.65, 0.95).toFixed(2)}" transform="rotate(${angle.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})"/>`
        );
      }
    }
    return parts.join("");
  }

  function drawBauhaus(rng, W, H, pal) {
    const parts = [];
    const cells = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < cells; i += 1) {
      const color = pick(rng, pal.ink);
      const kind = Math.floor(rng() * 4);
      const cx = rnd(rng, W * 0.15, W * 0.85);
      const cy = rnd(rng, H * 0.15, H * 0.85);
      const r = rnd(rng, W * 0.08, W * 0.28);
      if (kind === 0) {
        parts.push(svgEl("circle", { cx: cx.toFixed(1), cy: cy.toFixed(1), r: r.toFixed(1), fill: color, opacity: "0.92" }));
      } else if (kind === 1) {
        parts.push(
          `<path d="M ${(cx - r).toFixed(1)} ${cy.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(cx + r).toFixed(1)} ${cy.toFixed(1)} Z" fill="${color}" opacity="0.92"/>`
        );
      } else if (kind === 2) {
        parts.push(
          svgEl("rect", {
            x: (cx - r * 0.7).toFixed(1),
            y: (cy - r * 0.7).toFixed(1),
            width: (r * 1.4).toFixed(1),
            height: (r * 1.4).toFixed(1),
            fill: color,
            opacity: "0.92",
          })
        );
      } else {
        parts.push(
          `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${(r * 0.22).toFixed(1)}" opacity="0.92"/>`
        );
      }
    }
    return parts.join("");
  }

  function drawJapandi(rng, W, H, pal) {
    const parts = [];
    const main = pick(rng, pal.ink);
    const accent = pick(rng, pal.ink);
    // Arch
    const aw = rnd(rng, W * 0.42, W * 0.6);
    const ax = W / 2;
    const ay = rnd(rng, H * 0.5, H * 0.65);
    parts.push(
      `<path d="M ${(ax - aw / 2).toFixed(1)} ${ay.toFixed(1)} L ${(ax - aw / 2).toFixed(1)} ${(ay - aw * 0.35).toFixed(1)} A ${(aw / 2).toFixed(1)} ${(aw / 2).toFixed(1)} 0 0 1 ${(ax + aw / 2).toFixed(1)} ${(ay - aw * 0.35).toFixed(1)} L ${(ax + aw / 2).toFixed(1)} ${ay.toFixed(1)} Z" fill="${main}" opacity="0.9"/>`
    );
    // Sun
    const sr = rnd(rng, W * 0.08, W * 0.14);
    parts.push(svgEl("circle", { cx: rnd(rng, W * 0.3, W * 0.7).toFixed(1), cy: rnd(rng, H * 0.16, H * 0.26).toFixed(1), r: sr.toFixed(1), fill: accent, opacity: "0.85" }));
    // Ground line
    parts.push(`<line x1="${(W * 0.18).toFixed(1)}" y1="${(H * 0.82).toFixed(1)}" x2="${(W * 0.82).toFixed(1)}" y2="${(H * 0.82).toFixed(1)}" stroke="${main}" stroke-width="3"/>`);
    return parts.join("");
  }

  function drawLineArt(rng, W, H, pal) {
    const ink = pal.ink[0];
    const pts = [];
    const n = 6 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i += 1) {
      pts.push([rnd(rng, W * 0.2, W * 0.8), rnd(rng, H * 0.15, H * 0.85)]);
    }
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < n - 1; i += 1) {
      const [cx, cy] = pts[i];
      const nx = (pts[i][0] + pts[i + 1][0]) / 2;
      const ny = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`;
    }
    return `<path d="${d}" stroke="${ink}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  }

  function drawBoho(rng, W, H, pal) {
    const parts = [];
    const arches = 3 + Math.floor(rng() * 2);
    const cx = W / 2;
    const baseY = H * 0.72;
    for (let i = arches; i >= 1; i -= 1) {
      const r = (W * 0.36 * i) / arches;
      const color = pal.ink[(i - 1) % pal.ink.length];
      parts.push(
        `<path d="M ${(cx - r).toFixed(1)} ${baseY.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(cx + r).toFixed(1)} ${baseY.toFixed(1)} Z" fill="${color}"/>`
      );
    }
    const rays = 5 + Math.floor(rng() * 4);
    for (let i = 0; i < rays; i += 1) {
      const angle = Math.PI * (0.15 + (0.7 * i) / (rays - 1));
      const x1 = cx - Math.cos(angle) * W * 0.42;
      const y1 = baseY + H * 0.08 - Math.sin(angle) * 0;
      parts.push(
        `<circle cx="${x1.toFixed(1)}" cy="${(y1 + rnd(rng, H * 0.04, H * 0.12)).toFixed(1)}" r="${rnd(rng, 3, 7).toFixed(1)}" fill="${pick(rng, pal.ink)}"/>`
      );
    }
    return parts.join("");
  }

  function drawMidcentury(rng, W, H, pal) {
    const parts = [];
    const bands = 3 + Math.floor(rng() * 3);
    const horizon = H * rnd(rng, 0.55, 0.7);
    for (let i = 0; i < bands; i += 1) {
      const color = pal.ink[i % pal.ink.length];
      const y = horizon + ((H - horizon) * i) / bands;
      parts.push(
        `<path d="M 0 ${y.toFixed(1)} Q ${(W / 2).toFixed(1)} ${(y - rnd(rng, 10, 50)).toFixed(1)} ${W} ${y.toFixed(1)} L ${W} ${H} L 0 ${H} Z" fill="${color}" opacity="0.9"/>`
      );
    }
    const sr = rnd(rng, W * 0.1, W * 0.18);
    parts.push(svgEl("circle", { cx: rnd(rng, W * 0.25, W * 0.75).toFixed(1), cy: rnd(rng, H * 0.18, H * 0.35).toFixed(1), r: sr.toFixed(1), fill: pick(rng, pal.ink), opacity: "0.95" }));
    return parts.join("");
  }

  function drawKids(rng, W, H, pal) {
    const parts = [];
    const stars = 6 + Math.floor(rng() * 6);
    for (let i = 0; i < stars; i += 1) {
      const x = rnd(rng, W * 0.1, W * 0.9);
      const y = rnd(rng, H * 0.1, H * 0.55);
      const r = rnd(rng, 6, 14);
      const color = pick(rng, pal.ink);
      parts.push(
        `<path d="M ${x.toFixed(1)} ${(y - r).toFixed(1)} L ${(x + r * 0.35).toFixed(1)} ${(y - r * 0.35).toFixed(1)} L ${(x + r).toFixed(1)} ${y.toFixed(1)} L ${(x + r * 0.35).toFixed(1)} ${(y + r * 0.35).toFixed(1)} L ${x.toFixed(1)} ${(y + r).toFixed(1)} L ${(x - r * 0.35).toFixed(1)} ${(y + r * 0.35).toFixed(1)} L ${(x - r).toFixed(1)} ${y.toFixed(1)} L ${(x - r * 0.35).toFixed(1)} ${(y - r * 0.35).toFixed(1)} Z" fill="${color}"/>`
      );
    }
    // Cloud
    const cx = rnd(rng, W * 0.3, W * 0.7);
    const cy = rnd(rng, H * 0.65, H * 0.8);
    const cr = rnd(rng, W * 0.08, W * 0.12);
    const cloudColor = pick(rng, pal.ink);
    parts.push(svgEl("circle", { cx: (cx - cr).toFixed(1), cy: cy.toFixed(1), r: cr.toFixed(1), fill: cloudColor }));
    parts.push(svgEl("circle", { cx: cx.toFixed(1), cy: (cy - cr * 0.5).toFixed(1), r: (cr * 1.2).toFixed(1), fill: cloudColor }));
    parts.push(svgEl("circle", { cx: (cx + cr).toFixed(1), cy: cy.toFixed(1), r: cr.toFixed(1), fill: cloudColor }));
    return parts.join("");
  }

  function drawTypography(rng, W, H, pal, title) {
    const ink = pal.ink[0];
    const words = title.toLowerCase().split(" ");
    const fontSize = Math.min(W / Math.max(...words.map((w) => w.length)) / 0.62, H / (words.length * 1.6));
    const lineHeight = fontSize * 1.25;
    const startY = H / 2 - ((words.length - 1) * lineHeight) / 2;
    return words
      .map(
        (word, i) =>
          `<text x="${W / 2}" y="${(startY + i * lineHeight).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize.toFixed(1)}" letter-spacing="2" fill="${ink}">${word}</text>`
      )
      .join("");
  }

  const DRAWERS = {
    botanical: drawBotanical,
    bauhaus: drawBauhaus,
    japandi: drawJapandi,
    lineart: drawLineArt,
    boho: drawBoho,
    midcentury: drawMidcentury,
    kids: drawKids,
  };

  /**
   * Generate one vector print. Same inputs always produce the same SVG.
   * The SVG uses a viewBox only, so it scales losslessly to any print size.
   */
  function generatePrint({ genreId, seed, ratioId }) {
    const genre = getGenre(genreId);
    const ratio = getRatio(ratioId || "4x5");
    const rng = mulberry32(seed >>> 0);
    const pal = pick(rng, genre.palettes);
    const W = 600;
    const H = Math.round((W * ratio.h) / ratio.w);
    const title = makeTitle(genre, rng);
    const body = genre.phrases
      ? drawTypography(rng, W, H, pal, title)
      : DRAWERS[genre.id](rng, W, H, pal);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">` +
      `<rect width="${W}" height="${H}" fill="${pal.bg}"/>` +
      body +
      `</svg>`;
    return {
      id: `${genreId}-${seed}-${ratio.id}`,
      title,
      genreId,
      genreLabel: genre.label,
      ratioId: ratio.id,
      ratioLabel: ratio.label,
      palette: pal,
      svg,
    };
  }

  const CATALOG_RATIOS = ["4x5", "2x3", "3x4", "iso", "square"];

  /** Deterministic catalog: `perGenre` prints for every genre. */
  function buildCatalog({ perGenre = 12 } = {}) {
    const prints = [];
    GENRES.forEach((genre) => {
      for (let i = 0; i < perGenre; i += 1) {
        const seed = hashString(`${genre.id}::${i}`);
        const ratioId = CATALOG_RATIOS[seed % CATALOG_RATIOS.length];
        prints.push(generatePrint({ genreId: genre.id, seed, ratioId }));
      }
    });
    return prints;
  }

  return {
    MM_PER_INCH,
    listRatios,
    listSizes,
    sizesForRatio,
    getSize,
    getRatio,
    pixelsForSize,
    centerCropRect,
    gradePhotoForSize,
    recommendSizes,
    hashString,
    mulberry32,
    listGenres,
    getGenre,
    generatePrint,
    buildCatalog,
  };
});
