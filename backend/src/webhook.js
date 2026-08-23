import { col, asObjectId } from './lib/db.js';
import { stripe, stripeConfigured, webhookSecret } from './lib/stripe.js';
import { logActivity } from './lib/activity.js';

/**
 * Stripe webhook.
 *
 * This is the only place an order is allowed to become PAID.
 *
 * The success URL is not proof of anything — a customer can open it by typing
 * it, and a genuine payer can close the tab before the redirect ever happens.
 * Stripe telling us server to server is the only fact worth trusting, and this
 * route refuses to act on a request it cannot verify came from Stripe.
 *
 * It lives outside the /api/[...path] dispatcher because signature
 * verification needs the raw request body, byte for byte. Parsing the JSON
 * first would change the bytes and every signature check would fail.
 */

/**
 * Claim an event before handling it and mark it PROCESSED only afterwards.
 *
 * A previous version inserted the event id and immediately considered it
 * handled. If Mongo failed during the order update, Stripe's retry saw the id
 * and was acknowledged without retrying the failed work. FAILED/PROCESSING
 * events are deliberately reclaimable; all order writes below are idempotent.
 */
async function claimEvent(event) {
  const events = await col('stripeEvent');
  try {
    await events.insertOne({
      eventId: event.id,
      type: event.type,
      livemode: event.livemode,
      status: 'PROCESSING',
      receivedAt: new Date(),
      updatedAt: new Date()
    });
    return { events, duplicate: false };
  } catch (error) {
    if (error?.code !== 11000) throw error;

    const existing = await events.findOne({ eventId: event.id });
    if (existing?.status === 'PROCESSED') return { events, duplicate: true };

    // Stripe can deliver one event concurrently. Let the first request finish;
    // failed events and abandoned processing leases remain reclaimable.
    const updatedAt = existing?.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
    const leaseIsFresh = existing?.status === 'PROCESSING' && Date.now() - updatedAt < 5 * 60 * 1000;
    if (leaseIsFresh) return { events, duplicate: true, processing: true };

    await events.updateOne(
      { eventId: event.id },
      { $set: { status: 'PROCESSING', updatedAt: new Date(), lastError: null } }
    );
    return { events, duplicate: false };
  }
}

async function finishEvent(events, event) {
  await events.updateOne(
    { eventId: event.id },
    { $set: { status: 'PROCESSED', processedAt: new Date(), updatedAt: new Date(), lastError: null } }
  );
}

async function failEvent(events, event, error) {
  if (!events) return;
  try {
    await events.updateOne(
      { eventId: event.id, status: 'PROCESSING' },
      {
        $set: {
          status: 'FAILED',
          updatedAt: new Date(),
          lastError: String(error?.message || 'Webhook handler failed').slice(0, 500)
        }
      }
    );
  } catch (writeError) {
    console.error('[stripe] could not record failed webhook attempt', writeError);
  }
}

async function findOrderForIntent(orders, intent) {
  const orderId = intent?.metadata?.orderId;
  const orderNumber = Number(intent?.metadata?.orderNumber);
  const objectId = asObjectId(orderId);

  return (
    (intent?.id ? await orders.findOne({ 'payment.paymentIntentId': intent.id }) : null) ||
    (objectId ? await orders.findOne({ _id: objectId }) : null) ||
    (orderNumber ? await orders.findOne({ orderNumber }) : null) ||
    (orderId ? await orders.findOne({ 'payment.orderRef': orderId }) : null)
  );
}

async function findOrderForRefund(orders, refund) {
  return (
    (refund?.payment_intent
      ? await orders.findOne({ 'payment.paymentIntentId': refund.payment_intent })
      : null) ||
    (refund?.charge ? await orders.findOne({ 'payment.chargeId': refund.charge }) : null)
  );
}

function paymentMatchesOrder(order, payment) {
  const expectedMode = String(order.payment?.mode || '').toLowerCase();
  const actualMode = payment.livemode ? 'live' : 'test';
  const storedSessionId = order.stripeSessionId || order.payment?.sessionId || order.payment?.stripeCheckoutSessionId;
  return (
    order.payment?.provider === 'stripe' &&
    Number(payment.amountCents) === Number(order.totalCents) &&
    String(payment.currency || '').toLowerCase() === String(order.payment?.currency || 'usd').toLowerCase() &&
    (!expectedMode || expectedMode === actualMode) &&
    (!storedSessionId || !payment.sessionId || storedSessionId === payment.sessionId)
  );
}

async function markPaid(orders, order, payment) {
  if (!paymentMatchesOrder(order, payment)) {
    const message = `Stripe payment validation failed for order #${order.orderNumber}.`;
    await orders.updateOne(
      { _id: order._id },
      {
        $set: {
          'payment.status': 'REVIEW_REQUIRED',
          'payment.lastError': message,
          updatedAt: new Date()
        }
      }
    );
    console.error(`[stripe] ${message}`);
    return false;
  }

  const alreadyPaid = order.payment?.status === 'PAID';
  const advance = order.status === 'PENDING';
  const now = new Date();

  await orders.updateOne(
    { _id: order._id },
    {
      $set: {
        ...(advance ? { status: 'RECEIVED' } : {}),
        ...(advance ? {
          statusHistory: [
            ...(Array.isArray(order.statusHistory) ? order.statusHistory : []),
            { status: 'RECEIVED', at: now, by: 'stripe' }
          ].slice(-30)
        } : {}),
        'payment.provider': 'stripe',
        'payment.status': 'PAID',
        'payment.mode': payment.livemode ? 'live' : 'test',
        ...(payment.sessionId ? { stripeSessionId: payment.sessionId } : {}),
        ...(payment.sessionId ? { 'payment.sessionId': payment.sessionId } : {}),
        ...(payment.sessionId ? { 'payment.stripeCheckoutSessionId': payment.sessionId } : {}),
        ...(payment.paymentIntentId ? { 'payment.paymentIntentId': payment.paymentIntentId } : {}),
        ...(payment.paymentIntentId ? { 'payment.stripePaymentIntentId': payment.paymentIntentId } : {}),
        'payment.amountCents': payment.amountCents,
        'payment.currency': payment.currency || 'usd',
        ...(payment.email ? { 'payment.email': payment.email } : {}),
        'payment.paidAt': order.payment?.paidAt || now,
        updatedAt: now
      }
    }
  );

  if (!alreadyPaid) {
    await logActivity({}, 'PAYMENT', 'ORDER', `#${order.orderNumber} paid`);
  }
  return true;
}

async function findOrder(orders, session) {
  const orderId = session?.metadata?.orderId;
  const orderNumber = Number(session?.metadata?.orderNumber);
  const objectId = asObjectId(orderId);

  // Look up by session first — metadata can be edited in the dashboard, the
  // session id on the event cannot.
  const order = (
    (await orders.findOne({ stripeSessionId: session.id })) ||
    (await orders.findOne({ 'payment.sessionId': session.id })) ||
    (objectId ? await orders.findOne({ _id: objectId }) : null) ||
    (orderNumber ? await orders.findOne({ orderNumber }) : null) ||
    (orderId ? await orders.findOne({ 'payment.orderRef': orderId }) : null)
  );

  if (!order) return null;
  const storedSessionId = order.stripeSessionId || order.payment?.sessionId || order.payment?.stripeCheckoutSessionId;
  return storedSessionId && storedSessionId !== session.id ? null : order;
}

export async function handleStripeWebhook(req, res) {
  if (!stripeConfigured()) {
    return res.status(503).json({ message: 'Payments are not configured.' });
  }

  const secret = webhookSecret();
  if (!secret) {
    console.error('[stripe] STRIPE_WEBHOOK_SECRET is missing — refusing to trust this request.');
    return res.status(503).json({ message: 'Webhook secret is not configured.' });
  }

  const signature = req.headers['stripe-signature'];
  const raw = req.body; // Buffer from express.raw — the exact bytes Stripe signed

  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch (error) {
    // A bad signature is either a misconfiguration or somebody probing.
    console.error('[stripe] signature verification failed:', error.message);
    return res.status(400).json({ message: 'Signature verification failed.' });
  }

  let eventStore = null;
  try {
    const claim = await claimEvent(event);
    eventStore = claim.events;
    if (claim.duplicate) {
      return res
        .status(claim.processing ? 409 : 200)
        .json({ received: !claim.processing, duplicate: true, processing: Boolean(claim.processing) });
    }

    const orders = await col('order');

    switch (event.type) {
      /* ── payment went through ──────────────────────────────────────── */
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;

        // Some methods complete asynchronously; only 'paid' means money moved.
        if (session.payment_status !== 'paid') break;

        const order = await findOrder(orders, session);
        if (!order) {
          console.error(`[stripe] no order matched session ${session.id}`);
          break;
        }

        await markPaid(orders, order, {
          amountCents: session.amount_total,
          currency: session.currency,
          livemode: session.livemode,
          sessionId: session.id,
          paymentIntentId: session.payment_intent || null,
          email: session.customer_details?.email || order.customer?.email || ''
        });
        break;
      }

      /* ── customer walked away ──────────────────────────────────────── */
      case 'checkout.session.expired': {
        const session = event.data.object;
        const order = await findOrder(orders, session);
        if (!order || order.status !== 'PENDING') break;

        await orders.updateOne(
          { _id: order._id },
          {
            $set: {
              status: 'CANCELLED',
              statusHistory: [
                ...(Array.isArray(order.statusHistory) ? order.statusHistory : []),
                { status: 'CANCELLED', at: new Date(), by: 'stripe' }
              ].slice(-30),
              'payment.status': 'EXPIRED',
              updatedAt: new Date()
            }
          }
        );
        break;
      }

      /* ── the card was declined ─────────────────────────────────────── */
      case 'checkout.session.async_payment_failed':
      case 'payment_intent.payment_failed': {
        const object = event.data.object;
        const intentId = object.payment_intent || object.id;
        const order = event.type === 'payment_intent.payment_failed'
          ? await findOrderForIntent(orders, object)
          : await findOrder(orders, object);

        if (!order) {
          console.error(`[stripe] no order matched failed payment ${intentId}`);
          break;
        }

        const failedAt = new Date();
        const shouldCancel = order.status === 'PENDING';
        await orders.updateOne(
          { _id: order._id },
          {
            $set: {
              ...(shouldCancel ? { status: 'CANCELLED' } : {}),
              ...(shouldCancel ? {
                statusHistory: [
                  ...(Array.isArray(order.statusHistory) ? order.statusHistory : []),
                  { status: 'CANCELLED', at: failedAt, by: 'stripe' }
                ].slice(-30)
              } : {}),
              'payment.status': 'FAILED',
              ...(intentId ? { 'payment.paymentIntentId': intentId } : {}),
              'payment.lastError':
                object.last_payment_error?.message || 'The payment was declined.',
              updatedAt: failedAt
            }
          }
        );
        break;
      }

      /* ── refunded, in full or in part ──────────────────────────────── */
      case 'charge.refunded': {
        const charge = event.data.object;
        const order = await orders.findOne({ 'payment.paymentIntentId': charge.payment_intent });
        if (!order) break;

        const refunded = charge.amount_refunded || 0;
        const fully = refunded >= (charge.amount || 0);

        await orders.updateOne(
          { _id: order._id },
          {
            $set: {
              ...(fully ? { status: 'REFUNDED' } : {}),
              ...(fully ? {
                statusHistory: [
                  ...(Array.isArray(order.statusHistory) ? order.statusHistory : []),
                  { status: 'REFUNDED', at: new Date(), by: 'stripe' }
                ].slice(-30)
              } : {}),
              'payment.status': fully ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
              'payment.refundedCents': refunded,
              'payment.chargeId': charge.id,
              updatedAt: new Date()
            }
          }
        );

        await logActivity(
          {},
          'REFUND',
          'ORDER',
          `#${order.orderNumber} refunded ${(refunded / 100).toFixed(2)}`
        );
        break;
      }

      /* Stripe owns the refund lifecycle. These events record its progress;
         only charge.refunded above changes the final order/payment state. */
      case 'refund.created':
      case 'refund.updated':
      case 'refund.failed': {
        const refund = event.data.object;
        const order = await findOrderForRefund(orders, refund);
        if (!order) break;

        const failed = event.type === 'refund.failed' || refund.status === 'failed';
        await orders.updateOne(
          { _id: order._id },
          {
            $set: {
              'payment.lastRefundId': refund.id,
              'payment.refundStatus': failed ? 'FAILED' : String(refund.status || 'PENDING').toUpperCase(),
              ...(failed
                ? { 'payment.lastError': refund.failure_reason || 'Stripe could not complete the refund.' }
                : {}),
              updatedAt: new Date()
            }
          }
        );
        break;
      }

      default:
        // Everything else is acknowledged and ignored, so Stripe stops retrying.
        break;
    }

    await finishEvent(eventStore, event);
    return res.status(200).json({ received: true });
  } catch (error) {
    // A 500 tells Stripe to retry, which is what we want if the database was
    // briefly unreachable — the event is not lost.
    console.error(`[stripe] handling ${event.type} failed`, error);
    await failEvent(eventStore, event, error);
    return res.status(500).json({ message: 'Handler failed, please retry.' });
  }
}
