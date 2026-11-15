'use client';

// 2026-11-11 MarketShipper: screen-recorder-finder renders the shared checkout button.
// Implementation: packages/static-stripe-server/stripe-checkout-button.jsx.
// The previous component is line-commented below. WR #18332.
export { StripeCheckoutButton } from '../../../../packages/static-stripe-server/stripe-checkout-button.jsx';

// RETIRED 2026-11-11 MarketShipper. Kept on this path. The live code is above.
// 'use client';
//
// import { useState, useSyncExternalStore } from 'react';
//
// const REASONS: Record<string, string> = {
//   missing_STRIPE_SECRET_KEY: 'STRIPE_SECRET_KEY is not set on the server.',
//   live_secret_refused_in_test_mode: 'A live secret key was refused because STRIPE_MODE is test.',
//   test_mode_requires_sk_test_key: 'Test mode requires a secret key that starts with sk_test_.',
//   live_mode_requires_sk_live_key: 'Live mode requires a secret key that starts with sk_live_.',
//   publishable_key_mode_mismatch: 'STRIPE_PUBLISHABLE_KEY does not match STRIPE_MODE.',
//   missing_or_invalid_STRIPE_PRICE_ID: 'STRIPE_PRICE_ID is missing or is not a Stripe price id.',
//   invalid_STRIPE_MODE: 'STRIPE_MODE must be test or live.',
//   stripe_checkout_rejected: 'Stripe refused to create a checkout session.',
//   stripe_unreachable: 'The server could not reach Stripe.',
//   rate_limited: 'Too many checkout attempts from this network. Wait a minute and try again.',
//   origin_not_allowed: 'This host is not allowed to start checkout.',
// };
//
// function checkoutQuery() {
//   const checkout = new URLSearchParams(window.location.search).get('checkout');
//   if (checkout === 'success') {
//     return 'Stripe sent the browser back to this page. This page does not record a payment. Confirm the test payment in the Stripe dashboard.';
//   }
//   if (checkout === 'cancel') {
//     return 'Checkout was cancelled. This page did not charge a card.';
//   }
//   return '';
// }
//
// export function StripeCheckoutButton() {
//   const returned = useSyncExternalStore(() => () => {}, checkoutQuery, () => '');
//   const [message, setMessage] = useState<string | null>(null);
//   const [pending, setPending] = useState(false);
//   const shown = message === null ? returned : message;
//
//   async function startCheckout() {
//     setPending(true);
//     setMessage(null);
//     try {
//       const response = await fetch('/api/checkout', { method: 'POST' });
//       const body = await response.json() as { ok?: boolean; url?: string; reason?: string; mode?: string };
//       if (response.ok && body.ok && body.url) {
//         window.location.assign(body.url);
//         return;
//       }
//       const detail = body.reason ? (REASONS[body.reason] || body.reason) : 'Checkout is not available.';
//       setMessage(`${detail} Mode: ${body.mode || 'test'}.`);
//     } catch {
//       setMessage('Checkout request failed before Stripe returned a session.');
//     } finally {
//       setPending(false);
//     }
//   }
//
//   return (
//     <div className="mt-6">
//       <button
//         type="button"
//         onClick={startCheckout}
//         disabled={pending}
//         className="rounded-lg bg-blue-700 px-6 py-3 text-white disabled:opacity-60"
//       >
//         {pending ? 'Contacting Stripe…' : 'Continue to Stripe checkout'}
//       </button>
//       {shown ? <output className="mt-3">{shown}</output> : null}
//       <p className="mt-3 text-sm">
//         Test mode is the default. The amount Stripe charges is the amount on the configured Stripe Price, shown on the Stripe checkout page before you pay.
//       </p>
//     </div>
//   );
// }
