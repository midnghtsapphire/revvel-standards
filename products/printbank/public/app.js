(function () {
  'use strict';
  const PE = window.PrintEngine;
  const CATALOG = PE.buildCatalog(18);
  const state = { search: '', genre: '', photo: null };

  const $ = (s) => document.querySelector(s);
  const grid = $('#grid');
  const count = $('#count');
  const genreSel = $('#genre');

  // populate genre filter
  PE.GENRES.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g; opt.textContent = g.charAt(0).toUpperCase() + g.slice(1);
    genreSel.appendChild(opt);
  });

  function svgDataUrl(svg) {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function render() {
    const q = state.search.trim().toLowerCase();
    const filtered = CATALOG.filter(p => {
      if (state.genre && p.genre !== state.genre) return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.genre.includes(q) && !p.id.includes(q)) return false;
      return true;
    });
    count.textContent = `${filtered.length} of ${CATALOG.length}`;
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<img class="thumb" alt="${escapeHtml(p.title)}" src="${svgDataUrl(p.svg)}" loading="lazy"/><div class="meta"><p class="title">${escapeHtml(p.title)}</p><span class="genre">${p.genre}</span></div>`;
      card.addEventListener('click', () => openModal(p));
      frag.appendChild(card);
    });
    grid.appendChild(frag);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function openModal(print) {
    const body = $('#modalBody');
    body.innerHTML = `
      <h2>${escapeHtml(print.title)}</h2>
      <p style="color:var(--muted);text-transform:capitalize">${print.genre} · ID ${print.id}</p>
      <div class="preview">${print.svg}</div>
      <div class="actions">
        <button class="primary" data-act="svg">Download SVG (any size)</button>
        <button data-act="png300">Export PNG @ 300 DPI (16×24)</button>
        <button data-act="png150">Export PNG @ 150 DPI (16×24)</button>
      </div>
    `;
    body.querySelector('[data-act="svg"]').addEventListener('click', () => downloadBlob(new Blob([print.svg], { type: 'image/svg+xml' }), `${print.id}.svg`));
    body.querySelector('[data-act="png300"]').addEventListener('click', () => svgToPng(print, PE.getSize('16x24'), 300));
    body.querySelector('[data-act="png150"]').addEventListener('click', () => svgToPng(print, PE.getSize('16x24'), 150));
    $('#modal').classList.remove('hidden');
  }

  $('#closeModal').addEventListener('click', () => $('#modal').classList.add('hidden'));
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') $('#modal').classList.add('hidden'); });

  function svgToPng(print, size, dpi) {
    const px = PE.pixelsForSize(size, dpi);
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = px.w; canvas.height = px.h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, px.w, px.h);
      ctx.drawImage(img, 0, 0, px.w, px.h);
      canvas.toBlob(function (b) {
        downloadBlob(b, `${print.id}_${size.name}_${dpi}dpi.png`);
      }, 'image/png');
    };
    img.src = svgDataUrl(print.svg);
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
  }

  $('#search').addEventListener('input', (e) => { state.search = e.target.value; render(); });
  $('#genre').addEventListener('change', (e) => { state.genre = e.target.value; render(); });

  // --- photo workbench ---
  const fileInput = $('#file');
  fileInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) loadPhoto(f);
  });
  const drop = $('#drop');
  ['dragover','dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); }));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadPhoto(f);
  });

  function loadPhoto(file) {
    const reader = new FileReader();
    reader.onload = function () {
      const img = new Image();
      img.onload = function () {
        state.photo = { img, w: img.naturalWidth, h: img.naturalHeight, name: file.name };
        renderPhotoGrades();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function renderPhotoGrades() {
    const p = state.photo; if (!p) return;
    $('#photoInfo').classList.remove('hidden');
    $('#photoMeta').innerHTML = `<strong>${escapeHtml(p.name)}</strong> · ${p.w} × ${p.h} px`;
    const tbody = $('#gradeTable tbody');
    tbody.innerHTML = '';
    PE.getSizes().forEach(size => {
      const g = PE.gradePhoto({ w: p.w, h: p.h }, size);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${size.name}</td><td>${size.ratio}</td><td>${g.dpi}${g.rotated ? ' (rot)' : ''}</td><td><span class="badge ${g.grade}">${g.grade}</span></td><td></td>`;
      const cell = tr.querySelector('td:last-child');
      const btn = document.createElement('button');
      btn.textContent = 'Export 300 DPI';
      btn.disabled = !g.printable;
      btn.title = g.printable ? '' : 'Effective DPI below 150 — not print-ready';
      btn.addEventListener('click', () => exportPhoto(size, 300));
      cell.appendChild(btn);
      tbody.appendChild(tr);
    });
  }

  function exportPhoto(size, dpi) {
    const p = state.photo; if (!p) return;
    const g = PE.gradePhoto({ w: p.w, h: p.h }, size);
    const px = PE.pixelsForSize(size, dpi);
    const canvas = document.createElement('canvas');
    canvas.width = px.w; canvas.height = px.h;
    const ctx = canvas.getContext('2d');
    // draw with center crop; if rotated, swap orientation via canvas transforms
    const sw = g.rotated ? p.h : p.w;
    const sh = g.rotated ? p.w : p.h;
    const sx = Math.round((sw - g.cropW) / 2);
    const sy = Math.round((sh - g.cropH) / 2);
    if (g.rotated) {
      ctx.save();
      ctx.translate(px.w / 2, px.h / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(p.img, sx, sy, g.cropW, g.cropH, -px.h/2, -px.w/2, px.h, px.w);
      ctx.restore();
    } else {
      ctx.drawImage(p.img, sx, sy, g.cropW, g.cropH, 0, 0, px.w, px.h);
    }
    canvas.toBlob(b => downloadBlob(b, `${p.name.replace(/\.[^.]+$/, '')}_${size.name}_${dpi}dpi.png`), 'image/png');
  }

  // --- size guide ---
  const sizeBody = document.querySelector('#sizeTable tbody');
  PE.getSizes().forEach(s => {
    const px = PE.pixelsForSize(s, 300);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.name}</td><td>${s.w} × ${s.h} in</td><td>${s.ratio}</td><td>${px.w} × ${px.h}</td>`;
    sizeBody.appendChild(tr);
  });

  render();
}());
