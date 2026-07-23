// PrintBank UI. Uses global PrintEngine (loaded via <script src="print-engine.js">).
(function () {
  'use strict';
  var PE = window.PrintEngine;
  var catalog = PE.buildCatalog(18);

  // Genre filter
  var genreSelect = document.getElementById('genre-filter');
  PE.GENRES.forEach(function (g) {
    var opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g.split('-').map(function (w) { return w[0].toUpperCase() + w.slice(1); }).join(' ');
    genreSelect.appendChild(opt);
  });

  var grid = document.getElementById('grid');
  var searchInput = document.getElementById('search');

  function renderGrid() {
    var q = (searchInput.value || '').toLowerCase().trim();
    var g = genreSelect.value;
    grid.innerHTML = '';
    var filtered = catalog.filter(function (p) {
      if (g && p.genre !== g) return false;
      if (q && p.title.toLowerCase().indexOf(q) === -1 && p.genre.indexOf(q) === -1) return false;
      return true;
    });
    filtered.forEach(function (p) {
      var card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('data-id', p.id);
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.innerHTML = PE.generateSvg(p.genre, p.seed, 500, 700) +
        '<div class="meta"><div class="title">' + escapeHtml(p.title) + '</div>' +
        '<div class="genre">' + escapeHtml(p.genre) + '</div></div>';
      card.addEventListener('click', function () { openModal(p); });
      card.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openModal(p);
        }
      });
      grid.appendChild(card);
    });
    if (!filtered.length) {
      grid.innerHTML = '<p>No prints match.</p>';
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  searchInput.addEventListener('input', renderGrid);
  genreSelect.addEventListener('change', renderGrid);
  renderGrid();

  // Size guide
  var sizeTable = document.querySelector('#size-table tbody');
  PE.SIZES.forEach(function (s) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + s.name + '</td><td>' + s.w + '×' + s.h + '</td><td>' + s.ratio + '</td><td>' + s.group + '</td>';
    sizeTable.appendChild(tr);
  });

  // Modal
  var modal = document.getElementById('modal');
  var modalPreview = document.getElementById('modal-preview');
  var modalTitle = document.getElementById('modal-title');
  var modalMeta = document.getElementById('modal-meta');
  var modalSize = document.getElementById('modal-size');
  var currentPrint = null;

  PE.SIZES.forEach(function (s) {
    var opt = document.createElement('option');
    opt.value = s.name;
    opt.textContent = s.name + ' (' + s.w + '×' + s.h + '")';
    modalSize.appendChild(opt);
  });
  modalSize.value = '8x10';

  document.getElementById('modal-close').addEventListener('click', function () {
    modal.hidden = true;
  });

  function openModal(print) {
    currentPrint = print;
    modalTitle.textContent = print.title;
    modalMeta.textContent = 'Genre: ' + print.genre + ' · Vector SVG, prints losslessly at any size.';
    modalPreview.innerHTML = PE.generateSvg(print.genre, print.seed, 1000, 1400);
    modal.hidden = false;
  }

  document.getElementById('dl-svg').addEventListener('click', function () {
    if (!currentPrint) return;
    var svg = PE.generateSvg(currentPrint.genre, currentPrint.seed, 1000, 1400);
    downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), currentPrint.id + '.svg');
  });

  document.getElementById('dl-png-150').addEventListener('click', function () {
    exportPng(150);
  });
  document.getElementById('dl-png-300').addEventListener('click', function () {
    exportPng(300);
  });

  function exportPng(dpi) {
    if (!currentPrint) return;
    var size = PE.SIZES.find(function (s) { return s.name === modalSize.value; });
    if (!size) return;
    var px = PE.pixelDimensions(size, dpi);
    var svg = PE.generateSvg(currentPrint.genre, currentPrint.seed, px.w, px.h);
    var img = new Image();
    var url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = px.w;
      canvas.height = px.h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, px.w, px.h);
      canvas.toBlob(function (blob) {
        downloadBlob(blob, currentPrint.id + '-' + size.name + '-' + dpi + 'dpi.png');
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.src = url;
  }

  function downloadBlob(blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 100);
  }

  // Photo workbench
  var dropzone = document.getElementById('dropzone');
  var fileInput = document.getElementById('file');
  var results = document.getElementById('photo-results');
  var photoPreview = document.getElementById('photo-preview');
  var photoMeta = document.getElementById('photo-meta');
  var gradeBody = document.querySelector('#grade-table tbody');
  var currentImage = null;

  ['dragenter', 'dragover'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });
  dropzone.addEventListener('drop', function (e) {
    var f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  });
  fileInput.addEventListener('change', function () {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      currentImage = img;
      photoPreview.src = url;
      photoMeta.innerHTML = '<strong>' + escapeHtml(file.name) + '</strong><br>' +
        img.naturalWidth + ' × ' + img.naturalHeight + ' px';
      renderGrades(img.naturalWidth, img.naturalHeight);
      results.hidden = false;
    };
    img.src = url;
  }

  function renderGrades(w, h) {
    var grades = PE.gradePhotoAcrossSizes(w, h);
    gradeBody.innerHTML = '';
    grades.forEach(function (g) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + g.size + (g.rotated ? ' (rotated)' : '') + '</td>' +
        '<td>' + g.dpi + '</td>' +
        '<td><span class="grade-' + g.grade + '">' + g.grade + '</span></td>' +
        '<td><button data-size="' + g.size + '"' + (g.grade === 'low' ? ' disabled title="Below 150 DPI"' : '') + '>Export</button></td>';
      gradeBody.appendChild(tr);
    });
    gradeBody.querySelectorAll('button[data-size]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        exportPhoto(btn.getAttribute('data-size'));
      });
    });
  }

  function exportPhoto(sizeName) {
    if (!currentImage) return;
    var size = PE.SIZES.find(function (s) { return s.name === sizeName; });
    if (!size) return;
    var eff = PE.effectiveDpi(currentImage.naturalWidth, currentImage.naturalHeight, size);
    var tw = eff.rotated ? size.h : size.w;
    var th = eff.rotated ? size.w : size.h;
    var dpi = eff.dpi >= 300 ? 300 : 150;
    var px = PE.pixelDimensions({ w: tw, h: th }, dpi);
    var crop = PE.centerCrop(currentImage.naturalWidth, currentImage.naturalHeight, tw, th);
    var canvas = document.createElement('canvas');
    canvas.width = px.w;
    canvas.height = px.h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(currentImage, crop.x, crop.y, crop.w, crop.h, 0, 0, px.w, px.h);
    canvas.toBlob(function (blob) {
      downloadBlob(blob, 'photo-' + sizeName + '-' + dpi + 'dpi.png');
    }, 'image/png');
  }
}());
