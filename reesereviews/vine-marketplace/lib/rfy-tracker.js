/**
 * vine-marketplace — RFY (Recommended For You) Watchlist Tracker
 *
 * Tracks items spotted in the Amazon Vine RFY feed that have not yet
 * been ordered — so you can measure miss-rate, conversion, and interest
 * alignment over time.
 *
 * Schema per entry:
 *   rfyId        string   — UUID-style unique ID (auto-generated)
 *   asin         string   — Amazon ASIN (if known)
 *   productTitle string
 *   estPrice     number|null  — estimated price shown in RFY
 *   category     string|null  — product category / tag
 *   notes        string|null  — freeform notes
 *   seenAt       string   — ISO 8601 when spotted in RFY feed
 *   status       string   — 'watching'|'ordered'|'missed'|'passed'
 *   orderId      string|null  — linked inventory orderId once ordered
 *   updatedAt    string|null  — ISO 8601 last status change
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const RFY_FILE = path.join(DATA_DIR, 'rfy-watchlist.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** Load the RFY watchlist from disk. */
function load() {
  if (!fs.existsSync(RFY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(RFY_FILE, 'utf8'));
  } catch {
    return [];
  }
}

/** Persist the RFY watchlist to disk. */
function save(list) {
  fs.writeFileSync(RFY_FILE, JSON.stringify(list, null, 2), 'utf8');
}

/** Generate a unique ID (8 random bytes → 16 hex chars). */
function genId() {
  return 'rfy-' + crypto.randomBytes(8).toString('hex');
}

/**
 * Add a new item to the RFY watchlist.
 *
 * @param {object} item
 * @param {string} item.productTitle
 * @param {string} [item.asin]
 * @param {number|null} [item.estPrice]
 * @param {string|null} [item.category]
 * @param {string|null} [item.notes]
 * @returns {object} the created entry
 */
function add(item) {
  if (!item.productTitle || !item.productTitle.trim()) {
    throw new Error('productTitle is required');
  }
  const list = load();
  const entry = {
    rfyId: genId(),
    asin: item.asin || null,
    productTitle: item.productTitle.trim(),
    estPrice: typeof item.estPrice === 'number' ? item.estPrice : null,
    category: item.category || null,
    notes: item.notes || null,
    seenAt: new Date().toISOString(),
    status: 'watching',
    orderId: null,
    updatedAt: null,
  };
  list.push(entry);
  save(list);
  return entry;
}

/** Get a single RFY entry by ID. Returns null if not found. */
function getById(rfyId) {
  return load().find((e) => e.rfyId === rfyId) || null;
}

/** Get all RFY entries, optionally filtered by status. */
function getAll(status = null) {
  const list = load();
  if (status) return list.filter((e) => e.status === status);
  return list;
}

const VALID_STATUSES = ['watching', 'ordered', 'missed', 'passed'];

/**
 * Update the status of an RFY entry.
 *
 * @param {string} rfyId
 * @param {'watching'|'ordered'|'missed'|'passed'} status
 * @param {string|null} [orderId]  — supply when status is 'ordered'
 * @returns {object} updated entry
 */
function updateStatus(rfyId, status, orderId = null) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status "${status}". Must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  const list = load();
  const idx = list.findIndex((e) => e.rfyId === rfyId);
  if (idx === -1) throw new Error(`RFY entry ${rfyId} not found`);
  list[idx] = {
    ...list[idx],
    status,
    orderId: status === 'ordered' ? (orderId || list[idx].orderId) : list[idx].orderId,
    updatedAt: new Date().toISOString(),
  };
  save(list);
  return list[idx];
}

/**
 * Update freeform notes on an RFY entry.
 *
 * @param {string} rfyId
 * @param {string} notes
 * @returns {object} updated entry
 */
function updateNotes(rfyId, notes) {
  const list = load();
  const idx = list.findIndex((e) => e.rfyId === rfyId);
  if (idx === -1) throw new Error(`RFY entry ${rfyId} not found`);
  list[idx] = { ...list[idx], notes, updatedAt: new Date().toISOString() };
  save(list);
  return list[idx];
}

/** Remove an RFY entry permanently. */
function remove(rfyId) {
  const list = load();
  const idx = list.findIndex((e) => e.rfyId === rfyId);
  if (idx === -1) throw new Error(`RFY entry ${rfyId} not found`);
  list.splice(idx, 1);
  save(list);
}

/**
 * Compute RFY-specific summary stats.
 *
 * @returns {{
 *   totalRFY: number,
 *   rfyWatching: number,
 *   rfyOrdered: number,
 *   rfyMissed: number,
 *   rfyPassed: number,
 *   rfyConversionRate: number,
 * }}
 */
function getSummary() {
  const list = load();
  const totalRFY = list.length;
  const rfyWatching = list.filter((e) => e.status === 'watching').length;
  const rfyOrdered = list.filter((e) => e.status === 'ordered').length;
  const rfyMissed = list.filter((e) => e.status === 'missed').length;
  const rfyPassed = list.filter((e) => e.status === 'passed').length;
  const decided = rfyOrdered + rfyMissed + rfyPassed;
  const rfyConversionRate = decided > 0
    ? parseFloat((rfyOrdered / decided).toFixed(4))
    : 0;

  return {
    totalRFY,
    rfyWatching,
    rfyOrdered,
    rfyMissed,
    rfyPassed,
    rfyConversionRate,
  };
}

module.exports = {
  add,
  getById,
  getAll,
  updateStatus,
  updateNotes,
  remove,
  getSummary,
  VALID_STATUSES,
};
