'use client';

import { useMemo, useState } from 'react';
import { parseCsv, rowsToProducts } from '../lib/csv';

export default function Page() {
  const [products, setProducts] = useState([]);
  const [index, setIndex] = useState(0);
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState('Upload your Amazon order CSV (or try sample).');
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState([]);
  const [images, setImages] = useState([]);
  const [listing, setListing] = useState('');
  const [error, setError] = useState('');

  const current = products[index] || null;

  function loadText(text, name) {
    const rows = parseCsv(text);
    const list = rowsToProducts(rows);
    if (!list.length) {
      setError('No products found. Need columns like Product Name and ASIN.');
      setProducts([]);
      return;
    }
    setError('');
    setProducts(list);
    setIndex(0);
    setFileName(name || `${list.length} products`);
    setImages([]);
    setListing('');
    setSteps([]);
    setStatus(`Loaded ${list.length} products. Showing #1. Press Generate.`);
  }

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => loadText(String(reader.result || ''), f.name);
    reader.readAsText(f);
  }

  function loadSample() {
    const sample = [
      'Order ID,Order Date,Product Name,ASIN,Unit Price,Quantity',
      '111-1,2024-01-01,Slim 4-Tier Kitchen Storage Cart Black Brown,B0CGHRRN17,59.99,1',
      '111-2,2024-01-02,Crystal Bracelet Rose Gold Sample,B0GV3N5QNY,18.99,1',
      '111-3,2024-01-03,Panda Building Blocks Set Sample,B0GKP3292D,49.89,1',
    ].join('\n');
    loadText(sample, 'sample.csv');
  }

  async function generate() {
    if (!current) return;
    setBusy(true);
    setError('');
    setImages([]);
    setListing('');
    setSteps([
      { t: '1. Read this product from your list', s: 'done' },
      { t: '2. Sending to image generator…', s: 'run' },
      { t: '3. Making 3 lifestyle pictures', s: 'wait' },
      { t: '4. Show you the results', s: 'wait' },
    ]);
    setStatus(`Working on product ${index + 1} of ${products.length}…`);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: current.title,
          asin: current.asin,
          count: 3,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSteps((prev) =>
          prev.map((x, i) =>
            i === 1 ? { ...x, s: 'err', t: data.error || 'Failed' } : x
          )
        );
        setError(data.error || 'Generation failed');
        setStatus('Stopped — see error below.');
        return;
      }
      setSteps([
        { t: '1. Read this product from your list', s: 'done' },
        { t: '2. Sent to image generator', s: 'done' },
        {
          t: `3. Made ${data.images?.length || 0} lifestyle pictures`,
          s: data.images?.length ? 'done' : 'err',
        },
        { t: '4. Ready — download what you like', s: 'done' },
      ]);
      setImages(data.images || []);
      setListing(data.listing || '');
      setStatus(
        data.images?.length
          ? `Done — ${data.images.length} pictures for this product. Download them, then Next.`
          : 'Finished but no pictures returned.'
      );
      if (data.errors?.length) {
        setError(data.errors.map((e) => `#${e.index}: ${e.message}`).join(' · '));
      }
    } catch (err) {
      setError(err.message || 'Network error');
      setStatus('Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  function downloadImage(url, n) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${current?.asin || 'product'}-lifestyle-${n}.jpg`;
    a.click();
  }

  const stepColor = useMemo(
    () => ({ done: '#3dd68c', run: '#8b7cf7', wait: '#666', err: '#ff6b7a' }),
    []
  );

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 16px 64px' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>My orders → lifestyle pics</h1>
      <p style={{ color: '#a0a0b8', marginBottom: 20, lineHeight: 1.5 }}>
        One page. Upload your Amazon order CSV. Pick a product. Get 3 real-life style images
        (not stock). Download them. Next product when you want.
      </p>

      <div
        style={{
          background: '#14141f',
          border: '1px solid #2a2a3d',
          borderRadius: 14,
          padding: 18,
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 12, color: '#a0a0b8', marginBottom: 10, textTransform: 'uppercase' }}>
          Step 1 · Your file
        </div>
        <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={busy} />
        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={loadSample} disabled={busy} style={btnGhost}>
            Or try with 3 sample products
          </button>
        </div>
        {fileName ? (
          <p style={{ marginTop: 10, fontSize: 13, color: '#a89cff' }}>{fileName}</p>
        ) : null}
      </div>

      <div
        style={{
          background: '#0f1a14',
          border: '1px solid #1f3d2e',
          borderRadius: 12,
          padding: 12,
          marginBottom: 14,
          fontSize: 14,
        }}
      >
        <strong style={{ color: '#3dd68c' }}>Status:</strong> {status}
      </div>

      {current ? (
        <div
          style={{
            background: '#14141f',
            border: '1px solid #2a2a3d',
            borderRadius: 14,
            padding: 18,
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 12, color: '#a0a0b8', marginBottom: 10, textTransform: 'uppercase' }}>
            Step 2 · Product {index + 1} of {products.length}
          </div>
          <h2 style={{ fontSize: '1.05rem', marginBottom: 8 }}>{current.title}</h2>
          <p style={{ fontSize: 13, color: '#a0a0b8', marginBottom: 14 }}>
            {current.asin ? `ASIN ${current.asin}` : 'No ASIN'}
            {current.paid ? ` · paid $${current.paid.toFixed(2)}` : ''}
          </p>

          <button type="button" onClick={generate} disabled={busy} style={btnMain}>
            {busy ? 'Working… watch the steps below' : 'Generate 3 lifestyle pictures'}
          </button>

          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={busy || index <= 0}
              onClick={() => {
                setIndex((i) => i - 1);
                setImages([]);
                setListing('');
                setSteps([]);
                setStatus(`Product ${index} of ${products.length}`);
              }}
              style={btnGhost}
            >
              ← Prev
            </button>
            <button
              type="button"
              disabled={busy || index >= products.length - 1}
              onClick={() => {
                setIndex((i) => i + 1);
                setImages([]);
                setListing('');
                setSteps([]);
                setStatus(`Product ${index + 2} of ${products.length}`);
              }}
              style={btnGhost}
            >
              Next product →
            </button>
          </div>

          {steps.length ? (
            <div style={{ marginTop: 16 }}>
              {steps.map((s, i) => (
                <div key={i} style={{ color: stepColor[s.s] || '#aaa', padding: '4px 0', fontSize: 14 }}>
                  {s.s === 'done' ? '✓' : s.s === 'run' ? '◎' : s.s === 'err' ? '✗' : '○'} {s.t}
                </div>
              ))}
            </div>
          ) : null}

          {error ? (
            <p style={{ marginTop: 12, color: '#ff6b7a', fontSize: 14 }}>{error}</p>
          ) : null}

          {images.length ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: '#a0a0b8', marginBottom: 8 }}>Your pictures · click download</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {images.map((im) => (
                  <div key={im.index} style={{ textAlign: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={im.url}
                      alt={`Lifestyle ${im.index}`}
                      style={{
                        width: 160,
                        height: 200,
                        objectFit: 'cover',
                        borderRadius: 10,
                        background: '#222',
                        display: 'block',
                      }}
                    />
                    <button
                      type="button"
                      style={{ ...btnGhost, marginTop: 6, width: '100%' }}
                      onClick={() => downloadImage(im.url, im.index)}
                    >
                      Download {im.index}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {listing ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: '#a0a0b8', marginBottom: 6 }}>Listing text</div>
              <textarea
                readOnly
                value={listing}
                style={{
                  width: '100%',
                  minHeight: 100,
                  background: '#0a0a10',
                  border: '1px solid #2a2a3d',
                  borderRadius: 10,
                  color: '#f4f4ff',
                  padding: 10,
                  fontSize: 13,
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <p style={{ fontSize: 13, color: '#666', marginTop: 20 }}>
        No local install. Images download to your computer when you click Download.
        One OpenRouter key is set on the server once — you never paste it here.
      </p>
    </main>
  );
}

const btnMain = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  border: 'none',
  background: '#3dd68c',
  color: '#042',
  fontWeight: 700,
  fontSize: 16,
  cursor: 'pointer',
};

const btnGhost = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #2a2a3d',
  background: '#1a1a28',
  color: '#f4f4ff',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
};
