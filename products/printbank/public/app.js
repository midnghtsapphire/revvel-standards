(function(){
  'use strict';
  const PE = window.PrintEngine;
  const catalog = PE.buildCatalog(18);

  // Tabs
  document.querySelectorAll('nav button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('nav button').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      document.getElementById('tab-' + b.dataset.tab).classList.add('active');
    });
  });

  // Genre filter
  const gf = document.getElementById('genre-filter');
  PE.GENRES.forEach(g => {
    const o = document.createElement('option');
    o.value = g; o.textContent = g.charAt(0).toUpperCase() + g.slice(1);
    gf.appendChild(o);
  });

  const grid = document.getElementById('grid');
  const search = document.getElementById('search');

  function render() {
    const q = search.value.trim().toLowerCase();
    const g = gf.value;
    grid.innerHTML = '';
    catalog
      .filter(p => (!g || p.genre === g) && (!q || p.title.toLowerCase().includes(q) || p.id.includes(q)))
      .forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<div class="thumb">${PE.generateSVG(p.genre, p.seed)}</div><div class="meta"><span>${p.title}</span><span class="genre">${p.genre}</span></div>`;
        card.addEventListener('click', () => openModal(p));
        grid.appendChild(card);
      });
  }
  search.addEventListener('input', render);
  gf.addEventListener('change', render);
  render();

  // Modal
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modal-body');
  document.getElementById('modal-close').addEventListener('click', () => modal.hidden = true);
  modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });

  function openModal(p) {
    const svg = PE.generateSVG(p.genre, p.seed);
    modalBody.innerHTML = `
      <h2>${p.title}</h2>
      <p class="muted">${p.genre} · ID ${p.id}</p>
      <div class="modal-preview">${svg}</div>
      <div class="actions">
        <button class="primary" data-act="svg">Download SVG (any size)</button>
        <button data-act="png300">Export PNG @ 300 DPI</button>
        <button data-act="png150">Export PNG @ 150 DPI</button>
      </div>
      <p class="muted" style="margin-top:1rem">SVG prints losslessly at any size. PNG exports use 16×24″ (2:3) as default frame.</p>
    `;
    modalBody.querySelector('[data-act=svg]').onclick = () => downloadSVG(p, svg);
    modalBody.querySelector('[data-act=png300]').onclick = () => exportPNG(p, svg, 300);
    modalBody.querySelector('[data-act=png150]').onclick = () => exportPNG(p, svg, 150);
    modal.hidden = false;
  }

  function downloadSVG(p, svg) {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    triggerDownload(blob, `${p.id}.svg`);
  }

  function exportPNG(p, svg, dpi) {
    const size = PE.getSize('16x24');
    const px = PE.pixelsForSize(size, dpi);
    const img = new Image();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = px.w; c.height = px.h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, px.w, px.h);
      c.toBlob(b => {
        triggerDownload(b, `${p.id}_${size.name}_${dpi}dpi.png`);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.src = url;
  }

  function triggerDownload(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // Size guide
  (function(){
    const t = document.getElementById('size-guide');
    t.innerHTML = '<thead><tr><th>Size</th><th>Ratio</th><th>Inches</th><th>@ 300 DPI (px)</th><th>@ 150 DPI (px)</th></tr></thead>';
    const tb = document.createElement('tbody');
    PE.getSizes().forEach(s => {
      const p300 = PE.pixelsForSize(s, 300);
      const p150 = PE.pixelsForSize(s, 150);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${s.name}</td><td>${s.ratio}</td><td>${s.w.toFixed(2)} × ${s.h.toFixed(2)}</td><td>${p300.w}×${p300.h}</td><td>${p150.w}×${p150.h}</td>`;
      tb.appendChild(tr);
    });
    t.appendChild(tb);
  })();

  // Photo workbench
  const drop = document.getElementById('drop');
  const file = document.getElementById('file');
  const result = document.getElementById('photo-result');
  const preview = document.getElementById('photo-preview');
  const gradeTable = document.getElementById('grade-table');

  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => { if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
  file.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

  function handleFile(f) {
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      preview.innerHTML = '';
      const disp = img.cloneNode();
      disp.style.maxHeight = '400px';
      preview.appendChild(disp);
      const info = document.createElement('p');
      info.className = 'muted';
      info.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
      preview.appendChild(info);

      const grades = PE.gradePhotoAllSizes({ w: img.naturalWidth, h: img.naturalHeight });
      gradeTable.innerHTML = '<thead><tr><th>Size</th><th>Ratio</th><th>Effective DPI</th><th>Grade</th><th>Export</th></tr></thead>';
      const tb = document.createElement('tbody');
      grades.forEach(g => {
        const tr = document.createElement('tr');
        const btn = g.canExport
          ? `<button data-size="${g.size}">Export</button>`
          : `<span class="muted">blocked &lt;150 DPI</span>`;
        tr.innerHTML = `<td>${g.size}</td><td>${g.ratio}</td><td>${g.dpi}</td><td class="grade-${g.grade}">${g.grade}</td><td>${btn}</td>`;
        tb.appendChild(tr);
      });
      gradeTable.appendChild(tb);
      gradeTable.querySelectorAll('button[data-size]').forEach(b => {
        b.onclick = () => exportPhoto(img, b.dataset.size, f.name);
      });
      result.hidden = false;
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function exportPhoto(img, sizeName, origName) {
    const size = PE.getSize(sizeName);
    const e = PE.effectiveDPI({ w: img.naturalWidth, h: img.naturalHeight }, size);
    const dpi = Math.min(300, e.dpi);
    const outW = Math.round(e.sizeW * dpi);
    const outH = Math.round(e.sizeH * dpi);
    const sx = (img.naturalWidth - e.cropW) / 2;
    const sy = (img.naturalHeight - e.cropH) / 2;
    const c = document.createElement('canvas');
    c.width = outW; c.height = outH;
    c.getContext('2d').drawImage(img, sx, sy, e.cropW, e.cropH, 0, 0, outW, outH);
    c.toBlob(b => {
      const base = (origName || 'photo').replace(/\.[^.]+$/, '');
      triggerDownload(b, `${base}_${sizeName}_${dpi}dpi.png`);
    }, 'image/png');
  }
})();
