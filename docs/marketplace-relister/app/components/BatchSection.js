import { styles } from './styles';

export default function BatchSection({
  productsCount,
  batchRunning,
  batchCursor,
  batchTotal,
  runBatch,
  stopBatch,
}) {
  return (
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
          disabled={!productsCount || batchRunning}
          onClick={() => runBatch(10)}
        >
          Process next 10
        </button>
        <button
          type="button"
          style={styles.btnPurple}
          disabled={!productsCount || batchRunning}
          onClick={() => runBatch(25)}
        >
          Process next 25
        </button>
        <button
          type="button"
          style={styles.btnGhost}
          disabled={!productsCount || batchRunning}
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
  );
}
