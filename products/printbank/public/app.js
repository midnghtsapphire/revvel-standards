(function () {
  'use strict';
  const PE = window.PrintEngine;
  const CATALOG_SIZE = 144;
  const catalog = PE.buildCatalog(CATALOG_SIZE);

  const grid = document.getElementById('grid');
  const qInput = document.getElementById('q');
  const genreSel = document.getElementById('genre');
  const countEl = document.getElementById('count');

  PE.GENRES.forEach(g => {
    const o = document.createElement('option');
    o.value = g; o.textContent = g;
    genreSel.appendChild(o);
  });

  function render() {
    const q = qInput.value.trim().toLowerCase();
    const g = genreSel.value;
    const filtered = catalog.filter(item => {
      if (g && item.genre !== g) return false;
      if (q && !(item.title.toLowerCase().includes(q) || item.genre.includes(q))) return false;
      return true;
    });
    countEl.textContent = filtered.length + ' prints';
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    filtered.forEach(item => {
      const card = document.createElement('button');
      card.className = 'card';
      card.dataset.id = item.id;
      const meta = PE.generateSVG(item.id);
      card.innerHTML = `<div class="art">${meta.svg}</div><div class="meta"><span>${item.title}</span><span class="g">${item.genre}</span></div>`;
      card.addEventListener('click', () => openModal(item.id));
      frag.appendChild(card);
    });
    grid.appendChild(frag);
  }

  qInput.addEventListener('input', render);
  genreSel.addEventListener('change', render);

  // Size guide
  const sgBody = document.querySelector('#sizeGuide tbody');
  PE.SIZES.forEach(s => {
    const px = PE.pixelsForSize(s.name, 300);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.name}</td><td>${s.w}×${s.h}″</td><td>${s.ratio}</td><td>${px.w}×${px.h}</td>`;
    sgBody.appendChild(tr);
  });

  // PNG size dropdown
  const pngSize = document.getElementById('pngSize');
  PE.SIZES.forEach(s => {
    const o = document.createElement('option');
    o.value = s.name; o.textContent = `${s.name} (${s.w}×${s.h}″)`;
    pngSize.appendChild(o);
  });

  const modal = document.getElementById('modal');
  const modalArt = document.getElementById('modalArt');
  const modalTitle = document.getElementById('modalTitle');
  const modalGenre = document.getElementById('modalGenre');
  let currentId = null;

  function openModal(id) {
    currentId = id;
    const item = catalog.find(x => x.id === id);
    const meta = PE.generateSVG(id);
    modalArt.innerHTML = meta.svg;
    modalTitle.textContent = item.title;
    modalGenre.textContent = 'Genre: ' + item.genre;
    modal.hidden = false;
  }
  document.getElementById('modalClose').addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });

  document.getElementById('dlSvg').addEventListener('click', () => {
    const meta = PE.generateSVG(currentId);
    const blob = new Blob([meta.svg], { type: 'image/svg+xml' });
    downloadBlob(blob, `printbank-${currentId}.svg`);
  });

  document.getElementById('dlPng').addEventListener('click', async () => {
    const size = pngSize.value;
    const dpi = parseInt(document.getElementById('pngDpi').value, 10);
    const px = PE.pixelsForSize(size, dpi);
    const meta = PE.generateSVG(currentId);
    const canvas = document.createElement('canvas');
    canvas.width = px.w; canvas.height = px.h;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([meta.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, px.w, px.h);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => downloadBlob(b, `printbank-${currentId}-${size}-${dpi}dpi.png`), 'image/png');
    };
    img.src = url;
  });

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Photo workbench
  const drop = document.getElementById('drop');
  const fileInput = document.getElementById('file');
  const photoResults = document.getElementById('photoResults');
  const preview = document.getElementById('preview');
  const gradeBody = document.querySelector('#gradeTable tbody');
  let currentPhoto = null;

  ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('over')));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

  function handleFile(file) {
    const img = new Image();
    img.onload = () => {
      currentPhoto = { img, w: img.naturalWidth, h: img.naturalHeight };
      const c = preview;
      const maxW = 400;
      const scale = Math.min(1, maxW / img.naturalWidth);
      c.width = img.naturalWidth * scale;
      c.height = img.naturalHeight * scale;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      renderGrades();
      photoResults.hidden = false;
    };
    img.src = URL.createObjectURL(file);
  }

  function renderGrades() {
    gradeBody.innerHTML = '';
    PE.SIZES.forEach(s => {
      const g = PE.gradePhotoForSize(currentPhoto.w, currentPhoto.h, s.name);
      const tr = document.createElement('tr');
      tr.className = 'grade-' + g.grade;
      const btn = g.printReady
        ? `<button data-size="${s.name}">Export</button>`
        : `<span class="low">below 150 DPI</span>`;
      tr.innerHTML = `<td>${s.name}</td><td>${s.ratio}</td><td>${g.effectiveDpi}</td><td>${g.grade}${g.rotated ? ' (rotated)' : ''}</td><td>${btn}</td>`;
      gradeBody.appendChild(tr);
    });
    gradeBody.querySelectorAll('button[data-size]').forEach(b => {
      b.addEventListener('click', () => exportPhoto(b.dataset.size));
    });
  }

  function exportPhoto(sizeName) {
    const g = PE.gradePhotoForSize(currentPhoto.w, currentPhoto.h, sizeName);
    if (!g.printReady) return;
    const size = PE.SIZES.find(x => x.name === sizeName);
    let tw = size.w, th = size.h;
    if (g.rotated) { tw = size.h; th = size.w; }
    const dpi = g.effectiveDpi >= 300 ? 300 : (g.effectiveDpi >= 240 ? 240 : (g.effectiveDpi >= 180 ? 180 : 150));
    const px = { w: Math.round(tw * dpi), h: Math.round(th * dpi) };
    const canvas = document.createElement('canvas');
    canvas.width = px.w; canvas.height = px.h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(currentPhoto.img, g.crop.x, g.crop.y, g.crop.w, g.crop.h, 0, 0, px.w, px.h);
    canvas.toBlob(b => downloadBlob(b, `photo-${sizeName}-${dpi}dpi.png`), 'image/png');
  }

  render();
})();
