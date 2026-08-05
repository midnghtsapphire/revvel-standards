import Fuse from 'fuse.js';
import type { ParsedRow } from './parser';

export interface DedupeStats {
  original: number;
  duplicatesRemoved: number;
  exactEmail: number;
  exactPhone: number;
  fuzzyName: number;
  remaining: number;
}

function normEmail(v: string) {
  return (v || '').trim().toLowerCase();
}
function normPhone(v: string) {
  return (v || '').replace(/\D/g, '');
}
function normName(v: string) {
  return (v || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function findField(row: ParsedRow, candidates: string[]): string {
  for (const key of Object.keys(row)) {
    if (candidates.some(c => key.toLowerCase().includes(c))) {
      return row[key];
    }
  }
  return '';
}

export function dedupe(rows: ParsedRow[]): { cleaned: ParsedRow[]; stats: DedupeStats } {
  const seenEmail = new Set<string>();
  const seenPhone = new Set<string>();
  const seenName = new Set<string>();
  let exactEmail = 0, exactPhone = 0, fuzzyName = 0;

  // Pass 1: exact email/phone
  const pass1: ParsedRow[] = [];
  for (const row of rows) {
    const email = normEmail(findField(row, ['email']));
    const phone = normPhone(findField(row, ['phone', 'mobile', 'cell', 'tel']));

    if (email && seenEmail.has(email)) { exactEmail++; continue; }
    if (phone && seenPhone.has(phone)) { exactPhone++; continue; }

    if (email) seenEmail.add(email);
    if (phone) seenPhone.add(phone);
    pass1.push(row);
  }

  // Pass 2: fuzzy name
  const nameField = (row: ParsedRow) => {
    const first = findField(row, ['first']);
    const last = findField(row, ['last']);
    const full = findField(row, ['name']);
    return normName(`${first} ${last}`.trim() || full);
  };

  const withNames = pass1.map(r => ({ row: r, name: nameField(r) }));
  const cleaned: ParsedRow[] = [];
  const accepted: { name: string }[] = [];
  const fuse = new Fuse(accepted, { keys: ['name'], threshold: 0.15, includeScore: true });

  for (const item of withNames) {
    if (!item.name) { cleaned.push(item.row); continue; }
    if (seenName.has(item.name)) { fuzzyName++; continue; }
    const matches = fuse.search(item.name);
    if (matches.length > 0 && (matches[0].score ?? 1) < 0.1) {
      fuzzyName++;
      continue;
    }
    seenName.add(item.name);
    accepted.push({ name: item.name });
    fuse.setCollection(accepted);
    cleaned.push(item.row);
  }

  return {
    cleaned,
    stats: {
      original: rows.length,
      duplicatesRemoved: rows.length - cleaned.length,
      exactEmail,
      exactPhone,
      fuzzyName,
      remaining: cleaned.length,
    },
  };
}
