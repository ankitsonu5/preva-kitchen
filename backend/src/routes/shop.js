import { col, serialize, asObjectId, nextOrderNumber } from '../lib/db.js';
import { cleanText, cleanEmail, formatMoney } from '../lib/sanitize.js';
import { priceOrder, shopSettings, itemPriceCents, readyAt } from '../lib/pricing.js';
import { logActivity } from '../lib/activity.js';
import {
  stripe,
  stripeConfigured,
  allowUnpaidTestOrders,
  paymentStatusSummary,
  storefrontUrl,
  webhookSecret
} from '../lib/stripe.js';
import { get, post, badRequest, notFound } from '../router.js';

/* ══════════════════════════════════════════════════════════════════════════
   Catalogue
   ─────────────────────────────────────────────────────────────────────────
   The shop sells the same menuItems the kitchen already manages in the admin.
   An item becomes buyable by ticking "orderable" — there is no second product
   table to keep in step with the menu.
   ══════════════════════════════════════════════════════════════════════════ */

function toProduct(item) {
  const out = serialize(item);
  return {
    id: out.id,
    slug: out.slug || out.id,
    name: out.name,
    description: out.description || '',
    priceCents: itemPriceCents(item),
    price: formatMoney(itemPriceCents(item)),
    image: out.image || '',
    category: out.category || 'Others',
    available: out.available !== false,
    featured: Boolean(out.featured),
    badge: out.badge || '',
    tags: out.tags || [],
    servings: out.servings || '',
    calories: out.calories || null,
    optionGroups: (out.optionGroups || []).map((group) => ({
      id: group.id,
      label: group.label,
      type: group.type === 'check' ? 'check' : 'radio',
      required: Boolean(group.required),
      maxPick: Number(group.maxPick) || 0,
      options: (group.options || [])
        .filter((option) => option.available !== false)
        .map((option) => ({
          id: option.id,
          label: option.label,
          priceCents: Number(option.priceCents) || 0
        }))
    }))
  };
}

get('/shop/settings', async () => shopSettings());

get('/shop/products', async ({ query }) => {
  const menuItems = await col('menuItems');
  const filter = { orderable: true };
  if (query.category) filter.category = cleanText(query.category, 80);
  if (query.featured === 'true') filter.featured = true;

  const rows = await menuItems.find(filter).sort({ category: 1, sortOrder: 1, name: 1 }).toArray();
  return rows.map(toProduct);
});

get('/shop/categories', async () => {
  const menuItems = await col('menuItems');
  const rows = await menuItems.aggregate([
    { $match: { orderable: true, available: { $ne: false } } },
    { $group: { _id: '$category', count: { $sum: 1 }, image: { $first: '$image' } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  return rows.map((row) => ({ name: typeof row._id === 'object' ? String(row._id || 'Others') : (row._id || 'Others'), count: Number(row.count) || 1, image: String(row.image || '') }));
});

get('/shop/products/:slug', async ({ params }) => {
  const menuItems = await col('menuItems');
  const byId = asObjectId(params.slug);
  const row = await menuItems.findOne(byId ? { _id: byId } : { slug: params.slug });
  if (!row || row.orderable === false) throw notFound('That item is not on the menu.');

  const related = await menuItems
    .find({ orderable: true, category: row.category, _id: { $ne: row._id } })
    .sort({ sortOrder: 1 })
    .limit(4)
    .toArray();

  return { product: toProduct(row), related: related.map(toProduct) };
});

/* ══════════════════════════════════════════════════════════════════════════
   Checkout
   ══════════════════════════════════════════════════════════════════════════ */

post('/shop/quote', async ({ body }) => {
  // Used by the cart to show tax and delivery before the customer commits.
  const priced = await priceOrder(body);
  return {
    lines: priced.lines,
    subtotalCents: priced.subtotalCents,
    deliveryCents: priced.deliveryCents,
    taxCents: priced.taxCents,
    tipCents: priced.tipCents,
    totalCents: priced.totalCents
  };
});

post('/shop/checkout', async ({ body, ip }) => {
  const priced = await priceOrder(body);
  const noCardTestMode = allowUnpaidTestOrders();
  const checkoutAttemptId = cleanText(body?.checkoutAttemptId, 100);

  const customer = {
    name: cleanText(body?.customer?.name, 120),
    phone: cleanText(body?.customer?.phone, 40),
    email: cleanEmail(body?.customer?.email),
    address: cleanText(body?.customer?.address, 240),
    postcode: cleanText(body?.customer?.postcode, 12),
    note: cleanText(body?.customer?.note, 500)
  };

  if (!customer.name || !customer.phone) throw badRequest('Name and phone number are required.');
  if (customer.phone.replace(/\D/g, '').length < 7) throw badRequest('Enter a valid phone number.');
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    throw badRequest('Enter a valid email address.');
  }
  if (priced.fulfilment === 'DELIVERY' && !customer.address) {
    throw badRequest('A delivery address is required.');
  }
  if (!stripeConfigured() && !noCardTestMode) {
    throw badRequest('Online payments are not switched on yet. Please call the restaurant to order.');
  }
  if (stripeConfigured() && !webhookSecret().startsWith('whsec_')) {
    throw badRequest('Online payments are temporarily unavailable. Please call the restaurant to order.');
  }
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(checkoutAttemptId)) {
    throw badRequest('This checkout attempt is invalid. Refresh the page and try again.');
  }

  const orders = await col('order');
  const existingAttempt = await orders.findOne({ checkoutAttemptId });
  if (existingAttempt) {
    if (existingAttempt.payment?.status === 'PAID') {
      return { url: `/order/${existingAttempt.orderNumber}`, orderNumber: existingAttempt.orderNumber };
    }
    if (existingAttempt.status === 'PENDING' && existingAttempt.payment?.checkoutUrl) {
      return {
        url: existingAttempt.payment.checkoutUrl,
        orderNumber: existingAttempt.orderNumber,
        reused: true
      };
    }
    throw badRequest('That payment attempt has ended. Refresh checkout and try again.');
  }

  const orderNumber = await nextOrderNumber();
  const now = new Date();

  const document = {
    orderNumber,
    checkoutAttemptId,
    status: 'PENDING',
    fulfilment: priced.fulfilment,
    customer,
    lines: priced.lines,
    subtotalCents: priced.subtotalCents,
    deliveryCents: priced.deliveryCents,
    taxCents: priced.taxCents,
    tipCents: priced.tipCents,
    totalCents: priced.totalCents,
    payment: {
      provider: noCardTestMode ? 'none' : 'stripe',
      status: noCardTestMode ? 'AWAITING' : 'CREATING',
      amountCents: priced.totalCents,
      currency: 'usd'
    },
    readyAt: readyAt(priced.settings, priced.fulfilment),
    statusHistory: [{ status: 'PENDING', at: now, by: 'customer' }],
    createdAt: now,
    updatedAt: now
  };

  let inserted;
  try {
    inserted = await orders.insertOne(document);
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const duplicate = await orders.findOne({ checkoutAttemptId });
    if (duplicate?.payment?.checkoutUrl) {
      return { url: duplicate.payment.checkoutUrl, orderNumber: duplicate.orderNumber, reused: true };
    }
    throw badRequest('That checkout is already being processed. Please wait a moment and try again.');
  }
  const orderId = inserted.insertedId.toString();

  /* ── no card required, local development only ─────────────────────────
     allowUnpaidTestOrders() is false the moment NODE_ENV is production, so a
     deploy that forgets the Stripe key refuses orders rather than giving food
     away. */
  if (noCardTestMode) {
    await orders.updateOne(
      { _id: inserted.insertedId },
      {
        $set: {
          status: 'RECEIVED',
          payment: {
            provider: 'none',
            status: 'PAID',
            mode: 'test',
            amountCents: priced.totalCents,
            currency: 'usd',
            paidAt: new Date()
          },
          statusHistory: [
            ...document.statusHistory,
            { status: 'RECEIVED', at: new Date(), by: 'test-payment' }
          ],
          updatedAt: new Date()
        }
      }
    );
    await logActivity({ ip }, 'CREATE', 'ORDER', `#${orderNumber} (no-card test mode)`);
    return { url: `/order/${orderNumber}`, orderNumber, testMode: true };
  }

  let site;
  try {
    site = storefrontUrl();
  } catch (error) {
    await orders.updateOne(
      { _id: inserted.insertedId },
      { $set: { status: 'CANCELLED', 'payment.status': 'FAILED', updatedAt: new Date() } }
    );
    console.error('[shop] checkout URL configuration error:', error.message);
    throw badRequest('Online checkout is temporarily unavailable. Please call the restaurant to order.');
  }

  const lineItems = priced.lines.map((line) => ({
    quantity: line.qty,
    price_data: {
      currency: 'usd',
      unit_amount: line.unitCents,
      product_data: {
        name: line.name,
        ...(line.options ? { description: line.options.slice(0, 500) } : {})
      }
    }
  }));

  for (const [name, amount] of [
    ['Delivery', priced.deliveryCents],
    ['Sales tax', priced.taxCents],
    ['Tip', priced.tipCents]
  ]) {
    if (amount > 0) {
      lineItems.push({
        quantity: 1,
        price_data: { currency: 'usd', unit_amount: amount, product_data: { name } }
      });
    }
  }

  let session;
  try {
    session = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      customer_email: customer.email || undefined,
      client_reference_id: orderId,

      // Apple Pay and Google Pay appear automatically on supported devices
      // once the domain is verified in the Stripe dashboard.
      success_url: `${site}/order/${orderNumber}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/checkout?cancelled=${orderNumber}`,

      // Half an hour is long enough to find a card and short enough that an
      // abandoned session releases the order number cleanly.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,

      metadata: { orderId, orderNumber: String(orderNumber), fulfilment: priced.fulfilment },
      payment_intent_data: {
        metadata: { orderId, orderNumber: String(orderNumber) },
        description: `Preva Kitchen order #${orderNumber}`
      }
    }, { idempotencyKey: `preva-checkout-${checkoutAttemptId}` });
  } catch (error) {
    console.error('[shop] Stripe session failed', {
      type: error?.type || 'StripeError',
      code: error?.code || '',
      message: String(error?.message || 'Checkout Session creation failed').slice(0, 300),
      requestId: error?.requestId || ''
    });
    await orders.updateOne(
      { _id: inserted.insertedId },
      { $set: { status: 'CANCELLED', 'payment.status': 'FAILED', updatedAt: new Date() } }
    );
    throw badRequest('Payment could not be started. Please try again.');
  }

  try {
    await orders.updateOne(
      { _id: inserted.insertedId },
      {
        $set: {
          stripeSessionId: session.id,
          'payment.provider': 'stripe',
          'payment.status': 'AWAITING',
          'payment.mode': session.livemode ? 'live' : 'test',
          'payment.sessionId': session.id,
          'payment.stripeCheckoutSessionId': session.id,
          'payment.checkoutUrl': session.url,
          'payment.orderRef': orderId,
          'payment.amountCents': priced.totalCents,
          'payment.currency': 'usd',
          updatedAt: new Date()
        }
      }
    );
  } catch (error) {
    // The signed webhook can recover this order through metadata.orderId. The
    // customer should still be allowed to complete the already-created payment.
    console.error('[shop] could not persist Checkout Session reference', {
      orderNumber,
      message: String(error?.message || 'Database update failed').slice(0, 300)
    });
  }

  await logActivity({ ip }, 'CREATE', 'ORDER', `#${orderNumber} awaiting payment`);

  // The order stays PENDING. Only the signed webhook may mark the payment paid
  // and release the order to the kitchen as RECEIVED.
  return { url: session.url, orderNumber };
});

/**
 * Order status. Deliberately keyed on the order number plus nothing else — it
 * returns no address and no contact details, so a guessed number leaks only
 * what the customer would see on a receipt they already have.
 */
get('/shop/orders/:number', async ({ params }) => {
  const orders = await col('order');
  const row = await orders.findOne({ orderNumber: Number(params.number) });
  if (!row) throw notFound('We could not find that order.');

  return {
    orderNumber: row.orderNumber,
    status: row.status,
    fulfilment: row.fulfilment,
    customerName: row.customer?.name || '',
    lines: row.lines || [],
    subtotalCents: row.subtotalCents,
    deliveryCents: row.deliveryCents,
    taxCents: row.taxCents,
    tipCents: row.tipCents,
    totalCents: row.totalCents,
    readyAt: row.readyAt,
    createdAt: row.createdAt,
    orderStatus: row.status,
    paymentStatus: row.payment?.status || 'UNPAID',
    paymentMode: row.payment?.mode || null
  };
});

/** Lets the admin and a deploy check show whether payments are armed. */
get('/shop/payment-status', { auth: true }, async () => paymentStatusSummary());
