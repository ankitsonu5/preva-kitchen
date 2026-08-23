'use client';

import { useEffect, useState } from 'react';

/**
 * Waits for the webhook.
 *
 * A customer lands here the instant Stripe redirects them, which is usually a
 * second or two before the webhook arrives. Rather than show a receipt for an
 * order the server does not yet consider paid — or worse, show a scary error —
 * this polls until the status moves, then refreshes the page.
 *
 * It gives up after a minute and tells the customer their order is fine and
 * someone will confirm it, because by that point the problem is ours to chase,
 * not theirs.
 */
export default function PaymentPending({ orderNumber }) {
  const [waited, setWaited] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const tick = async () => {
      attempts += 1;
      if (cancelled || attempts > 30) return;

      try {
        const response = await fetch(`/api/shop/orders/${orderNumber}`, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (data.paymentStatus === 'PAID' || data.status !== 'PENDING') {
            window.location.reload();
            return;
          }
        }
      } catch {
        /* Offline for a moment; the next tick will try again. */
      }

      if (!cancelled) {
        setWaited(attempts * 2);
        setTimeout(tick, 2000);
      }
    };

    const timer = setTimeout(tick, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderNumber]);

  const givenUp = waited >= 60;

  return (
    <div className="ps-status">
      <div className="ps-status__seal" aria-hidden="true">
        {givenUp ? '!' : '…'}
      </div>
      <span className="ps-kicker" style={{ textAlign: 'center' }}>Order #{orderNumber}</span>
      <h1 className="ps-h1">{givenUp ? 'Still confirming' : 'Confirming your payment'}</h1>
      <p className="ps-lede" style={{ margin: '18px auto 0' }}>
        {givenUp ? (
          <>
            Your bank has not confirmed the payment to us yet. Nothing has gone wrong on your side — keep this
            order number and call us on{' '}
            <a href="tel:+13132863586" style={{ color: 'var(--ps-gold)' }}>(313) 286-3586</a> if you do not
            hear from us in a few minutes.
          </>
        ) : (
          'This usually takes a couple of seconds. Please do not close this page.'
        )}
      </p>
    </div>
  );
}
