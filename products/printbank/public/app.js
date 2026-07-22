(function () {
  'use strict';
  const E = window.PrintEngine;
  const catalog = E.buildCatalog(144);
  const grid = document.getElementById('grid');
  const search = document.getElementById('search');
  const genreSel = document.getElementById('genre');
  const count = document.getElementById('count');

  E.GENRES.forEach((g) => {
    const o = document.createElement('option');
    o.value = g;
    o.textContent = g.replace(/-/g, ' ');
    genreSel.appendChild(o);
  });

  function svgDataUrl(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function render() {
    const q = (search.value || '').trim().toLowerCase();
    const g = genreSel.value;
    grid.innerHTML = '';
    let n = 0;
    catalog.forEach((p) => {
      if (g && p.genre !== g) return;
      if (q && !(p.title.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q)))) return;
      n++;
      const card = document.createElement('button');
      card.className = 'card';
      card.setAttribute('data-id', p.id);
      const svg = E.generateSvg(p.id, { width: 400, height: 500, genre: p.genre });
      card.innerHTML = `<img alt="${p.title}" src="${svgDataUrl(svg)}"/><span class="title">${p.title}</span><span class="genre">${p.genre.replace(/-/g, ' ')}</span>`;
      card.addEventListener('click', () => openModal(p));
      grid.appendChild(card);
    });
    count.textContent = `${n} of ${catalog.length} prints`;
  }

  search.addEventListener('input', render);
  genreSel.addEventListener('change', render);

  // ---- Modal ----
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  document.getElementById('modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  function openModal(p) {
    const svg = E.generateSvg(p.id, { width: 800, height: 1000, genre: p.genre });
    modalBody.innerHTML = `
      <h3>${p.title}</h3>
      <p class="meta">${p.genre.replace(/-/g, ' ')} · ${p.tags.join(', ')}</p>
      <img class="preview" alt="${p.title}" src="${svgDataUrl(svg)}"/>
      <div class="actions">
        <button id="dlSvg" class="primary">Download SVG (any size, lossless)</button>
        <label>PNG size:
          <select id="pngSize"></select>
        </label>
        <label>DPI:
          <select id="pngDpi"><option value="300">300 DPI (gallery)</option><option value="150">150 DPI (draft)</option></select>
        </label>
        <button id="dlPng">Download PNG</button>
      </div>
    `;
    const sel = modalBody.querySelector('#pngSize');
    E.getSizes().forEach((s) => {
      const o = document.createElement('option');
      o.value = s.name;
      o.textContent = `${s.name} (${s.w}×${s.h} in)`;
      sel.appendChild(o);
    });
    modalBody.querySelector('#dlSvg').addEventListener('click', () => downloadSvg(p, svg));
    modalBody.querySelector('#dlPng').addEventListener('click', () => {
      const size = E.getSize(sel.value);
      const dpi = parseInt(modalBody.querySelector('#pngDpi').value, 10);
      downloadPng(p, size, dpi);
    });
    modal.classList.remove('hidden');
  }

  function closeModal() { modal.classList.add('hidden'); modalBody.innerHTML = ''; }

  function downloadSvg(p, svg) {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    triggerDownload(URL.createObjectURL(blob), `${p.id}.svg`);
  }

  function downloadPng(p, size, dpi) {
    const { w, h } = E.pixelsForSize(size, dpi);
    const svg = E.generateSvg(p.id, { width: w, height: h, genre: p.genre });
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      c.toBlob((blob) => triggerDownload(URL.createObjectURL(blob), `${p.id}-${size.name}-${dpi}dpi.png`), 'image/png');
    };
    img.src = svgDataUrl(svg);
  }

  function triggerDownload(url, name) {
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ---- Photo workbench ----
  const drop = document.getElementById('drop');
  const fileInput = document.getElementById('file');
  const info = document.getElementById('photoInfo');
  const preview = document.getElementById('preview');
  const photoDims = document.getElementById('photoDims');
  const photoMeta = document.getElementById('photoMeta');
  const gradeBody = document.querySelector('#gradeTable tbody');
  const exportBtn = document.getElementById('exportBtn');
  const exportSize = document.getElementById('exportSize');

  E.getSizes().forEach((s) => {
    const o = document.createElement('option');
    o.value = s.name;
    o.textContent = `${s.name} (${s.w}×${s.h} in)`;
    exportSize.appendChild(o);
  });

  let currentPhoto = null; // { image, w, h }

  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault(); drop.classList.remove('over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

  function handleFile(f) {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      currentPhoto = { image: img, w: img.naturalWidth, h: img.naturalHeight };
      info.classList.remove('hidden');
      photoDims.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
      photoMeta.textContent = `${(f.size / 1024 / 1024).toFixed(2)} MB · ${f.type || 'image'}`;
      drawPreview();
      renderGrades();
    };
    img.src = url;
  }

  function drawPreview() {
    const ctx = preview.getContext('2d');
    ctx.clearRect(0, 0, preview.width, preview.height);
    const { image, w, h } = currentPhoto;
    const scale = Math.min(preview.width / w, preview.height / h);
    const dw = w * scale; const dh = h * scale;
    ctx.drawImage(image, (preview.width - dw) / 2, (preview.height - dh) / 2, dw, dh);
  }

  function renderGrades() {
    gradeBody.innerHTML = '';
    E.gradeAllSizes(currentPhoto.w, currentPhoto.h).forEach(({ size, result }) => {
      const tr = document.createElement('tr');
      tr.className = `grade-${result.grade}`;
      tr.innerHTML = `<td>${size.name}${result.rotated ? ' <small>(rotated)</small>' : ''}</td><td>${result.effectiveDpi}</td><td>${result.label}</td>`;
      gradeBody.appendChild(tr);
    });
  }

  exportBtn.addEventListener('click', () => {
    if (!currentPhoto) return;
    const size = E.getSize(exportSize.value);
    const graded = E.gradePhoto(currentPhoto.w, currentPhoto.h, size);
    if (!graded.ok) {
      alert(`Cannot export ${size.name}: effective DPI is ${graded.effectiveDpi} (below 150). Choose a smaller size.`);
      return;
    }
    exportPhoto(size, graded);
  });

  function exportPhoto(size, graded) {
    const dpi = 300;
    const { w, h } = E.pixelsForSize({ w: graded.printW, h: graded.printH }, dpi);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(currentPhoto.image, graded.x, graded.y, graded.w, graded.h, 0, 0, w, h);
    c.toBlob((blob) => triggerDownload(URL.createObjectURL(blob), `photo-${size.name}-${dpi}dpi.png`), 'image/png');
  }

  // ---- Size guide ----
  const guide = document.querySelector('#sizeGuide tbody');
  E.getSizes().forEach((s) => {
    const p300 = E.pixelsForSize(s, 300);
    const p150 = E.pixelsForSize(s, 150);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.name}</td><td>${s.w} × ${s.h}</td><td>${p300.w} × ${p300.h}</td><td>${p150.w} × ${p150.h}</td>`;
    guide.appendChild(tr);
  });

  render();
})();
