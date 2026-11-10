// Shared runtime for the local deploy-static adapter and Railway/Bun functions.
// Only the product's public Next export is embedded; never serve the repository.
import { createServer } from 'node:http';
import { gunzipSync } from 'node:zlib';

export function staticHandler(assets) {
  const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2' };
  // WR #18334: browser-downloadable public sales deck, same static handler.
  mime['.pdf'] = 'application/pdf';
  return (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // REVVEL-DISABLED 2026-11-10: method can be undefined under strict Node types.
    // if (!['GET', 'HEAD'].includes(request.method)) {
    if (!['GET', 'HEAD'].includes(request.method || '')) {
      response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
    }
    let pathname;
    try { pathname = decodeURIComponent((request.url || '/').split('?')[0]); }
    catch { response.writeHead(400); response.end(); return; }
    if (!pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(segment => segment === '..' || segment === '.')) {
      response.writeHead(400); response.end(); return;
    }
    const route = pathname === '/' ? '/index.html' : pathname.replace(/\/$/, '');
    const choices = route === '/health' ? ['/health', '/health.json'] : [route, `${route}.html`, `${route}/index.html`];
    const key = choices.find(candidate => Object.hasOwn(assets, candidate));
    const asset = key ? assets[key] : assets['/404.html'];
    const status = key ? 200 : 404;
    const extension = (key || '/404.html').match(/\.[a-z0-9]+$/i)?.[0] || '';
    const headers = {
      'Content-Type': pathname === '/health' ? 'application/json' : mime[extension] || 'application/octet-stream',
      'Cache-Control': pathname === '/health' ? 'no-store' : pathname.startsWith('/_next/static/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    };
    if (asset) {
      headers.ETag = asset.etag;
      if (status === 200 && request.headers['if-none-match'] === asset.etag) {
        response.writeHead(304, headers); response.end(); return;
      }
      const body = Buffer.from(asset.body, 'base64');
      headers['Content-Length'] = body.length;
      response.writeHead(status, headers); response.end(request.method === 'HEAD' ? undefined : body);
    } else { response.writeHead(404, headers); response.end(); }
  };
}

export function startPackedSite(payload, port = Number(process.env.PORT || 8080)) {
  const assets = JSON.parse(gunzipSync(Buffer.from(payload, 'base64')).toString('utf8'));
  const server = createServer(staticHandler(assets));
  // REVVEL-DISABLED 2026-11-10: address may be null or a pipe name in Node types.
  // server.listen(port, '0.0.0.0', () => console.log(`Static product listening on port ${server.address().port}`));
  server.listen(port, '0.0.0.0', () => {
    const address = server.address();
    if (address && typeof address !== 'string') console.log(`Static product listening on port ${address.port}`);
  });
  return server;
}
