import { createHmac, createPublicKey, timingSafeEqual, verify } from 'node:crypto';

// Lago's documented endpoint algorithm is operator-selected, not negotiated by
// an attacker-controlled header. Source: Lago Webhook#generate_headers/model.
// Unlike Stripe, Lago's default signatures contain no delivery timestamp.
export function signatureVerifier({ algorithm, hmacKey, publicKey, issuer }) {
  if (!['hmac', 'jwt'].includes(algorithm)) throw new Error('Select Lago hmac or jwt explicitly');
  if (algorithm === 'hmac' && (typeof hmacKey !== 'string' || !hmacKey)) throw new Error('Lago organization HMAC key is required');
  let key;
  if (algorithm === 'jwt') {
    if (!publicKey || typeof issuer !== 'string' || !issuer) throw new Error('Pinned Lago RSA public key and exact issuer are required');
    key = createPublicKey(publicKey);
    if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048) throw new Error('Lago JWT requires an RSA key of at least 2048 bits');
  }
  return (raw, headers) => {
    const signature = headers['x-lago-signature'];
    if (headers['x-lago-signature-algorithm'] !== algorithm || typeof signature !== 'string' || signature.length > 95000) return false;
    if (algorithm === 'hmac') {
      if (!/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
      const expected = createHmac('sha256', hmacKey).update(raw).digest();
      const supplied = Buffer.from(signature, 'base64');
      return supplied.length === expected.length && timingSafeEqual(supplied, expected);
    }
    try {
      const parts = signature.split('.');
      if (parts.length !== 3 || parts.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) return false;
      const header = JSON.parse(Buffer.from(parts[0], 'base64url'));
      if (header.alg !== 'RS256' || header.crit !== undefined || header.b64 === false) return false;
      if (!verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url'))) return false;
      const claims = JSON.parse(Buffer.from(parts[1], 'base64url'));
      const now = Date.now() / 1000;
      if (claims.exp !== undefined && (typeof claims.exp !== 'number' || claims.exp <= now)) return false;
      if (claims.nbf !== undefined && (typeof claims.nbf !== 'number' || claims.nbf > now)) return false;
      // Upstream signs {data: payload.to_json, iss: LAGO_API_URL}. Checking just
      // the JWT signature without matching data to the HTTP body is insufficient.
      return claims.iss === issuer && typeof claims.data === 'string'
        && Buffer.from(claims.data).equals(raw);
    } catch { return false; }
  };
}
