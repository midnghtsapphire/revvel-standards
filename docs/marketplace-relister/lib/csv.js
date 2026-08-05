/** Browser + server safe CSV helpers for Amazon order history. */

export function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export function normHeader(h) {
  return String(h || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function parseCsv(text) {
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map(normHeader);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function pick(row, names) {
  for (const n of names) {
    const k = normHeader(n);
    if (row[k]) return row[k];
  }
  for (const n of names) {
    const want = normHeader(n);
    for (const [k, v] of Object.entries(row)) {
      if (k.includes(want) && v) return v;
    }
  }
  return '';
}

export function extractAsin(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const fromUrl = s.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i);
  if (fromUrl) return fromUrl[1].toUpperCase();
  if (/^[A-Z0-9]{10}$/i.test(s)) return s.toUpperCase();
  const m = s.match(/\b([A-Z0-9]{10})\b/i);
  return m ? m[1].toUpperCase() : null;
}

export function rowsToProducts(rows) {
  return rows
    .map((row, i) => {
      const asin = extractAsin(pick(row, ['asin', 'asin/isbn', 'asin isbn', 'isbn']));
      const title =
        pick(row, ['title', 'product name', 'product title', 'item name']) ||
        (asin ? `Amazon product ${asin}` : null);
      if (!asin && !title) return null;
      const paid = parseFloat(
        String(pick(row, ['unit price', 'item total', 'total owed', 'price']) || '').replace(
          /[^0-9.-]/g,
          ''
        )
      );
      return {
        id: pick(row, ['order id', 'order number']) || `row-${i + 1}`,
        asin,
        title: (title || '').slice(0, 200),
        paid: Number.isFinite(paid) ? paid : 0,
        url: asin ? `https://www.amazon.com/dp/${asin}` : null,
      };
    })
    .filter(Boolean);
}
