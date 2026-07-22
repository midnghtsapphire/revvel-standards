(function () {
  'use strict';
  var PE = window.PrintEngine;
  var catalog = PE.buildCatalog(144);

  // ---- nav ----
  document.querySelectorAll('header nav button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('header nav button').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
      document.getElementById('view-' + b.dataset.view).classList.add('active');
    });
  });

  // ---- genre filter populate ----
  var gf = document.getElementById('genre-filter');
  PE.GENRES.forEach(function (g) {
    var o = document.createElement('option');
    o.value = g;
    o.textContent = g;
    gf.appendChild(o);
  });

  // ---- gallery render ----
  function renderGrid() {
    var q = (document.getElementById('search').value || '').toLowerCase();
    var genre = gf.value;
    var grid = document.getElementById('grid');
    grid.innerHTML = '';
    catalog.forEach(function (item) {
      if (genre && item.genre !== genre) return;
      if (q && item.title.toLowerCase().indexOf(q) < 0 && item.genre.indexOf(q) < 0) return;
      var card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = '<div class="thumb">' + PE.generateSvg(item.seed, item.genre, { width: 400, height: 600 }) + '</div><div class="meta"><strong>' + item.title + '</strong><span>' + item.genre + '</span></div>';
      card.addEventListener('click', function () { openModal(item); });
      grid.appendChild(card);
    });
  }
  document.getElementById('search').addEventListener('input', renderGrid);
  gf.addEventListener('change', renderGrid);
  renderGrid();

  // ---- modal ----
  var modal = document.getElementById('modal');
  document.querySelector('.close').addEventListener('click', function () { modal.hidden = true; });
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.hidden = true; });

  function openModal(item) {
    var body = document.getElementById('modal-body');
    var svg = PE.generateSvg(item.seed, item.genre, { width: 800, height: 1200 });
    body.innerHTML = '<div class="detail"><div class="detail-art">' + svg + '</div><div class="detail-info"><h2>' + item.title + '</h2><p>' + item.genre + '</p>' +
      '<button id="dl-svg">Download SVG (infinite scale)</button>' +
      '<label>Export as PNG at size: <select id="exp-size"></select></label>' +
      '<label>DPI: <select id="exp-dpi"><option value="150">150 (draft)</option><option value="300" selected>300 (print)</option></select></label>' +
      '<button id="dl-png">Download PNG</button>' +
      '</div></div>';
    var sel = body.querySelector('#exp-size');
    PE.SIZES.forEach(function (s) {
      var o = document.createElement('option');
      o.value = s.id;
      o.textContent = s.label;
      sel.appendChild(o);
    });
    body.querySelector('#dl-svg').addEventListener('click', function () {
      downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), item.id + '.svg');
    });
    body.querySelector('#dl-png').addEventListener('click', function () {
      var dpi = parseInt(body.querySelector('#exp-dpi').value, 10);
      var sizeId = sel.value;
      exportPng(item, sizeId, dpi);
    });
    modal.hidden = false;
  }

  function exportPng(item, sizeId, dpi) {
    var px = PE.pixelsForSize(sizeId, dpi);
    var svg = PE.generateSvg(item.seed, item.genre, { width: px.w, height: px.h });
    var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = px.w;
      canvas.height = px.h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(function (b) {
        downloadBlob(b, item.id + '_' + sizeId + '_' + dpi + 'dpi.png');
      }, 'image/png');
    };
    img.src = url;
  }

  function downloadBlob(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }

  // ---- workbench ----
  var drop = document.getElementById('drop');
  var fileInput = document.getElementById('file');
  drop.addEventListener('click', function () { fileInput.click(); });
  drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
  drop.addEventListener('drop', function (e) {
    e.preventDefault();
    drop.classList.remove('over');
    if (e.dataTransfer.files[0]) loadPhoto(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', function () {
    if (fileInput.files[0]) loadPhoto(fileInput.files[0]);
  });

  var currentPhoto = null;
  function loadPhoto(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        currentPhoto = img;
        renderWorkbench(img);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function renderWorkbench(img) {
    document.getElementById('workbench-result').hidden = false;
    var preview = document.getElementById('preview');
    var maxDim = 400;
    var scale = Math.min(maxDim / img.width, maxDim / img.height);
    preview.width = img.width * scale;
    preview.height = img.height * scale;
    preview.getContext('2d').drawImage(img, 0, 0, preview.width, preview.height);
    document.getElementById('photo-info').textContent = 'Photo: ' + img.width + '×' + img.height + ' px (' + (img.width * img.height / 1e6).toFixed(1) + ' MP)';

    var tbody = document.querySelector('#grade-table tbody');
    tbody.innerHTML = '';
    PE.SIZES.forEach(function (s) {
      var g = PE.gradePhoto(img.width, img.height, s.id);
      var tr = document.createElement('tr');
      tr.className = 'grade-' + g.grade;
      var exportCell = g.printReady
        ? '<button data-size="' + s.id + '">Export 300 DPI</button>'
        : '<em>Below 150 DPI</em>';
      tr.innerHTML = '<td>' + s.label + (g.rotated ? ' ↻' : '') + '</td><td>' + g.dpi + '</td><td>' + g.grade + '</td><td>' + exportCell + '</td>';
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        exportPhoto(currentPhoto, btn.dataset.size, 300);
      });
    });
  }

  function exportPhoto(img, sizeId, dpi) {
    var g = PE.gradePhoto(img.width, img.height, sizeId);
    if (!g.printReady) {
      alert('This photo is below 150 DPI at that size and would print poorly.');
      return;
    }
    var s = PE.SIZES.find(function (x) { return x.id === sizeId; });
    var sw = g.rotated ? s.h : s.w;
    var sh = g.rotated ? s.w : s.h;
    var px = { w: Math.round(sw * dpi), h: Math.round(sh * dpi) };
    var crop = PE.centerCrop(img.width, img.height, sw / sh);
    var canvas = document.createElement('canvas');
    canvas.width = px.w;
    canvas.height = px.h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, px.w, px.h);
    canvas.toBlob(function (b) {
      downloadBlob(b, 'photo_' + sizeId + '_' + dpi + 'dpi.png');
    }, 'image/png');
  }

  // ---- sizes table ----
  var st = document.querySelector('#sizes-table tbody');
  PE.SIZES.forEach(function (s) {
    var px = PE.pixelsForSize(s.id, 300);
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + s.label + '</td><td>' + s.w + '×' + s.h + '</td><td>' + s.ratio + '</td><td>' + px.w + '×' + px.h + '</td>';
    st.appendChild(tr);
  });
})();
