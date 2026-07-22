(function () {
  'use strict';
  const E = window.PrintEngine;
  const catalog = E.buildCatalog(144);

  // Populate genre filter
  const genreFilter = document.getElementById('genre-filter');
  E.GENRES.forEach(g => {
    const o = document.createElement('option');
    o.value = g;
    o.textContent = g;
    genreFilter.appendChild(o);
  });

  // Tabs
  document.querySelectorAll('nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // Grid
  const grid = document.getElementById('grid');
  function renderGrid() {
    const q = document.getElementById('search').value.trim().toLowerCase();
    const g = genreFilter.value;
    grid.innerHTML = '';
    catalog.filter(it => (!g || it.genre === g) && (!q || it.title.toLowerCase().includes(q) || it.genre.includes(q))).forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = E.generateSVG(item.genre, item.seed) +
        `<div class="meta"><div class="title">${item.title}</div><div class="genre">${item.genre}</div></div>`;
      card.addEventListener('click', () => openModal(item));
      grid.appendChild(card);
    });
  }
  document.getElementById('search').addEventListener('input', renderGrid);
  genreFilter.addEventListener('change', renderGrid);
  renderGrid();

  // Modal
  const modal = document.getElementById('modal');
  const modalPreview = document.getElementById('modal-preview');
  const modalInfo = document.getElementById('modal-info');
  const exportSize = document.getElementById('export-size');
  E.SIZES.forEach(s => {
    const o = document.createElement('option');
    o.value = s.name;
    o.textContent = `${s.name} (${s.ratio})`;
    exportSize.appendChild(o);
  });
  exportSize.value = '8×10';
  let currentItem = null;

  function openModal(item) {
    currentItem = item;
    modalPreview.innerHTML = E.generateSVG(item.genre, item.seed);
    modalInfo.innerHTML = `<h2>${item.title}</h2><p>Genre: <strong>${item.genre}</strong> · Seed: <code>${item.seed}</code></p><p>Vector SVG — prints losslessly at any size.</p>`;
    modal.hidden = false;
  }
  document.getElementById('close-modal').addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });

  function download(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  document.getElementById('dl-svg').addEventListener('click', () => {
    if (!currentItem) return;
    const svg = E.generateSVG(currentItem.genre, currentItem.seed);
    download(`${currentItem.id}.svg`, new Blob([svg], { type: 'image/svg+xml' }));
  });

  function svgToPngBlob(svgString, w, h) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('svg load fail')); };
      img.src = url;
    });
  }

  async function exportPng(dpi) {
    if (!currentItem) return;
    const size = E.SIZES.find(s => s.name === exportSize.value);
    const px = E.pixelsForSize(size, dpi);
    const svg = E.generateSVG(currentItem.genre, currentItem.seed, { viewW: px.w, viewH: px.h });
    try {
      const blob = await svgToPngBlob(svg, px.w, px.h);
      download(`${currentItem.id}-${size.name}-${dpi}dpi.png`, blob);
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  }
  document.getElementById('dl-300').addEventListener('click', () => exportPng(300));
  document.getElementById('dl-150').addEventListener('click', () => exportPng(150));

  // Size guide
  const sizeGuideBody = document.querySelector('#size-guide tbody');
  E.SIZES.forEach(s => {
    const p300 = E.pixelsForSize(s, 300);
    const p150 = E.pixelsForSize(s, 150);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.name}</td><td>${s.ratio}</td><td>${p300.w} × ${p300.h}</td><td>${p150.w} × ${p150.h}</td>`;
    sizeGuideBody.appendChild(tr);
  });

  // Photo workbench
  const drop = document.getElementById('drop');
  const fileInput = document.getElementById('file');
  const photoResult = document.getElementById('photo-result');
  const gradeBody = document.querySelector('#grade-table tbody');
  let currentImage = null;

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        currentImage = img;
        photoResult.hidden = false;
        document.querySelector('.photo-meta').textContent = `${file.name} — ${img.width} × ${img.height} px`;
        renderGrades();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderGrades() {
    gradeBody.innerHTML = '';
    E.SIZES.forEach(size => {
      const g = E.gradePhoto(currentImage.width, currentImage.height, size);
      const tr = document.createElement('tr');
      const disabled = g.grade === 'low' ? 'disabled' : '';
      tr.innerHTML = `<td>${size.name}${g.rotated ? ' ↻' : ''}</td><td>${size.ratio}</td><td>${g.dpi}</td><td><span class="grade grade-${g.grade}">${g.grade}</span></td><td><button class="export" ${disabled} data-size="${size.name}" data-rot="${g.rotated}">Export 300 DPI</button></td>`;
      gradeBody.appendChild(tr);
    });
    gradeBody.querySelectorAll('button.export').forEach(btn => {
      btn.addEventListener('click', () => exportPhoto(btn.dataset.size, btn.dataset.rot === 'true'));
    });
  }

  function exportPhoto(sizeName, rotated) {
    const size = E.SIZES.find(s => s.name === sizeName);
    let srcW = currentImage.width, srcH = currentImage.height;
    const canvas = document.createElement('canvas');
    const px = E.pixelsForSize(size, 300);
    canvas.width = px.w; canvas.height = px.h;
    const ctx = canvas.getContext('2d');
    // Draw with optional rotation
    if (rotated) {
      // Rotate the *photo* 90° so its short side maps to the size's short side.
      // Effectively swap the src dims for crop math.
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = srcH; tmpCanvas.height = srcW;
      const tctx = tmpCanvas.getContext('2d');
      tctx.translate(srcH / 2, srcW / 2);
      tctx.rotate(Math.PI / 2);
      tctx.drawImage(currentImage, -srcW / 2, -srcH / 2);
      const crop = E.cropRect(tmpCanvas.width, tmpCanvas.height, size);
      ctx.drawImage(tmpCanvas, crop.x, crop.y, crop.w, crop.h, 0, 0, px.w, px.h);
    } else {
      const crop = E.cropRect(srcW, srcH, size);
      ctx.drawImage(currentImage, crop.x, crop.y, crop.w, crop.h, 0, 0, px.w, px.h);
    }
    canvas.toBlob(b => {
      if (!b) { alert('Export failed'); return; }
      download(`photo-${size.name}-300dpi.png`, b);
    }, 'image/png');
  }

  fileInput.addEventListener('change', e => handleFile(e.target.files[0]));
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('drag');
    handleFile(e.dataTransfer.files[0]);
  });
})();
