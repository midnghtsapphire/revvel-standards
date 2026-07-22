(function () {
  'use strict';
  const E = window.PrintEngine;
  const catalog = E.buildCatalog(144);

  // Populate genres
  const genreSel = document.getElementById('genre');
  E.GENRES.forEach(function (g) {
    const o = document.createElement('option');
    o.value = g; o.textContent = g;
    genreSel.appendChild(o);
  });

  const grid = document.getElementById('grid');
  const q = document.getElementById('q');

  function thumb(item) {
    return E.generateSVG(item.genre, item.id, 400, 600);
  }

  function renderGrid() {
    const term = (q.value || '').toLowerCase();
    const gf = genreSel.value;
    grid.innerHTML = '';
    catalog.filter(function (it) {
      if (gf && it.genre !== gf) return false;
      if (term && it.title.toLowerCase().indexOf(term) === -1 && it.id.indexOf(term) === -1) return false;
      return true;
    }).forEach(function (it) {
      const card = document.createElement('button');
      card.className = 'card';
      card.setAttribute('data-id', it.id);
      card.innerHTML = '<div class="thumb">' + thumb(it) + '</div><div class="meta"><strong>' + it.title + '</strong><span>' + it.genre + '</span></div>';
      card.addEventListener('click', function () { openModal(it); });
      grid.appendChild(card);
    });
  }

  q.addEventListener('input', renderGrid);
  genreSel.addEventListener('change', renderGrid);

  // Modal / detail
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  document.getElementById('modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

  function closeModal() { modal.classList.add('hidden'); modalBody.innerHTML = ''; }

  function openModal(item) {
    const svg = E.generateSVG(item.genre, item.id, 1200, 1800);
    modalBody.innerHTML =
      '<h2>' + item.title + '</h2>' +
      '<div class="preview">' + svg + '</div>' +
      '<p>Vector SVG — prints losslessly at every size below.</p>' +
      '<div class="actions">' +
        '<button data-act="svg">Download SVG</button>' +
        '<label>Size: <select id="expSize"></select></label>' +
        '<label>DPI: <select id="expDpi"><option>300</option><option>150</option></select></label>' +
        '<button data-act="png">Export PNG</button>' +
      '</div>';
    const sel = modalBody.querySelector('#expSize');
    E.SIZES.forEach(function (s) {
      const o = document.createElement('option');
      o.value = s.name; o.textContent = s.name + '" (' + s.w + '×' + s.h + ')';
      sel.appendChild(o);
    });
    modalBody.querySelector('[data-act=svg]').addEventListener('click', function () { downloadSVG(item); });
    modalBody.querySelector('[data-act=png]').addEventListener('click', function () {
      const sz = E.SIZES.find(function (x) { return x.name === sel.value; });
      const dpi = parseInt(modalBody.querySelector('#expDpi').value, 10);
      exportPNG(item, sz, dpi);
    });
    modal.classList.remove('hidden');
  }

  function downloadSVG(item) {
    const svg = E.generateSVG(item.genre, item.id, 1200, 1800);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = item.id + '.svg';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function exportPNG(item, size, dpi) {
    const px = E.pixelsForSize(size, dpi);
    const svg = E.generateSVG(item.genre, item.id, px.w, px.h);
    const img = new Image();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = function () {
      const c = document.createElement('canvas');
      c.width = px.w; c.height = px.h;
      c.getContext('2d').drawImage(img, 0, 0, px.w, px.h);
      c.toBlob(function (b) {
        const u = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = u; a.download = item.id + '_' + size.name + '_' + dpi + 'dpi.png';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
      }, 'image/png');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  // Photo sizer
  const drop = document.getElementById('drop');
  const file = document.getElementById('file');
  const photoInfo = document.getElementById('photoInfo');
  const gradeTable = document.getElementById('gradeTable');
  let currentPhoto = null;

  drop.addEventListener('click', function () { file.click(); });
  drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
  drop.addEventListener('drop', function (e) {
    e.preventDefault(); drop.classList.remove('over');
    if (e.dataTransfer.files[0]) loadPhoto(e.dataTransfer.files[0]);
  });
  file.addEventListener('change', function () { if (file.files[0]) loadPhoto(file.files[0]); });

  function loadPhoto(f) {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = function () {
      currentPhoto = { img: img, w: img.naturalWidth, h: img.naturalHeight, name: f.name };
      photoInfo.innerHTML = '<strong>' + f.name + '</strong> — ' + img.naturalWidth + '×' + img.naturalHeight + 'px';
      renderGradeTable();
    };
    img.src = url;
  }

  function renderGradeTable() {
    if (!currentPhoto) return;
    const rows = E.gradePhoto(currentPhoto.w, currentPhoto.h);
    let html = '<table class="grades"><thead><tr><th>Size</th><th>Effective DPI</th><th>Grade</th><th>Export</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr class="g-' + r.grade + '">' +
        '<td>' + r.size + '</td>' +
        '<td>' + r.dpi + '</td>' +
        '<td>' + r.grade + '</td>' +
        '<td>' + (r.dpi >= 150
          ? '<button data-size="' + r.size + '" data-dpi="300">300 DPI</button> <button data-size="' + r.size + '" data-dpi="150">150 DPI</button>'
          : '<em>too low</em>') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    gradeTable.innerHTML = html;
    gradeTable.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        exportPhotoAt(b.getAttribute('data-size'), parseInt(b.getAttribute('data-dpi'), 10));
      });
    });
  }

  function exportPhotoAt(sizeName, dpi) {
    if (!currentPhoto) return;
    const size = E.SIZES.find(function (s) { return s.name === sizeName; });
    // pick orientation matching source
    const src = currentPhoto;
    const useLandscape = (src.w > src.h) !== (size.w > size.h);
    const target = useLandscape ? { w: size.h, h: size.w } : { w: size.w, h: size.h };
    const px = E.pixelsForSize({ w: target.w, h: target.h }, dpi);
    const crop = E.cropRect(src.w, src.h, { w: target.w, h: target.h });
    const c = document.createElement('canvas');
    c.width = px.w; c.height = px.h;
    c.getContext('2d').drawImage(src.img, crop.x, crop.y, crop.w, crop.h, 0, 0, px.w, px.h);
    c.toBlob(function (b) {
      const u = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = u; a.download = 'photo_' + sizeName + '_' + dpi + 'dpi.png';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
    }, 'image/png');
  }

  // Size guide
  const sg = document.getElementById('sizeGuide');
  let sgHtml = '<table class="sizes"><thead><tr><th>Name</th><th>Inches</th><th>Ratio</th><th>Pixels @300</th><th>Pixels @150</th></tr></thead><tbody>';
  E.SIZES.forEach(function (s) {
    const p300 = E.pixelsForSize(s, 300);
    const p150 = E.pixelsForSize(s, 150);
    sgHtml += '<tr><td>' + s.name + '</td><td>' + s.w + '×' + s.h + '</td><td>' + s.ratio + '</td>' +
      '<td>' + p300.w + '×' + p300.h + '</td><td>' + p150.w + '×' + p150.h + '</td></tr>';
  });
  sgHtml += '</tbody></table>';
  sg.innerHTML = sgHtml;

  renderGrid();
}());
