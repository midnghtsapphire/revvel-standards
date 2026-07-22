/* PrintBank UI controller */
(function () {
  'use strict';
  var PE = window.PrintEngine;
  if (!PE) { console.error('PrintEngine missing'); return; }

  var catalog = PE.buildCatalog(144);
  var $ = function (id) { return document.getElementById(id); };

  // ---------- Tabs ----------
  var tabs = document.querySelectorAll('.pb-nav-link');
  tabs.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      tabs.forEach(function (l) { l.classList.remove('active'); });
      link.classList.add('active');
      document.querySelectorAll('.pb-tab').forEach(function (t) { t.classList.remove('active'); });
      var target = document.getElementById(link.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // ---------- Genre filter ----------
  var genreSelect = $('pb-genre');
  PE.GENRES.forEach(function (g) {
    var opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g.replace(/-/g, ' ');
    genreSelect.appendChild(opt);
  });

  // ---------- Grid ----------
  var grid = $('pb-grid');
  function renderGrid() {
    var q = $('pb-search').value.trim().toLowerCase();
    var genre = genreSelect.value;
    grid.innerHTML = '';
    catalog.forEach(function (item) {
      if (genre && item.genre !== genre) return;
      if (q && item.title.toLowerCase().indexOf(q) === -1 && item.genre.indexOf(q) === -1) return;
      var card = document.createElement('div');
      card.className = 'pb-card';
      card.innerHTML =
        '<div class="pb-card-preview">' + PE.generateSvg(item.seed, item.genre, 400, 600) + '</div>' +
        '<div class="pb-card-info"><p class="pb-card-title">' + escapeHtml(item.title) + '</p>' +
        '<p class="pb-card-genre">' + item.genre.replace(/-/g, ' ') + '</p></div>';
      card.addEventListener('click', function () { openModal(item); });
      grid.appendChild(card);
    });
  }
  $('pb-search').addEventListener('input', renderGrid);
  genreSelect.addEventListener('change', renderGrid);
  renderGrid();

  // ---------- Modal ----------
  var currentItem = null;
  var exportSizeSelect = $('pb-export-size');
  PE.SIZES.forEach(function (s) {
    var opt = document.createElement('option');
    opt.value = s.id;
    var inches = PE.sizeInInches(s);
    opt.textContent = s.id + ' (' + inches.w.toFixed(1) + '×' + inches.h.toFixed(1) + '")';
    exportSizeSelect.appendChild(opt);
  });

  function openModal(item) {
    currentItem = item;
    $('pb-modal-title').textContent = item.title;
    $('pb-modal-genre').textContent = item.genre.replace(/-/g, ' ');
    $('pb-modal-preview').innerHTML = PE.generateSvg(item.seed, item.genre, 800, 1200);
    $('pb-modal').hidden = false;
  }
  $('pb-modal-close').addEventListener('click', function () { $('pb-modal').hidden = true; });
  $('pb-modal').addEventListener('click', function (e) {
    if (e.target.id === 'pb-modal') $('pb-modal').hidden = true;
  });

  $('pb-download-svg').addEventListener('click', function () {
    if (!currentItem) return;
    var svg = PE.generateSvg(currentItem.seed, currentItem.genre, 2000, 3000);
    downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), currentItem.id + '.svg');
  });

  $('pb-download-png').addEventListener('click', function () {
    if (!currentItem) return;
    var sizeId = exportSizeSelect.value;
    var dpi = parseInt($('pb-export-dpi').value, 10);
    var size = PE.SIZES.find(function (s) { return s.id === sizeId; });
    var px = PE.pixelsAtDpi(size, dpi);
    var svg = PE.generateSvg(currentItem.seed, currentItem.genre, px.w, px.h);
    rasterizeSvgToPng(svg, px.w, px.h, function (blob) {
      downloadBlob(blob, currentItem.id + '-' + sizeId + '-' + dpi + 'dpi.png');
    });
  });

  function rasterizeSvgToPng(svgStr, w, h, cb) {
    var img = new Image();
    var url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }));
    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(function (blob) { cb(blob); }, 'image/png');
    };
    img.src = url;
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- Photo workbench ----------
  var drop = $('pb-drop');
  var fileInput = $('pb-file');
  ['dragenter', 'dragover'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('dragover'); });
  });
  drop.addEventListener('drop', function (e) {
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', function () {
    if (fileInput.files.length) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () { renderPhotoWorkbench(img); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function renderPhotoWorkbench(img) {
    $('pb-photo-workbench').hidden = false;
    var canvas = $('pb-photo-canvas');
    var maxDim = 600;
    var scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    $('pb-photo-meta').textContent = 'Source: ' + img.width + ' × ' + img.height + ' px';

    var grades = PE.gradePhotoAgainstAll(img.width, img.height);
    var body = $('pb-grade-body');
    body.innerHTML = '';
    grades.forEach(function (g) {
      var size = PE.SIZES.find(function (s) { return s.id === g.sizeId; });
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + g.sizeId + (g.rotated ? ' (landscape)' : '') + '</td>' +
        '<td>' + size.ratio + '</td>' +
        '<td>' + g.effectiveDpi + '</td>' +
        '<td class="pb-grade-' + g.grade + '">' + g.grade + '</td>' +
        '<td></td>';
      var btn = document.createElement('button');
      btn.className = 'pb-btn' + (g.exportable ? ' pb-btn-primary' : '');
      btn.textContent = g.exportable ? 'Export PNG' : 'Blocked';
      btn.disabled = !g.exportable;
      btn.addEventListener('click', function () { exportPhotoAtSize(img, size, g); });
      tr.lastChild.appendChild(btn);
      body.appendChild(tr);
    });
  }

  function exportPhotoAtSize(img, size, grade) {
    var dpi = grade.effectiveDpi >= 300 ? 300 : 150;
    var tW = grade.targetInches.w * dpi;
    var tH = grade.targetInches.h * dpi;
    var canvas = document.createElement('canvas');
    canvas.width = Math.round(tW); canvas.height = Math.round(tH);
    var ctx = canvas.getContext('2d');
    var c = grade.crop;
    ctx.drawImage(img, c.offsetX, c.offsetY, c.cropW, c.cropH, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(function (blob) {
      downloadBlob(blob, 'photo-' + size.id + (grade.rotated ? '-landscape' : '') + '-' + dpi + 'dpi.png');
    }, 'image/png');
  }

  // ---------- Size guide ----------
  var sizeBody = $('pb-size-body');
  PE.SIZES.forEach(function (s) {
    var inches = PE.sizeInInches(s);
    var p300 = PE.pixelsAtDpi(s, 300);
    var p150 = PE.pixelsAtDpi(s, 150);
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + s.id + '</td>' +
      '<td>' + inches.w.toFixed(2) + '" × ' + inches.h.toFixed(2) + '"</td>' +
      '<td>' + s.ratio + '</td>' +
      '<td>' + p300.w + ' × ' + p300.h + '</td>' +
      '<td>' + p150.w + ' × ' + p150.h + '</td>';
    sizeBody.appendChild(tr);
  });
})();
