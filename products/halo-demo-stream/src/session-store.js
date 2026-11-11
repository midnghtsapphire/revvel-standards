// File-backed session store: one JSON file per session id.
//
// This is the "persistent state sync / session resume" half of the WR
// (labelled A2UI-style in the WR text). A session survives server restarts
// and can be loaded by any client that knows the session id, which is what
// "resume on a second device" means here. Postgres is optional and not
// needed for this slice; swap this class for a Postgres one behind the same
// load()/save() contract if the products get a database.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const SESSION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export class SessionStore {
  constructor(dir) {
    this.dir = dir;
    this.locks = new Map();
  }

  file(id) {
    if (!SESSION_ID_RE.test(id)) throw new Error('invalid session id');
    return path.join(this.dir, `${id}.json`);
  }

  /** @returns {Promise<null | {sessionId: string, revision: number, updatedAt: string, state: object}>} */
  async load(id) {
    try {
      return JSON.parse(await readFile(this.file(id), 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  /** Atomic write: temp file then rename, so a crash never leaves half a session. */
  async save(record) {
    await mkdir(this.dir, { recursive: true });
    const target = this.file(record.sessionId);
    const tmp = `${target}.${process.pid}.tmp`;
    await writeFile(tmp, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    await rename(tmp, target);
  }

  /** Serialise work per session so two devices cannot interleave a run. */
  async withLock(id, fn) {
    const prev = this.locks.get(id) ?? Promise.resolve();
    let release;
    const gate = new Promise((r) => { release = r; });
    this.locks.set(id, prev.then(() => gate));
    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (this.locks.get(id) === gate) this.locks.delete(id);
    }
  }
}
