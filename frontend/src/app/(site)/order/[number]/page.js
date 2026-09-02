import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cmsFetch } from '@/lib/cms';
import PaymentPending from '@/components/shop/PaymentPending';
import LiveOrderTracker from '@/components/shop/LiveOrderTracker';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Live Order Tracker — Preva Kitchen', robots: 'noindex' };

export default async function OrderPage({ params }) {
  const { number } = await params;
  const order = await cmsFetch(`/shop/orders/${encodeURIComponent(number)}`);
  if (!order) notFound();

  if (order.status === 'PENDING') {
    return (
      <div className="ps">
        <div className="ps-wrap" style={{ paddingTop: 'clamp(110px, 12vw, 150px)' }}>
          <PaymentPending orderNumber={order.orderNumber} />
        </div>
      </div>
    );
  }

  if (order.status === 'CANCELLED') {
    return (
      <div className="ps">
        <div className="ps-wrap" style={{ paddingTop: 'clamp(110px, 12vw, 150px)' }}>
          <div className="ps-status">
            <div className="ps-status__seal" aria-hidden="true">×</div>
            <span className="ps-kicker" style={{ textAlign: 'center' }}>Order #{order.orderNumber}</span>
            <h1 className="ps-h1">This order was not completed</h1>
            <p className="ps-lede" style={{ margin: '18px auto 0' }}>
              The payment was cancelled or timed out, so nothing was charged and the kitchen has not
              started. You are welcome to order again.
            </p>
            <p style={{ marginTop: 28 }}>
              <Link href="/menu" className="ps-more">Back to the menu</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Database payment status is written only by the signed Stripe webhook. The
  // redirect query string is deliberately not used as payment proof.
  const paymentVerified = order.paymentStatus === 'PAID';
  const paidAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
    .format((Number(order.totalCents) || 0) / 100);

  return (
    <div className="ps">
      <div className="ps-wrap" style={{ paddingTop: 'clamp(110px, 12vw, 150px)' }}>
        {paymentVerified && (
          <div role="status" style={{ maxWidth: 780, margin: '0 auto 24px', padding: '18px 20px', color: '#dff7eb', background: 'rgba(25,158,108,.12)', border: '1px solid rgba(25,158,108,.42)', borderRadius: 16 }}>
            <strong style={{ display: 'block', color: '#fff', fontSize: 18 }}>Payment successful</strong>
            <span style={{ display: 'block', marginTop: 5, color: '#a9cbb9', fontSize: 13, lineHeight: 1.55 }}>
              {paidAmount} received for order #{order.orderNumber}. Order received by Preva Kitchen.
            </span>
          </div>
        )}
        <LiveOrderTracker initialOrder={order} />
      </div>
    </div>
  );
}
