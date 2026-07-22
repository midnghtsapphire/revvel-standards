(function () {
  'use strict';
  const PE = window.PrintEngine;
  const catalog = PE.buildCatalog(144);

  // Populate genre filter
  const gf = document.getElementById('genre-filter');
  PE.GENRES.forEach(g => {
    const o = document.createElement('option');
    o.value = g; o.textContent = g;
    gf.appendChild(o);
  });

  const grid = document.getElementById('grid');
  const search = document.getElementById('search');

  function renderGrid() {
    const q = search.value.trim().toLowerCase();
    const g = gf.value;
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    catalog.forEach(item => {
      if (g && item.genre !== g) return;
      if (q && !(item.title.toLowerCase().includes(q) || item.genre.includes(q) || item.id.includes(q))) return;
      const card = document.createElement('button');
      card.className = 'card';
      card.type = 'button';
      card.setAttribute('data-id', item.id);
      const svg = PE.generateSVG(item.genre, item.seed, 400, 600);
      card.innerHTML = `<div class="thumb">${svg}</div><div class="cap"><strong>${item.title}</strong><span>${item.genre}</span></div>`;
      card.addEventListener('click', () => openModal(item));
      frag.appendChild(card);
    });
    grid.appendChild(frag);
  }

  search.addEventListener('input', renderGrid);
  gf.addEventListener('change', renderGrid);

  // Modal
  const modal = document.getElementById('modal');
  const modalPreview = document.getElementById('modal-preview');
  const modalTitle = document.getElementById('modal-title');
  const modalGenre = document.getElementById('modal-genre');
  const pngSize = document.getElementById('png-size');
  const pngDpi = document.getElementById('png-dpi');
  document.getElementById('modal-close').addEventListener('click', () => modal.hidden = true);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });

  PE.SIZES.forEach(s => {
    const o = document.createElement('option');
    o.value = s.name; o.textContent = `${s.name} (${s.ratio})`;
    pngSize.appendChild(o);
  });

  let currentItem = null;
  function openModal(item) {
    currentItem = item;
    modalTitle.textContent = item.title;
    modalGenre.textContent = `${item.genre} · ${item.id}`;
    modalPreview.innerHTML = PE.generateSVG(item.genre, item.seed, 800, 1200);
    modal.hidden = false;
  }

  document.getElementById('dl-svg').addEventListener('click', () => {
    if (!currentItem) return;
    const svg = PE.generateSVG(currentItem.genre, currentItem.seed, 1000, 1500);
    downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${currentItem.id}.svg`);
  });

  document.getElementById('dl-png').addEventListener('click', () => {
    if (!currentItem) return;
    const size = PE.SIZES.find(s => s.name === pngSize.value);
    const dpi = parseInt(pngDpi.value, 10);
    const px = PE.pixelsForSize(size, dpi);
    const svg = PE.generateSVG(currentItem.genre, currentItem.seed, px.w, px.h);
    svgToPng(svg, px.w, px.h).then(blob => {
      downloadBlob(blob, `${currentItem.id}_${size.name}_${dpi}dpi.png`);
    });
  });

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function svgToPng(svg, w, h) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        c.toBlob(b => { URL.revokeObjectURL(url); resolve(b); }, 'image/png');
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  // ----- Photo workbench -----
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file');
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('over'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('over'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault(); dropzone.classList.remove('over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  let currentImg = null;
  function handleFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      currentImg = img;
      document.getElementById('photo-result').hidden = false;
      document.getElementById('src-meta').textContent = `Source: ${img.naturalWidth}×${img.naturalHeight}px`;
      drawPreview(img);
      renderGrades(img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function drawPreview(img) {
    const c = document.getElementById('preview');
    const maxW = 400;
    const scale = Math.min(1, maxW / img.naturalWidth);
    c.width = img.naturalWidth * scale;
    c.height = img.naturalHeight * scale;
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  }

  function renderGrades(w, h) {
    const tbody = document.getElementById('grade-body');
    tbody.innerHTML = '';
    PE.SIZES.forEach(s => {
      const g = PE.gradePhotoForSize(w, h, s);
      const tr = document.createElement('tr');
      tr.className = `grade-${g.grade}`;
      tr.innerHTML = `<td>${s.name}${g.rotated ? ' ↻' : ''}</td><td>${s.ratio}</td><td>${g.dpi}</td><td><span class="pill ${g.grade}">${g.grade}</span></td><td>${g.printable ? `<button class="btn small" data-size="${s.name}">Export</button>` : '—'}</td>`;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('button[data-size]').forEach(btn => {
      btn.addEventListener('click', () => exportPhoto(btn.getAttribute('data-size')));
    });
  }

  function exportPhoto(sizeName) {
    if (!currentImg) return;
    const size = PE.SIZES.find(s => s.name === sizeName);
    const g = PE.gradePhotoForSize(currentImg.naturalWidth, currentImg.naturalHeight, size);
    if (!g.printable) { alert('Below 150 DPI — not exporting'); return; }
    const dpi = 300;
    const px = PE.pixelsForSize({ w: g.tw || size.w, h: g.th || size.h }, dpi);
    const outW = g.rotated ? Math.round(size.h * dpi) : Math.round(size.w * dpi);
    const outH = g.rotated ? Math.round(size.w * dpi) : Math.round(size.h * dpi);
    const c = document.createElement('canvas');
    c.width = outW; c.height = outH;
    const ctx = c.getContext('2d');
    const crop = g.crop;
    ctx.drawImage(currentImg, crop.x, crop.y, crop.w, crop.h, 0, 0, outW, outH);
    c.toBlob(b => downloadBlob(b, `photo_${size.name}${g.rotated ? '_rot' : ''}_${dpi}dpi.png`), 'image/png');
  }

  // ----- Size guide -----
  const sizeBody = document.getElementById('size-body');
  PE.SIZES.forEach(s => {
    const p300 = PE.pixelsForSize(s, 300);
    const p150 = PE.pixelsForSize(s, 150);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.name}</td><td>${s.ratio}</td><td>${p300.w}×${p300.h}</td><td>${p150.w}×${p150.h}</td>`;
    sizeBody.appendChild(tr);
  });

  renderGrid();
})();
