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
      // Button semantics so keyboard-only users can open print details.
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Open ${print.title} — ${print.genreLabel}, ${print.ratioLabel}`);
      card.innerHTML =
        `<div class="art">${print.svg}</div>` +
        `<div class="meta"><h3>${print.title}</h3><p>${print.genreLabel} · ${print.ratioLabel}</p></div>`;
      card.addEventListener("click", () => openModal(print));
      card.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openModal(print); }
      });
      grid.appendChild(card);
    });
  }

  renderGrid();

  // ---------------------------------------------------------------------------
  // Print detail modal + downloads
  // ---------------------------------------------------------------------------
  const modal = $("#modal");
  let currentPrint = null;
  let lastFocused = null;

  function closeModal() {
    modal.hidden = true;
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function openModal(print) {
    lastFocused = document.activeElement;
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
    // Move focus into the dialog so keyboard/screen-reader users land inside it.
    $("#modal-close").focus();
  }

  // Focus trap + Escape while the dialog is open.
  modal.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") { ev.preventDefault(); closeModal(); return; }
    if (ev.key !== "Tab") return;
    const focusable = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  });

  function updatePixelNote() {
    if (!currentPrint) return;
    const sizeId = $("#dl-size").value;
    const dpi = Number($("#dl-dpi").value);
    const px = E.pixelsForSize(sizeId, dpi);
    $("#dl-pixels").textContent = `PNG export: ${px.width} × ${px.height} px`;
  }

  $("#dl-size").addEventListener("change", updatePixelNote);
  $("#dl-dpi").addEventListener("change", updatePixelNote);
  $("#modal-close").addEventListener("click", closeModal);
  modal.addEventListener("click", (ev) => { if (ev.target === modal) closeModal(); });

  function downloadBlob(blob, filename) {
    if (!blob) {
      // toBlob() yields null when the browser fails to encode (typically a
      // canvas too large for available memory). Surface it rather than passing
      // null to createObjectURL (which throws) and leaving the user with nothing.
      window.alert("Export failed: the image was too large to encode in this browser. Try a smaller size or DPI.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // CRC-32 (PNG) — table-free, small. Used to checksum an inserted chunk.
  function crc32(bytes) {
    let c = ~0;
    for (let i = 0; i < bytes.length; i++) {
      c ^= bytes[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return (~c) >>> 0;
  }

  // Rewrite a PNG blob to carry a pHYs chunk declaring the real print DPI, so
  // print software reads the file as the selected physical size instead of the
  // browser's hard-coded 96 DPI. Resolves to a new Blob (or the original if it
  // isn't a parseable PNG). Pure client-side, no dependencies.
  async function pngWithDpi(blob, dpi) {
    try {
      const buf = new Uint8Array(await blob.arrayBuffer());
      const sig = [137, 80, 78, 71, 13, 10, 26, 10];
      for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) return blob;
      // IHDR is the first chunk: 8-byte sig + 4 len + "IHDR" + 13 data + 4 crc.
      const ihdrEnd = 8 + 4 + 4 + 13 + 4;
      const ppm = Math.round(dpi / 0.0254); // pixels per metre
      const data = new Uint8Array(9);
      const dv = new DataView(data.buffer);
      dv.setUint32(0, ppm); dv.setUint32(4, ppm); data[8] = 1; // unit: metre
      const type = new Uint8Array([0x70, 0x48, 0x59, 0x73]); // "pHYs"
      const chunk = new Uint8Array(4 + 4 + 9 + 4);
      const cdv = new DataView(chunk.buffer);
      cdv.setUint32(0, 9);
      chunk.set(type, 4);
      chunk.set(data, 8);
      const crcInput = new Uint8Array(4 + 9);
      crcInput.set(type, 0); crcInput.set(data, 4);
      cdv.setUint32(17, crc32(crcInput));
      const out = new Uint8Array(buf.length + chunk.length);
      out.set(buf.subarray(0, ihdrEnd), 0);
      out.set(chunk, ihdrEnd);
      out.set(buf.subarray(ihdrEnd), ihdrEnd + chunk.length);
      return new Blob([out], { type: "image/png" });
    } catch {
      return blob; // never block a download on the metadata step
    }
  }

  // Encode a canvas to PNG at the given DPI and download it. `filename` is
  // captured by the caller so a later modal/print change can't rename the file.
  function savePng(canvas, dpi, filename) {
    canvas.toBlob(async (blob) => {
      if (!blob) { downloadBlob(null); return; }
      downloadBlob(await pngWithDpi(blob, dpi), filename);
    }, "image/png");
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
    // Capture everything now — the user may open another print while the SVG
    // rasterizes, and the async toBlob callback must not read a changed global.
    const print = currentPrint;
    const sizeId = $("#dl-size").value;
    const dpi = Number($("#dl-dpi").value);
    const px = E.pixelsForSize(sizeId, dpi);
    const filename = `${slug(print.title)}-${sizeId}-${dpi}dpi.png`;
    const img = new Image();
    const svgBlob = new Blob([print.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = px.width;
      canvas.height = px.height;
      canvas.getContext("2d").drawImage(img, 0, 0, px.width, px.height);
      URL.revokeObjectURL(url);
      savePng(canvas, dpi, filename);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  });

  // ---------------------------------------------------------------------------
  // Your Photos — upload, grade, export
  // ---------------------------------------------------------------------------
  const zone = $("#upload-zone");
  const input = $("#photo-input");
  let photoImg = null;
  let photoLoadToken = 0; // ignore stale onload callbacks from earlier uploads

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
    const token = ++photoLoadToken;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url); // decoded image stays usable; free the blob URL
      if (token !== photoLoadToken) return; // a newer upload superseded this one
      photoImg = img;
      $("#photo-workbench").hidden = false;
      $("#photo-meta").textContent = `${file.name} — ${img.naturalWidth} × ${img.naturalHeight} px`;
      renderSizeTable();
      previewCrop(null);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
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

  // The preview is only ever shown a few hundred px wide, so cap the backing
  // canvas — a full-resolution phone photo would allocate hundreds of MB and
  // can freeze/crash the tab. The original photoImg is kept for export.
  const PREVIEW_MAX = 900;
  function previewScale(w, h) {
    const f = Math.min(1, PREVIEW_MAX / Math.max(w, h));
    return { w: Math.max(1, Math.round(w * f)), h: Math.max(1, Math.round(h * f)) };
  }

  function previewCrop(sizeId) {
    const canvas = $("#crop-canvas");
    const ctx = canvas.getContext("2d");
    if (!sizeId) {
      const d = previewScale(photoImg.naturalWidth, photoImg.naturalHeight);
      canvas.width = d.w;
      canvas.height = d.h;
      ctx.drawImage(photoImg, 0, 0, d.w, d.h);
      return;
    }
    const rec = gradeFor(sizeId);
    const { crop } = rec;
    const d = previewScale(crop.width, crop.height);
    canvas.width = d.w;
    canvas.height = d.h;
    ctx.drawImage(photoImg, crop.x, crop.y, crop.width, crop.height, 0, 0, d.w, d.h);
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
    savePng(canvas, dpi, `photo-print-${sizeId}-${dpi}dpi.png`);
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
