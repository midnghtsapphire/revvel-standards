// Only Stripe-hosted URLs may be embedded in a public static build.
// Credentials never belong in NEXT_PUBLIC_* variables. Rebuild when links change.
export function stripeCheckoutUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['buy.stripe.com', 'checkout.stripe.com'].includes(url.hostname)
      || url.username || url.password || (url.port && url.port !== '443')) return null;
    return url.href;
  } catch { return null; }
}
