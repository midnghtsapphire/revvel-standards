//! Evidence capture: raw response bytes stored content-addressed under
//! `<dir>/objects/<sha256>.bin`, plus an append-only JSON-lines manifest
//! (`<dir>/manifest.jsonl`) whose entries form a SHA-256 hash chain.
//!
//! `entry_hash = sha256(canonical JSON of every field except entry_hash)`,
//! and each entry's `prev_hash` is the previous entry's `entry_hash`
//! (64 zeros for the first). Editing, deleting, or reordering any line, or
//! altering any stored object, makes [`verify_manifest`] fail.

use std::path::{Path, PathBuf};

use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tokio::io::AsyncWriteExt;
use tokio::sync::Mutex;
use url::Url;

pub const GENESIS_HASH: &str = "0000000000000000000000000000000000000000000000000000000000000000";
pub const MANIFEST_FILE: &str = "manifest.jsonl";
pub const OBJECTS_DIR: &str = "objects";

pub fn sha256_hex(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

/// Every hashed field of a manifest line, in canonical (declaration) order.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EntryBody {
    pub seq: u64,
    /// UTC capture time, RFC 3339 with milliseconds.
    pub utc: String,
    pub method: String,
    /// Requested URL (credential-like query parameters redacted).
    pub url: String,
    /// URL after redirects (same redaction).
    pub final_url: String,
    pub status: u16,
    pub request_body_sha256: Option<String>,
    pub sha256: String,
    pub bytes: u64,
    /// Path of the stored object relative to the evidence dir.
    pub file: String,
    pub prev_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ManifestEntry {
    #[serde(flatten)]
    pub body: EntryBody,
    pub entry_hash: String,
}

impl EntryBody {
    pub fn hash(&self) -> String {
        // Struct fields serialise in declaration order, so this is stable.
        let canonical = serde_json::to_vec(self).expect("EntryBody always serialises");
        sha256_hex(&canonical)
    }
}

/// Redact query parameters whose names look like credentials, so the
/// manifest never stores a secret even if one was passed in a URL.
pub fn redact_url(url: &Url) -> String {
    const SENSITIVE: [&str; 7] = [
        "token",
        "key",
        "sig",
        "secret",
        "password",
        "access_token",
        "subscription",
    ];
    if url.query().is_none() {
        return url.to_string();
    }
    let mut out = url.clone();
    let pairs: Vec<(String, String)> = url
        .query_pairs()
        .map(|(k, v)| {
            let lk = k.to_ascii_lowercase();
            if SENSITIVE.iter().any(|s| lk.contains(s)) {
                (k.into_owned(), "REDACTED".to_string())
            } else {
                (k.into_owned(), v.into_owned())
            }
        })
        .collect();
    out.query_pairs_mut().clear().extend_pairs(pairs);
    out.to_string()
}

#[derive(Debug)]
struct ChainState {
    next_seq: u64,
    last_hash: String,
}

/// Append-only evidence log. Safe to share across concurrent requests.
#[derive(Debug)]
pub struct EvidenceLog {
    dir: PathBuf,
    state: Mutex<ChainState>,
}

/// What a single capture needs to know.
pub struct Capture<'a> {
    pub method: &'a str,
    pub url: &'a Url,
    pub final_url: &'a Url,
    pub status: u16,
    pub request_body: Option<&'a [u8]>,
    pub body: &'a [u8],
}

impl EvidenceLog {
    /// Open (or create) an evidence directory. An existing manifest is fully
    /// verified first; we refuse to extend a broken chain.
    pub async fn open(dir: impl AsRef<Path>) -> Result<Self> {
        let dir = dir.as_ref().to_path_buf();
        tokio::fs::create_dir_all(dir.join(OBJECTS_DIR))
            .await
            .with_context(|| format!("creating evidence dir {}", dir.display()))?;
        let manifest = dir.join(MANIFEST_FILE);
        let state = if tokio::fs::try_exists(&manifest).await? {
            let report = verify_manifest(&dir, true).with_context(|| {
                format!(
                    "existing manifest {} failed verification",
                    manifest.display()
                )
            })?;
            ChainState {
                next_seq: report.entries,
                last_hash: report.last_hash,
            }
        } else {
            ChainState {
                next_seq: 0,
                last_hash: GENESIS_HASH.to_string(),
            }
        };
        Ok(Self {
            dir,
            state: Mutex::new(state),
        })
    }

    pub fn dir(&self) -> &Path {
        &self.dir
    }

    /// Store the body and append one chained manifest line.
    pub async fn record(&self, c: Capture<'_>) -> Result<ManifestEntry> {
        let sha = sha256_hex(c.body);
        let rel = format!("{OBJECTS_DIR}/{sha}.bin");
        let path = self.dir.join(&rel);
        if !tokio::fs::try_exists(&path).await? {
            // Write to a temp name then rename, so a crash never leaves a
            // truncated object under its content hash.
            static TMP_COUNTER: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
            let n = TMP_COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            let tmp = self.dir.join(format!(
                "{OBJECTS_DIR}/.{sha}.{}.{n}.tmp",
                std::process::id()
            ));
            tokio::fs::write(&tmp, c.body).await?;
            tokio::fs::rename(&tmp, &path).await?;
        }

        let mut st = self.state.lock().await;
        let body = EntryBody {
            seq: st.next_seq,
            utc: chrono::Utc::now()
                .format("%Y-%m-%dT%H:%M:%S%.3fZ")
                .to_string(),
            method: c.method.to_string(),
            url: redact_url(c.url),
            final_url: redact_url(c.final_url),
            status: c.status,
            request_body_sha256: c.request_body.map(sha256_hex),
            sha256: sha,
            bytes: c.body.len() as u64,
            file: rel,
            prev_hash: st.last_hash.clone(),
        };
        let entry = ManifestEntry {
            entry_hash: body.hash(),
            body,
        };
        let mut line = serde_json::to_vec(&entry)?;
        line.push(b'\n');
        let mut f = tokio::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(self.dir.join(MANIFEST_FILE))
            .await?;
        f.write_all(&line).await?;
        f.sync_data().await?;
        st.next_seq += 1;
        st.last_hash = entry.entry_hash.clone();
        Ok(entry)
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct VerifyReport {
    pub entries: u64,
    pub last_hash: String,
}

/// Verify the whole chain. With `check_objects`, also re-hash every stored
/// object and compare it with the manifest.
pub fn verify_manifest(dir: impl AsRef<Path>, check_objects: bool) -> Result<VerifyReport> {
    let dir = dir.as_ref();
    let text = std::fs::read_to_string(dir.join(MANIFEST_FILE))
        .with_context(|| format!("reading {}", dir.join(MANIFEST_FILE).display()))?;
    let mut prev = GENESIS_HASH.to_string();
    let mut n: u64 = 0;
    for (i, line) in text.lines().enumerate() {
        let lineno = i + 1;
        if line.trim().is_empty() {
            bail!("line {lineno}: blank line inside append-only manifest");
        }
        let e: ManifestEntry = serde_json::from_str(line)
            .with_context(|| format!("line {lineno}: not a manifest entry"))?;
        if e.body.seq != n {
            bail!("line {lineno}: seq {} but expected {n}", e.body.seq);
        }
        if e.body.prev_hash != prev {
            bail!("line {lineno}: prev_hash does not match previous entry_hash (chain broken)");
        }
        let recomputed = e.body.hash();
        if recomputed != e.entry_hash {
            bail!("line {lineno}: entry_hash mismatch (entry was altered)");
        }
        if check_objects {
            if e.body.file.contains("..") || Path::new(&e.body.file).is_absolute() {
                bail!("line {lineno}: object path escapes evidence dir");
            }
            let bytes = std::fs::read(dir.join(&e.body.file))
                .with_context(|| format!("line {lineno}: missing object {}", e.body.file))?;
            if sha256_hex(&bytes) != e.body.sha256 || bytes.len() as u64 != e.body.bytes {
                bail!(
                    "line {lineno}: object {} does not match recorded sha256/bytes",
                    e.body.file
                );
            }
        }
        prev = e.entry_hash;
        n += 1;
    }
    if !text.is_empty() && !text.ends_with('\n') {
        bail!("manifest does not end with a newline (truncated write?)");
    }
    Ok(VerifyReport {
        entries: n,
        last_hash: prev,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redacts_credential_like_params() {
        let u = Url::parse("https://h/x?a=1&api_key=s3cret&Token=t&sig=z").unwrap();
        let r = redact_url(&u);
        assert!(
            !r.contains("s3cret") && !r.contains("=t&") && !r.ends_with("=z"),
            "{r}"
        );
        assert!(r.contains("a=1"));
    }
}
