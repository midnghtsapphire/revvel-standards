// MVI 2026-11-10, release syntax correction:
// 1 Problem: Railway's single-file TypeScript carrier rejects implicit JS types.
// 2 Scope: annotate the existing shared runtime; default Node ESM stays unchanged.
// 3 Contract: identical embedded payload, routes, caching and HTTP behavior.
// 4 Design: exact-one-match type-only anchors fail closed when runtime drifts.
// 5 Safety: no secrets, provisioning, provider calls or second serving engine.
// 6 Evidence: strict TS compile plus compiled HTTP smoke and asset parity tests.
// 7 Rollback: select existing node-js format; preserve frozen release artifacts.
// Official single-file function contract: https://docs.railway.com/guides/functions
export function staticCarrier({ runtime, payload, product, format = 'node-js' }) {
  if (!['node-js', 'railway-ts'].includes(format)) throw new Error('Unsupported static carrier format');
  if (format === 'railway-ts') {
    const annotations = [
      ['export function staticHandler(assets) {', 'export function staticHandler(assets: AssetMap): RequestListener {'],
      ['  const mime = {', '  const mime: Record<string, string> = {'],
      ['  return (request, response) => {', '  return (request: IncomingMessage, response: ServerResponse) => {'],
      ['    const headers = {', '    const headers: OutgoingHttpHeaders = {'],
      ['export function startPackedSite(payload, port =', 'export function startPackedSite(payload: string, port ='],
      ['  const assets = JSON.parse(', '  const assets: AssetMap = JSON.parse('],
    ];
    for (const [anchor, typed] of annotations) {
      if (runtime.split(anchor).length !== 2) throw new Error(`Static runtime type anchor must match exactly once: ${anchor}`);
      runtime = runtime.replace(anchor, typed);
    }
    runtime = "import type { IncomingMessage, ServerResponse, RequestListener, OutgoingHttpHeaders } from 'node:http';\ntype AssetMap = Record<string, { body: string; etag: string }>;\n" + runtime;
  }
  return `${runtime}\n// Generated exclusively from products/${product}/out.\nstartPackedSite(${JSON.stringify(payload)});\n`;
}
