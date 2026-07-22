/* global PrintEngine */
(function () {
  'use strict';
  const E = PrintEngine;
  const CATALOG = E.generateCatalog(144);

  const grid = document.getElementById('grid');
  const search = document.getElementById('search');
  const genreSel = document.getElementById('genre');
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modal-content');
  const modalClose = document.getElementById('modal-close');

  E.GENRES.forEach(g => {
    const o = document.createElement('option');
    o.value = g; o.textContent = g.charAt(0).toUpperCase() + g.slice(1);
    genreSel.appendChild(o);
  });

  function renderGrid() {
    const q = search.value.trim().toLowerCase();
    const g = genreSel.value;
    grid.innerHTML = '';
    CATALOG.forEach(p => {
      if (g && p.genre !== g) return;
      if (q && !p.title.toLowerCase().includes(q) && !p.genre.includes(q)) return;
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = p.svg + `<div class="meta"><strong>${p.title}</strong><span>${p.genre}</span></div>`;
      card.addEventListener('click', () => openModal(p));
      grid.appendChild(card);
    });
  }
  search.addEventListener('input', renderGrid);
  genreSel.addEventListener('change', renderGrid);

  function openModal(p) {
    modalContent.innerHTML = p.svg +
      `<h2>${p.title}</h2><p>Genre: ${p.genre} · True-vector SVG · prints losslessly at any size</p>` +
      `<div class="actions">` +
      `<button data-act="svg">Download SVG</button>` +
      `<button data-act="png300" class="secondary">Export PNG @ 300 DPI (8×10)</button>` +
      `<button data-act="png150" class="secondary">Export PNG @ 150 DPI (8×10)</button>` +
      `</div>`;
    modal.classList.remove('hidden');
    modalContent.querySelectorAll('button[data-act]').forEach(b => {
      b.addEventListener('click', () => downloadPrint(p, b.dataset.act));
    });
  }
  modalClose.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadPrint(p, act) {
    if (act === 'svg') {
      downloadBlob(new Blob([p.svg], { type: 'image/svg+xml' }), `printbank-${p.id}.svg`);
      return;
    }
    const dpi = act === 'png300' ? 300 : 150;
    const size = E.SIZES.find(s => s.name === '8x10');
    const px = E.pixelsForSize(size, dpi);
    rasterize(p.svg, px.w, px.h).then(blob => {
      downloadBlob(blob, `printbank-${p.id}-8x10-${dpi}dpi.png`);
    });
  }

  function rasterize(svg, w, h) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        cv.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  // Tabs
  document.querySelectorAll('nav button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('nav button').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      document.getElementById(b.dataset.tab).classList.add('active');
    });
  });

  // Photo workbench
  const drop = document.getElementById('drop');
  const fileInput = document.getElementById('file');
  const report = document.getElementById('photo-report');
  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('hover'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('hover'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('hover');
    if (e.dataTransfer.files[0]) handlePhoto(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handlePhoto(fileInput.files[0]);
  });

  let currentPhoto = null;
  function handlePhoto(file) {
    const img = new Image();
    img.onload = () => {
      currentPhoto = img;
      renderPhotoReport(img);
    };
    img.src = URL.createObjectURL(file);
  }
  function renderPhotoReport(img) {
    const rows = E.SIZES.map(s => {
      const g = E.gradePhotoForSize(img.naturalWidth, img.naturalHeight, s);
      return `<tr><td>${s.name}</td><td>${s.w.toFixed(2)}×${s.h.toFixed(2)}″</td>` +
        `<td class="grade-${g.grade}">${g.grade}</td><td>${g.dpi} DPI</td>` +
        `<td>${g.crop && g.crop.rotated ? 'rotated' : ''}</td>` +
        `<td><button data-size="${s.name}" ${g.grade === 'low' ? 'disabled' : ''}>Export</button></td></tr>`;
    }).join('');
    report.innerHTML =
      `<p>Photo: ${img.naturalWidth}×${img.naturalHeight}px</p>` +
      `<table><thead><tr><th>Size</th><th>Inches</th><th>Grade</th><th>Effective DPI</th><th>Note</th><th></th></tr></thead>` +
      `<tbody>${rows}</tbody></table>`;
    report.querySelectorAll('button[data-size]').forEach(b => {
      b.addEventListener('click', () => exportPhoto(b.dataset.size));
    });
  }
  function exportPhoto(sizeName) {
    if (!currentPhoto) return;
    const size = E.SIZES.find(s => s.name === sizeName);
    const g = E.gradePhotoForSize(currentPhoto.naturalWidth, currentPhoto.naturalHeight, size);
    if (g.grade === 'low') { alert('Below 150 DPI — export blocked.'); return; }
    const dpi = g.dpi >= 300 ? 300 : 150;
    const px = E.pixelsForSize(size, dpi);
    const cv = document.createElement('canvas');
    // If rotated, target orientation swapped
    const outW = g.crop.rotated ? px.h : px.w;
    const outH = g.crop.rotated ? px.w : px.h;
    cv.width = outW; cv.height = outH;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(currentPhoto, g.crop.x, g.crop.y, g.crop.w, g.crop.h, 0, 0, outW, outH);
    cv.toBlob(b => downloadBlob(b, `photo-${sizeName}-${dpi}dpi.png`), 'image/png');
  }

  // Size guide
  const sizeTable = document.getElementById('size-table');
  sizeTable.innerHTML = `<thead><tr><th>Name</th><th>Inches</th><th>Ratio</th><th>@300 DPI (px)</th><th>@150 DPI (px)</th></tr></thead><tbody>` +
    E.SIZES.map(s => {
      const p300 = E.pixelsForSize(s, 300), p150 = E.pixelsForSize(s, 150);
      return `<tr><td>${s.name}</td><td>${s.w.toFixed(2)}×${s.h.toFixed(2)}</td><td>${s.ratio}</td><td>${p300.w}×${p300.h}</td><td>${p150.w}×${p150.h}</td></tr>`;
    }).join('') + `</tbody>`;

  renderGrid();
})();
