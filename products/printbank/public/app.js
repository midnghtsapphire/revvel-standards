(function () {
  'use strict';
  const E = window.PrintEngine;
  const CATALOG = E.generateCatalog(144);

  // Tabs
  document.querySelectorAll('nav button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('nav button').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      document.getElementById(b.dataset.tab).classList.add('active');
    });
  });

  // Genre filter
  const genreSel = document.getElementById('genre-filter');
  E.GENRES.forEach(g => {
    const o = document.createElement('option');
    o.value = g; o.textContent = g;
    genreSel.appendChild(o);
  });

  const grid = document.getElementById('grid');
  const search = document.getElementById('search');

  function renderGrid() {
    const q = search.value.toLowerCase();
    const g = genreSel.value;
    grid.innerHTML = '';
    CATALOG.filter(p => (!g || p.genre === g) && (!q || p.id.includes(q) || p.genre.includes(q)))
      .forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.innerHTML = p.svg + `<div class="meta"><span>${p.id}</span><span>${p.genre}</span></div>`;
        card.addEventListener('click', () => openModal(p));
        card.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(p); }
        });
        grid.appendChild(card);
      });
  }
  search.addEventListener('input', renderGrid);
  genreSel.addEventListener('change', renderGrid);
  renderGrid();

  // Modal
  const modal = document.getElementById('modal');
  const preview = document.getElementById('modal-preview');
  const actions = document.getElementById('modal-actions');
  document.getElementById('modal-close').addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

  function openModal(p) {
    preview.innerHTML = p.svg;
    actions.innerHTML = '';
    const dlSvg = document.createElement('button');
    dlSvg.textContent = 'Download SVG (any size)';
    dlSvg.addEventListener('click', () => downloadBlob(new Blob([p.svg], {type: 'image/svg+xml'}), `${p.id}.svg`));
    actions.appendChild(dlSvg);
    ['8x10', '11x14', '16x20', '18x24', '24x36', 'A3'].forEach(sn => {
      const size = E.SIZES.find(s => s.name === sn);
      [150, 300].forEach(dpi => {
        const b = document.createElement('button');
        b.textContent = `PNG ${sn} @ ${dpi} DPI`;
        b.addEventListener('click', () => exportPng(p, size, dpi));
        actions.appendChild(b);
      });
    });
    modal.classList.remove('hidden');
  }

  function exportPng(print, size, dpi) {
    const px = E.pixelsForSize(size, dpi);
    const canvas = document.createElement('canvas');
    canvas.width = px.w; canvas.height = px.h;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const blob = new Blob([print.svg], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, px.w, px.h);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => downloadBlob(b, `${print.id}-${size.name}-${dpi}dpi.png`), 'image/png');
    };
    img.src = url;
  }

  function downloadBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // Size guide
  const sizeTable = document.getElementById('size-table');
  sizeTable.innerHTML = '<tr><th>Name</th><th>Inches</th><th>Ratio</th><th>Px @ 300 DPI</th></tr>' +
    E.SIZES.map(s => {
      const px = E.pixelsForSize(s, 300);
      return `<tr><td>${s.name}</td><td>${s.w} × ${s.h}</td><td>${s.ratio}</td><td>${px.w} × ${px.h}</td></tr>`;
    }).join('');

  // Photo workbench
  const drop = document.getElementById('drop');
  const fileInput = document.getElementById('file');
  const info = document.getElementById('photo-info');
  const grades = document.getElementById('photo-grades');
  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('hover'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('hover'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('hover');
    if (e.dataTransfer.files[0]) handlePhoto(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) handlePhoto(fileInput.files[0]); });

  function handlePhoto(file) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      info.textContent = `${file.name} — ${img.width} × ${img.height} px`;
      grades.innerHTML = '<tr><th>Size</th><th>Effective DPI</th><th>Grade</th><th>Rotate?</th><th>Export</th></tr>' +
        E.SIZES.map(s => {
          const g = E.gradePhotoForSize(img.width, img.height, s);
          const btn = g.ok && g.dpi >= 150
            ? `<button data-size="${s.name}" data-rotate="${g.rotate}">Export ${g.dpi >= 300 ? '300' : '150'} DPI</button>`
            : '—';
          return `<tr><td>${s.name}</td><td>${g.dpi}</td><td class="grade-${g.grade}">${g.label}</td><td>${g.rotate ? 'yes' : 'no'}</td><td>${btn}</td></tr>`;
        }).join('');
      grades.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', () => {
          const size = E.SIZES.find(s => s.name === b.dataset.size);
          const rotate = b.dataset.rotate === 'true';
          exportPhoto(img, file.name, size, rotate);
        });
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function exportPhoto(img, name, size, rotate) {
    const dpi = 300;
    const px = E.pixelsForSize(size, dpi);
    const crop = E.centerCropRect(img.width, img.height, size, rotate);
    const canvas = document.createElement('canvas');
    canvas.width = px.w; canvas.height = px.h;
    const ctx = canvas.getContext('2d');
    if (rotate) {
      ctx.translate(px.w / 2, px.h / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, crop.y, crop.x, crop.h, crop.w, -px.h / 2, -px.w / 2, px.h, px.w);
    } else {
      ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, px.w, px.h);
    }
    canvas.toBlob(b => downloadBlob(b, `${name.replace(/\.[^.]+$/, '')}-${size.name}-${dpi}dpi.png`), 'image/png');
  }
})();
