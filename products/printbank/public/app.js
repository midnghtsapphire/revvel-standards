/* PrintBank UI — browse the vector print bank, size your own photos. */
/* global PrintEngine */
(function () {
  "use strict";

  const E = PrintEngine;
  const $ = (sel) => document.querySelector(sel);

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", String(t === tab));
      });
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      $(`#panel-${tab.dataset.tab}`).classList.add("active");
    });
  });

  // ---------------------------------------------------------------------------
  // Print bank grid
  // ---------------------------------------------------------------------------
  const catalog = E.buildCatalog({ perGenre: 18 });
  let activeGenre = "all";
  let query = "";

  const chipsEl = $("#genre-chips");
  const genres = [{ id: "all", label: "All genres" }].concat(E.listGenres());
  genres.forEach((g) => {
    const chip = document.createElement("button");
    chip.className = "chip" + (g.id === "all" ? " active" : "");
    chip.textContent = g.label;
    chip.addEventListener("click", () => {
      activeGenre = g.id;
      chipsEl.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
      renderGrid();
    });
    chipsEl.appendChild(chip);
  });

  $("#search").addEventListener("input", (ev) => {
    query = ev.target.value.trim().toLowerCase();
    renderGrid();
  });

  function matches(print) {
    if (activeGenre !== "all" && print.genreId !== activeGenre) return false;
    if (!query) return true;
    return (
      print.title.toLowerCase().includes(query) ||
      print.genreLabel.toLowerCase().includes(query) ||
      print.ratioLabel.toLowerCase().includes(query)
    );
  }

  function renderGrid() {
    const grid = $("#grid");
    grid.innerHTML = "";
    const visible = catalog.filter(matches);
    if (!visible.length) {
      grid.innerHTML = '<p class="muted">No prints match — try another search or genre.</p>';
      return;
    }
    visible.forEach((print) => {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML =
        `<div class="art">${print.svg}</div>` +
        `<div class="meta"><h3>${print.title}</h3><p>${print.genreLabel} · ${print.ratioLabel}</p></div>`;
      card.addEventListener("click", () => openModal(print));
      grid.appendChild(card);
    });
  }

  renderGrid();

  // ---------------------------------------------------------------------------
  // Print detail modal + downloads
  // ---------------------------------------------------------------------------
  const modal = $("#modal");
  let currentPrint = null;

  function openModal(print) {
    currentPrint = print;
    $("#modal-art").innerHTML = print.svg;
    $("#modal-title").textContent = print.title;
    $("#modal-sub").textContent = `${print.genreLabel} · ratio ${print.ratioLabel} · vector`;
    const sizeSel = $("#dl-size");
    sizeSel.innerHTML = "";
    E.sizesForRatio(print.ratioId).forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.display;
      sizeSel.appendChild(opt);
    });
    updatePixelNote();
    modal.hidden = false;
  }

  function updatePixelNote() {
    if (!currentPrint) return;
    const sizeId = $("#dl-size").value;
    const dpi = Number($("#dl-dpi").value);
    const px = E.pixelsForSize(sizeId, dpi);
    $("#dl-pixels").textContent = `PNG export: ${px.width} × ${px.height} px`;
  }

  $("#dl-size").addEventListener("change", updatePixelNote);
  $("#dl-dpi").addEventListener("change", updatePixelNote);
  $("#modal-close").addEventListener("click", () => { modal.hidden = true; });
  modal.addEventListener("click", (ev) => { if (ev.target === modal) modal.hidden = true; });

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function slug(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  $("#dl-svg").addEventListener("click", () => {
    if (!currentPrint) return;
    downloadBlob(
      new Blob([currentPrint.svg], { type: "image/svg+xml" }),
      `${slug(currentPrint.title)}-${currentPrint.ratioId}.svg`
    );
  });

  $("#dl-png").addEventListener("click", () => {
    if (!currentPrint) return;
    const sizeId = $("#dl-size").value;
    const dpi = Number($("#dl-dpi").value);
    const px = E.pixelsForSize(sizeId, dpi);
    const img = new Image();
    const svgBlob = new Blob([currentPrint.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = px.width;
      canvas.height = px.height;
      canvas.getContext("2d").drawImage(img, 0, 0, px.width, px.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        downloadBlob(blob, `${slug(currentPrint.title)}-${sizeId}-${dpi}dpi.png`);
      }, "image/png");
    };
    img.src = url;
  });

  // ---------------------------------------------------------------------------
  // Your Photos — upload, grade, export
  // ---------------------------------------------------------------------------
  const zone = $("#upload-zone");
  const input = $("#photo-input");
  let photoImg = null;

  $("#browse-btn").addEventListener("click", () => input.click());
  input.addEventListener("change", () => { if (input.files[0]) loadPhoto(input.files[0]); });

  ["dragover", "dragenter"].forEach((evName) =>
    zone.addEventListener(evName, (ev) => { ev.preventDefault(); zone.classList.add("dragover"); })
  );
  ["dragleave", "drop"].forEach((evName) =>
    zone.addEventListener(evName, (ev) => { ev.preventDefault(); zone.classList.remove("dragover"); })
  );
  zone.addEventListener("drop", (ev) => {
    const file = ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (file) loadPhoto(file);
  });

  function loadPhoto(file) {
    const img = new Image();
    img.onload = () => {
      photoImg = img;
      $("#photo-workbench").hidden = false;
      $("#photo-meta").textContent = `${file.name} — ${img.naturalWidth} × ${img.naturalHeight} px`;
      renderSizeTable();
      previewCrop(null);
    };
    img.src = URL.createObjectURL(file);
  }

  function renderSizeTable() {
    const recs = E.recommendSizes({ width: photoImg.naturalWidth, height: photoImg.naturalHeight });
    const rows = recs
      .map(
        (r) =>
          `<tr>
            <td>${r.label}${r.rotate ? " ⟳" : ""}</td>
            <td><span class="badge ${r.grade}">${r.grade}</span></td>
            <td>${r.effectiveDpi} DPI</td>
            <td>
              <button class="btn small" data-preview="${r.sizeId}">Preview</button>
              <button class="btn small primary" data-export="${r.sizeId}" ${r.printable ? "" : "disabled"}>Export PNG</button>
            </td>
          </tr>`
      )
      .join("");
    $("#size-table").innerHTML =
      `<table class="sizes"><thead><tr><th>Size</th><th>Quality</th><th>Effective</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
    $("#size-table").querySelectorAll("[data-preview]").forEach((btn) =>
      btn.addEventListener("click", () => previewCrop(btn.dataset.preview))
    );
    $("#size-table").querySelectorAll("[data-export]").forEach((btn) =>
      btn.addEventListener("click", () => exportPhoto(btn.dataset.export))
    );
  }

  function gradeFor(sizeId) {
    return E.gradePhotoForSize(
      { width: photoImg.naturalWidth, height: photoImg.naturalHeight },
      sizeId
    );
  }

  function previewCrop(sizeId) {
    const canvas = $("#crop-canvas");
    const ctx = canvas.getContext("2d");
    if (!sizeId) {
      canvas.width = photoImg.naturalWidth;
      canvas.height = photoImg.naturalHeight;
      ctx.drawImage(photoImg, 0, 0);
      return;
    }
    const rec = gradeFor(sizeId);
    const { crop } = rec;
    canvas.width = crop.width;
    canvas.height = crop.height;
    ctx.drawImage(photoImg, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  }

  function exportPhoto(sizeId) {
    const rec = gradeFor(sizeId);
    const size = E.getSize(sizeId);
    const dpi = Math.min(300, rec.effectiveDpi);
    const inches = rec.rotate ? [size.inches[1], size.inches[0]] : size.inches;
    const outW = Math.round(inches[0] * dpi);
    const outH = Math.round(inches[1] * dpi);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    const { crop } = rec;
    ctx.drawImage(photoImg, crop.x, crop.y, crop.width, crop.height, 0, 0, outW, outH);
    canvas.toBlob((blob) => {
      downloadBlob(blob, `photo-print-${sizeId}-${dpi}dpi.png`);
    }, "image/png");
  }

  // ---------------------------------------------------------------------------
  // Size guide
  // ---------------------------------------------------------------------------
  (function renderGuide() {
    const rows = E.listSizes()
      .map((s) => {
        const px300 = E.pixelsForSize(s, 300);
        const px150 = E.pixelsForSize(s, 150);
        const ratio = E.getRatio(s.ratioId);
        return `<tr>
          <td>${s.display}</td>
          <td>${ratio.label}</td>
          <td>${px300.width} × ${px300.height}</td>
          <td>${px150.width} × ${px150.height}</td>
        </tr>`;
      })
      .join("");
    $("#guide-table").innerHTML =
      `<table class="sizes"><thead><tr><th>Print size</th><th>Ratio</th><th>Pixels @ 300 DPI</th><th>Pixels @ 150 DPI</th></tr></thead><tbody>${rows}</tbody></table>`;
  })();
})();
