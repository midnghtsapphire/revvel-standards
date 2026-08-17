'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { parseCsv, rowsToProducts } from '../lib/csv';
import { styles } from './components/styles';
import LoginForm from './components/LoginForm';
import UploadSection from './components/UploadSection';
import BatchSection from './components/BatchSection';
import PacksSection from './components/PacksSection';

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
        setLoginError(data.error || 'Wrong password');
        return;
      }
      setNeedLogin(false);
    } catch (err) {
      setLoginError('Network error');
    }
  }

  function onFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setLogLine(`Parsing ${file.name}…`);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const rows = parseCsv(text);
        const prods = rowsToProducts(rows);
        setProducts(prods);
        // Reset pack/batch state so a second CSV upload starts clean instead
        // of leaking results and progress from the previous file.
        setPacks({});
        setBatchCursor(0);
        setBatchTotal(0);
        setLogLine(`Found ${prods.length} products. Ready to batch.`);
      } catch (err) {
        setLogLine(`Error parsing CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  const processOne = useCallback(async (prod) => {
    setPacks((prev) => ({
      ...prev,
      [prod.id]: { status: 'running', images: [], listing: '', error: null },
    }));

    try {
      // Keep the existing backend contract: POST /api/generate with
      // { title, asin, count } — there is no /api/process route.
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: prod.title,
          asin: prod.asin,
          count: 3,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'API fail');
      }

      setPacks((prev) => ({
        ...prev,
        [prod.id]: {
          // A response without images is a failed pack, not a success.
          status: data.images?.length ? 'done' : 'error',
          images: data.images || [],
          listing: data.listing || '',
          error: data.errors?.map((x) => x.message).join('; ') || null,
        },
      }));
      return Boolean(data.images?.length);
    } catch (err) {
      setPacks((prev) => ({
        ...prev,
        [prod.id]: {
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

    let slice = products.filter((p) => !packs[p.id] || packs[p.id].status === 'error');
    if (limit) slice = slice.slice(0, limit);

    if (!slice.length) {
      setLogLine('All current products are done!');
      return;
    }

    setBatchRunning(true);
    setBatchCursor(0);
    setBatchTotal(slice.length);
    stopRef.current = false;

    let ok = 0;
    for (let i = 0; i < slice.length; i++) {
      if (stopRef.current) break;
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
      <LoginForm
        doLogin={doLogin}
        password={password}
        setPassword={setPassword}
        loginError={loginError}
      />
    );
  }

  return (
    <main style={styles.wrap}>
      <h1 style={styles.h1}>Family order packs</h1>
      <p style={styles.sub}>
        Private tool for you and your family. Upload orders once, process a batch, download lifestyle
        pictures. Leave this tab open while it runs.
      </p>

      <UploadSection
        onFile={onFile}
        batchRunning={batchRunning}
        fileName={fileName}
        productsCount={products.length}
        doneCount={doneCount}
        errorCount={errorCount}
      />

      <BatchSection
        productsCount={products.length}
        batchRunning={batchRunning}
        batchCursor={batchCursor}
        batchTotal={batchTotal}
        runBatch={runBatch}
        stopBatch={stopBatch}
      />

      <div style={styles.status}>{logLine}</div>

      <PacksSection
        doneCount={doneCount}
        errorCount={errorCount}
        products={products}
        packs={packs}
        downloadListing={downloadListing}
        downloadImg={downloadImg}
      />

      <p style={{ fontSize: 13, color: '#555', marginTop: 24, lineHeight: 1.5 }}>
        Family-only. Bookmark this site. Your daughter only needs the password and this page — no
        PowerShell, no GitHub.
      </p>
    </main>
  );
}
