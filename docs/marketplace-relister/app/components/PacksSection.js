import { styles } from './styles';

export default function PacksSection({
  doneCount,
  errorCount,
  products,
  packs,
  downloadListing,
  downloadImg,
}) {
  return (
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
  );
}
