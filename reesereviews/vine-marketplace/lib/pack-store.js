/**
 * Marketplace pack storage on the owner's machine.
 *
 * Default: ~/Documents/MarketplacePacks/{asin-or-orderId}/
 * Override: MARKETPLACE_PACKS_DIR
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function packsRoot() {
  if (process.env.MARKETPLACE_PACKS_DIR) {
    return path.resolve(process.env.MARKETPLACE_PACKS_DIR);
  }
  return path.join(os.homedir(), 'Documents', 'MarketplacePacks');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function packKey(product) {
  const asin = product.asin && String(product.asin).trim();
  if (asin) return asin.toUpperCase();
  return String(product.orderId || 'unknown').replace(/[^\w.-]+/g, '_');
}

function packDir(product) {
  return ensureDir(path.join(packsRoot(), packKey(product)));
}

function writeJson(filePath, obj) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
}

function writeText(filePath, text) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, text, 'utf8');
}

function writeBinary(filePath, buf) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, buf);
}

function listPack(product) {
  const dir = packDir(product);
  if (!fs.existsSync(dir)) return { dir, files: [] };
  const files = fs.readdirSync(dir).map((name) => {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    return { name, bytes: st.size, mtime: st.mtime.toISOString() };
  });
  return { dir, files };
}

function openHint() {
  const root = packsRoot();
  return {
    packsRoot: root,
    windowsExplorer: `explorer "${root}"`,
    note: 'Lifestyle images and listing.txt are written here on YOUR computer.',
  };
}

module.exports = {
  packsRoot,
  packKey,
  packDir,
  writeJson,
  writeText,
  writeBinary,
  listPack,
  openHint,
  ensureDir,
};
