// oAudrey front page process. Added 2026-11-11 by MarketShipper.
//
// The server implementation stays in packages/static-stripe-server/server.mjs
// so this product does not add a second copy. SonarCloud counts a second copy
// as duplication. This file only names the service.
//
// The page does not offer checkout. With no Stripe env vars, POST /api/checkout
// returns 503. /health returns 200. A 200 from /health means the process is
// serving. It does not mean DNS or a payment works.
//
// What breaks if this file is removed: the image command has nothing to start,
// and /health never binds. The runtime import resolves to
// /packages/static-stripe-server inside the image because
// /app/server/../../../packages collapses to /packages.
import { bindProduct } from '../../../packages/static-stripe-server/server.mjs';
import { createGithubRoutes } from './github-feed.mjs';

export const api = bindProduct('oaudrey-home', import.meta.url, {
  routes: createGithubRoutes(),
});
