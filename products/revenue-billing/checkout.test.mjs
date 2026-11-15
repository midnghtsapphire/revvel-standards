import test from 'node:test';
import assert from 'node:assert/strict';
import { stripeCheckoutUrl as affiliate } from '../affiliate-hub/app/lib/checkout.ts';
import { stripeCheckoutUrl as video } from '../ai-video-toolkit/app/lib/checkout.ts';
import { stripeCheckoutUrl as recorder } from '../screen-recorder-finder/app/lib/checkout.ts';

for (const [name, validate] of Object.entries({ affiliate, video, recorder })) {
  test(`${name}: checkout accepts Stripe HTTPS and fails closed for unsafe or missing links`, () => {
    assert.equal(validate('https://buy.stripe.com/test_link'), 'https://buy.stripe.com/test_link');
    assert.equal(validate('https://checkout.stripe.com/c/pay/session'), 'https://checkout.stripe.com/c/pay/session');
    for (const value of [undefined, '', 'javascript:alert(1)', 'http://buy.stripe.com/link', 'https://buy.stripe.com.attacker.test/link', 'https://user:password@buy.stripe.com/link', 'https://buy.stripe.com:9000/link', '/checkout']) {
      assert.equal(validate(value), null);
    }
  });
}
