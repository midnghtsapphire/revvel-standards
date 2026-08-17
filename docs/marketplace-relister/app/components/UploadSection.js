import { styles } from './styles';

export default function UploadSection({
  onFile,
  batchRunning,
  fileName,
  productsCount,
  doneCount,
  errorCount,
}) {
  return (
    <section style={styles.card}>
      <div style={styles.label}>1 · Upload Amazon order CSV</div>
      <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={batchRunning} />
      {fileName ? (
        <p style={{ marginTop: 10, color: '#a89cff', fontSize: 14 }}>
          {fileName} · {productsCount} products · {doneCount} packs ready
          {errorCount ? ` · ${errorCount} errors` : ''}
        </p>
      ) : null}
    </section>
  );
}
