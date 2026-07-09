'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { parseCsv, rowsToProducts } from '../lib/csv';

/**
 * Private family batch app:
 * 1) Login once
 * 2) Upload CSV once
 * 3) Process batch (auto walks products)
 * 4) Download images per product
 */
export default function Page() {
  const [needLogin, setNeedLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [products, setProducts] = useState([]);
  const [fileName, setFileName] = useState('');
  const [packs, setPacks] = useState({}); // id -> { status, images, listing, error }
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchCursor, setBatchCursor] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [logLine, setLogLine] = useState('Upload your Amazon order CSV to begin.');
  const stopRef = useRef(false);

  useEffect(() => {
    fetch('/api/session')
      .then((r) => r.json())
      .then((d) => {
        if (d.open) {
          setNeedLogin(false);
          return;
        }
        setNeedLogin(!d.ok);
      })
      .catch(() => setNeedLogin(false));
  }, []);

  async function doLogin(e) {
    e?.preventDefault?.();
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Login failed');
        return;
      }
      setNeedLogin(false);
      setLogLine('Logged in. Upload your order CSV.');
    } catch (err) {
      setLoginError(err.message);
    }
  }

  function loadText(text, name) {
    const rows = parseCsv(text);
    const list = rowsToProducts(rows);
    if (!list.length) {
      setLogLine('No products found — need Product Name / ASIN columns.');
      return;
    }
    setProducts(list);
    setFileName(name || `${list.length} products`);
    setPacks({});
    setBatchCursor(0);
    setBatchTotal(0);
    setLogLine(`Loaded ${list.length} products. Press “Process batch” when ready.`);
  }

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => loadText(String(reader.result || ''), f.name);
    reader.readAsText(f);
  }

  const processOne = useCallback(async (product) => {
    setPacks((prev) => ({
      ...prev,
      [product.id]: { status: 'running', images: [], listing: '', error: '' },
    }));
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: product.title,
          asin: product.asin,
          count: 3,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPacks((prev) => ({
          ...prev,
          [product.id]: {
            status: 'error',
            images: [],
            listing: '',
            error: data.error || 'Failed',
          },
        }));
        return false;
      }
      setPacks((prev) => ({
        ...prev,
        [product.id]: {
          status: data.images?.length ? 'done' : 'error',
          images: data.images || [],
          listing: data.listing || '',
          error: data.errors?.map((x) => x.message).join('; ') || '',
        },
      }));
      return Boolean(data.images?.length);
    } catch (err) {
      setPacks((prev) => ({
        ...prev,
        [product.id]: {
          status: 'error',
          images: [],
          listing: '',
          error: err.message,
        },
      }));
      return false;
    }
  }, []);

  async function runBatch(limit) {
    if (!products.length || batchRunning) return;
    stopRef.current = false;
    setBatchRunning(true);

    // Only process products not already done
    const pending = products.filter((p) => packs[p.id]?.status !== 'done');
    const slice = typeof limit === 'number' ? pending.slice(0, limit) : pending;
    setBatchTotal(slice.length);
    setBatchCursor(0);
    setLogLine(`Processing ${slice.length} products in the background of this tab…`);

    let ok = 0;
    for (let i = 0; i < slice.length; i++) {
      if (stopRef.current) {
        setLogLine(`Stopped. Finished ${ok} packs. You can resume anytime.`);
        break;
      }
      setBatchCursor(i + 1);
      setLogLine(`Working ${i + 1} of ${slice.length}: ${slice[i].title.slice(0, 60)}…`);
      const success = await processOne(slice[i]);
      if (success) ok += 1;
    }

    setBatchRunning(false);
    if (!stopRef.current) {
      setLogLine(`Batch finished. ${ok} of ${slice.length} packs ready. Scroll down to download.`);
    }
  }

  function stopBatch() {
    stopRef.current = true;
    setLogLine('Stopping after current product…');
  }

  function downloadImg(url, asin, n) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${asin || 'item'}-lifestyle-${n}.jpg`;
    a.click();
  }

  function downloadListing(text, asin) {
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${asin || 'item'}-listing.txt`;
    a.click();
  }

  const doneCount = Object.values(packs).filter((p) => p.status === 'done').length;
  const errorCount = Object.values(packs).filter((p) => p.status === 'error').length;

  if (needLogin) {
    return (
      <main style={styles.wrap}>
        <h1 style={styles.h1}>Family order packs</h1>
        <p style={styles.sub}>Private. Enter the family password.</p>
        <form onSubmit={doLogin} style={styles.card}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={styles.input}
            autoFocus
          />
          <button type="submit" style={styles.btnGreen}>
            Open app
          </button>
          {loginError ? <p style={styles.err}>{loginError}</p> : null}
        </form>
      </main>
    );
  }

  return (
    <main style={styles.wrap}>
      <h1 style={styles.h1}>Family order packs</h1>
      <p style={styles.sub}>
        Private tool for you and your family. Upload orders once, process a batch, download lifestyle
        pictures. Leave this tab open while it runs.
      </p>

      <section style={styles.card}>
        <div style={styles.label}>1 · Upload Amazon order CSV</div>
        <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={batchRunning} />
        {fileName ? (
          <p style={{ marginTop: 10, color: '#a89cff', fontSize: 14 }}>
            {fileName} · {products.length} products · {doneCount} packs ready
            {errorCount ? ` · ${errorCount} errors` : ''}
          </p>
        ) : null}
      </section>

      <section style={styles.card}>
        <div style={styles.label}>2 · Run a batch</div>
        <p style={{ color: '#a0a0b8', fontSize: 14, marginBottom: 12 }}>
          The app walks products for you (not one manual click each). Start with 10 if you want a
          shorter run.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button
            type="button"
            style={styles.btnGreen}
            disabled={!products.length || batchRunning}
            onClick={() => runBatch(10)}
          >
            Process next 10
          </button>
          <button
            type="button"
            style={styles.btnPurple}
            disabled={!products.length || batchRunning}
            onClick={() => runBatch(25)}
          >
            Process next 25
          </button>
          <button
            type="button"
            style={styles.btnGhost}
            disabled={!products.length || batchRunning}
            onClick={() => runBatch(null)}
          >
            Process all remaining
          </button>
          {batchRunning ? (
            <button type="button" style={styles.btnStop} onClick={stopBatch}>
              Stop after this one
            </button>
          ) : null}
        </div>
        {batchRunning || batchTotal ? (
          <div style={{ marginTop: 14 }}>
            <div style={styles.barBg}>
              <div
                style={{
                  ...styles.barFill,
                  width: batchTotal ? `${Math.round((batchCursor / batchTotal) * 100)}%` : '0%',
                }}
              />
            </div>
            <p style={{ fontSize: 13, color: '#a89cff', marginTop: 8 }}>
              {batchRunning
                ? `Running ${batchCursor} / ${batchTotal}`
                : `Last batch: ${batchCursor} / ${batchTotal}`}
            </p>
          </div>
        ) : null}
      </section>

      <div style={styles.status}>{logLine}</div>

      <section style={styles.card}>
        <div style={styles.label}>3 · Packs ready to download</div>
        {!doneCount && !errorCount ? (
          <p style={{ color: '#666', fontSize: 14 }}>Nothing yet — run a batch above.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {products
              .filter((p) => packs[p.id])
              .map((p) => {
                const pack = packs[p.id];
                return (
                  <div key={p.id} style={styles.packRow}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: '#a0a0b8' }}>
                        {p.asin || 'no ASIN'} ·{' '}
                        <span
                          style={{
                            color:
                              pack.status === 'done'
                                ? '#3dd68c'
                                : pack.status === 'running'
                                  ? '#8b7cf7'
                                  : '#ff6b7a',
                          }}
                        >
                          {pack.status}
                        </span>
                        {pack.error ? ` · ${pack.error}` : ''}
                      </div>
                      {pack.listing ? (
                        <button
                          type="button"
                          style={{ ...styles.btnGhost, marginTop: 8 }}
                          onClick={() => downloadListing(pack.listing, p.asin)}
                        >
                          Download listing.txt
                        </button>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {(pack.images || []).map((im) => (
                        <div key={im.index}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={im.url}
                            alt=""
                            style={{
                              width: 96,
                              height: 120,
                              objectFit: 'cover',
                              borderRadius: 8,
                              display: 'block',
                              background: '#222',
                            }}
                          />
                          <button
                            type="button"
                            style={{ ...styles.btnGhost, width: '100%', marginTop: 4, fontSize: 11 }}
                            onClick={() => downloadImg(im.url, p.asin, im.index)}
                          >
                            Save {im.index}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      <p style={{ fontSize: 13, color: '#555', marginTop: 24, lineHeight: 1.5 }}>
        Family-only. Bookmark this site. Your daughter only needs the password and this page — no
        PowerShell, no GitHub.
      </p>
    </main>
  );
}

const styles = {
  wrap: { maxWidth: 880, margin: '0 auto', padding: '28px 16px 72px' },
  h1: { fontSize: '1.55rem', marginBottom: 8 },
  sub: { color: '#a0a0b8', marginBottom: 20, lineHeight: 1.5, fontSize: 15 },
  card: {
    background: '#14141f',
    border: '1px solid #2a2a3d',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    color: '#a0a0b8',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 12,
  },
  status: {
    background: '#0f1a14',
    border: '1px solid #1f3d2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    fontSize: 14,
    color: '#c8f0d8',
  },
  packRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 14,
    padding: 12,
    borderRadius: 12,
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid #2a2a3d',
  },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    border: '1px solid #2a2a3d',
    background: '#0a0a10',
    color: '#fff',
    marginBottom: 10,
    fontSize: 16,
  },
  btnGreen: {
    padding: '12px 16px',
    borderRadius: 12,
    border: 'none',
    background: '#3dd68c',
    color: '#042',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
  },
  btnPurple: {
    padding: '12px 16px',
    borderRadius: 12,
    border: 'none',
    background: '#7c6af7',
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
  },
  btnGhost: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #2a2a3d',
    background: '#1a1a28',
    color: '#f4f4ff',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  },
  btnStop: {
    padding: '12px 16px',
    borderRadius: 12,
    border: 'none',
    background: '#ff6b7a',
    color: '#1a0000',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
  },
  barBg: {
    height: 10,
    borderRadius: 999,
    background: '#222',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    background: 'linear-gradient(90deg,#7c6af7,#3dd68c)',
    transition: 'width 0.3s',
  },
  err: { color: '#ff6b7a', marginTop: 10 },
};
