import { col, serialize, asObjectId, nextOrderNumber } from '../lib/db.js';
import { cleanText, cleanEmail, formatMoney } from '../lib/sanitize.js';
import { priceOrder, shopSettings, itemPriceCents, readyAt } from '../lib/pricing.js';
import { logActivity } from '../lib/activity.js';
import { stripe, stripeConfigured, allowUnpaidTestOrders, paymentStatusSummary, storefrontUrl, webhookSecret } from '../lib/stripe.js';
import { get, post, patch, badRequest, notFound, unauthorized, tooManyRequests } from '../router.js';
import { notifyNewOrder, notifyCustomerOrder } from '../lib/email.js';
import { getKitchenOperatingStatus } from '../lib/operatingHours.js';
import { clearLoginAttempts, jwtSecret, loginBlocked, noteFailedLogin, verifyPassword } from '../lib/auth.js';
import { assignOrderTicket, KDS_ACTIVE_STATUSES, setOrderItemChecked, transitionOrderStatus } from '../lib/order-workflow.js';
import { reserveStock } from '../lib/inventory.js';
import { notifyKdsChange } from '../lib/events.js';
import jwt from 'jsonwebtoken';

get('/shop/kitchen-status', async () => {
  return getKitchenOperatingStatus();
});

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
    aboutTitle: out.aboutTitle || '',
    aboutContent: out.aboutContent || '',
    priceCents: itemPriceCents(item),
    price: formatMoney(itemPriceCents(item)),
    image: out.image || '',
    category: out.category || 'Others',
    available: out.available !== false,
    featured: Boolean(out.featured),
    badge: out.badge || '',
    tags: out.tags || [],
    allergens: out.allergens || [],
    pairings: out.pairings || [],
    faqs: out.faqs || [],
    servings: out.servings || '',
    calories: out.calories || null,
    ...(item.trackInventory ? { stockRemaining: Number.isFinite(item.stockCount) ? item.stockCount : 0 } : {}),
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

/* ── Public Restaurant TV Display Board ─────────────────────────────────── */

get('/shop/display-board', async () => {
  const orders = await col('order');
  const now = new Date();
  const recentCutoff = new Date(now.getTime() - 4 * 60 * 1000);

  const rows = await orders.find({
    $or: [
      { status: { $in: ['RECEIVED', 'PAID', 'PREPARING', 'READY', 'ON_THE_WAY'] } },
      { status: { $in: ['COMPLETED', 'DELIVERED'] }, updatedAt: { $gte: recentCutoff } }
    ]
  }).sort({ createdAt: -1 }).limit(60).toArray();

  return rows.map((order) => {
    const rawName = String(order.customer?.name || 'Guest').trim();
    const parts = rawName.split(/\s+/);
    const firstName = parts[0] || 'Guest';
    const lastInitial = parts.length > 1 ? ` ${parts[1][0]}.` : '';
    const displayName = `${firstName}${lastInitial}`;

    let stage = 'PREPARING';
    if (order.status === 'READY') stage = 'READY';
    else if (order.status === 'ON_THE_WAY') stage = 'ON_THE_WAY';
    else if (['COMPLETED', 'DELIVERED'].includes(order.status)) stage = 'COMPLETED';

    return {
      orderNumber: order.orderNumber,
      customerName: displayName,
      fulfilment: order.fulfilment === 'DELIVERY' ? 'DELIVERY' : 'PICKUP',
      stage,
      status: order.status,
      isScheduled: Boolean(order.isScheduled),
      scheduledAt: order.scheduledAt || null,
      readyAt: order.readyAt || null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt || order.createdAt
    };
  });
});

/* ── Kitchen Display Security & Protected Tickets ───────────────────────── */

function verifyKitchenAuth(ctx) {
  if (ctx?.user) {
    ctx.kitchenActor = ctx.user.email || ctx.user.name || 'admin';
    return true; // Logged in admin/staff has access
  }

  const req = ctx?.request;
  const headers = req?.headers || {};
  let authHeader = headers['authorization'] || headers['x-kitchen-token'] || '';
  if (!authHeader && ctx?.query?.token) {
    authHeader = ctx.query.token;
  }
  const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;

  try {
    const payload = jwt.verify(token, jwtSecret());
    const valid = payload && (payload.role === 'kitchen' || payload.role === 'admin');
    if (valid) ctx.kitchenActor = payload.username || payload.email || payload.role;
    return Boolean(valid);
  } catch {
    return false;
  }
}

post('/shop/kitchen-login', async ({ body, ip }) => {
  const username = cleanText(body?.username || body?.id || 'chef', 50).trim();
  const password = String(body?.password || '').trim();
  const attemptKey = `kitchen:${ip || 'unknown'}:${username.toLowerCase()}`;

  if (await loginBlocked(attemptKey)) {
    throw tooManyRequests('Too many kitchen login attempts. Please try again later.');
  }

  const configuredUser = String(process.env.KITCHEN_ID || '').trim();
  const configuredPass = String(process.env.KITCHEN_PASSWORD || '').trim();

  let isValid = Boolean(
    configuredUser &&
    configuredPass &&
    username.toLowerCase() === configuredUser.toLowerCase() &&
    password === configuredPass
  );

  // Also check if matches an admin in users table
  if (!isValid) {
    const users = await col('users');
    const adminUser = await users.findOne({ email: username.toLowerCase() });
    if (adminUser && adminUser.status !== 'DISABLED' && ['SUPER_ADMIN', 'ADMIN'].includes(adminUser.role)) {
      if (await verifyPassword(password, adminUser.passwordHash)) {
        isValid = true;
      }
    }
  }

  if (!isValid) {
    await noteFailedLogin(attemptKey);
    throw unauthorized('Invalid Kitchen ID or Password. Please try again.');
  }

  await clearLoginAttempts(attemptKey);

  const token = jwt.sign(
    { role: 'kitchen', username: username || 'chef' },
    jwtSecret(),
    { expiresIn: process.env.KITCHEN_TOKEN_TTL || '12h' }
  );

  await logActivity({ ip }, 'LOGIN', 'KITCHEN', `Kitchen terminal unlocked by ${username}`);
  return { ok: true, token, username: username || 'chef' };
});

get('/shop/kitchen-tickets', async (ctx) => {
  if (!verifyKitchenAuth(ctx)) {
    throw unauthorized('Kitchen access required. Please enter ID and Password.');
  }

  const orders = await col('order');
  const rows = await orders.find({
    status: { $in: KDS_ACTIVE_STATUSES }
  }).sort({ createdAt: 1 }).limit(100).toArray();

  return rows.map((order) => {
    const safe = serialize(order);
    return {
      id: safe.id,
      orderNumber: safe.orderNumber,
      status: safe.status,
      fulfilment: safe.fulfilment,
      tableNumber: safe.tableNumber || '',
      paymentStatus: safe.payment?.status || '',
      customer: {
        name: safe.customer?.name || 'Walk-in Guest',
        phone: safe.customer?.phone || '',
        note: safe.customer?.note || '',
        address: safe.customer?.address || '',
        postcode: safe.customer?.postcode || ''
      },
      lines: safe.lines || [],
      subtotalCents: safe.subtotalCents,
      totalCents: safe.totalCents,
      isScheduled: safe.isScheduled,
      scheduledAt: safe.scheduledAt,
      readyAt: safe.readyAt,
      estimatedReadyAt: safe.estimatedReadyAt || safe.readyAt,
      actualReadyAt: safe.actualReadyAt || null,
      kdsItemStates: safe.kdsItemStates || [],
      kdsAssignment: safe.kdsAssignment || null,
      statusChangedAt: safe.statusChangedAt || safe.createdAt,
      createdAt: safe.createdAt,
      updatedAt: safe.updatedAt
    };
  });
});

patch('/shop/kitchen-tickets/:id/items/:index', async (ctx) => {
  if (!verifyKitchenAuth(ctx)) throw unauthorized('Kitchen access required.');

  const orders = await col('order');
  const id = asObjectId(ctx.params.id);
  if (!id) throw badRequest('Invalid order ID.');

  const order = await orders.findOne({ _id: id });
  if (!order) throw notFound('Order not found.');

  const updated = await setOrderItemChecked({
    orders,
    order,
    lineIndex: ctx.params.index,
    checked: ctx.body?.checked,
    actor: ctx.kitchenActor
  });

  const itemState = updated.kdsItemStates.find(
    (entry) => Number(entry.lineIndex) === Number(ctx.params.index)
  );
  await logActivity(ctx, 'UPDATE', 'ORDER_ITEM', `#${order.orderNumber} item ${Number(ctx.params.index) + 1} -> ${itemState.checked ? 'DONE' : 'OPEN'}`);
  return { ok: true, orderId: id.toString(), itemState };
});

patch('/shop/kitchen-tickets/:id/assignment', async (ctx) => {
  if (!verifyKitchenAuth(ctx)) throw unauthorized('Kitchen access required.');

  const orders = await col('order');
  const id = asObjectId(ctx.params.id);
  if (!id) throw badRequest('Invalid order ID.');
  const order = await orders.findOne({ _id: id });
  if (!order) throw notFound('Order not found.');

  const updated = await assignOrderTicket({
    orders,
    order,
    station: cleanText(ctx.body?.station, 40),
    assignee: cleanText(ctx.body?.assignee, 80),
    actor: ctx.kitchenActor
  });
  await logActivity(ctx, 'UPDATE', 'ORDER_ASSIGNMENT', `#${order.orderNumber}: ${updated.kdsAssignment.station} / ${updated.kdsAssignment.assignee || 'unassigned'}`);
  return { ok: true, assignment: updated.kdsAssignment };
});

patch('/shop/kitchen-tickets/:id/status', async (ctx) => {
  if (!verifyKitchenAuth(ctx)) {
    throw unauthorized('Kitchen access required.');
  }

  const { params, body, ip } = ctx;
  const orders = await col('order');
  const id = asObjectId(params.id);
  if (!id) throw badRequest('Invalid order ID.');

  const order = await orders.findOne({ _id: id });
  if (!order) throw notFound('Order not found.');

  const targetStatus = cleanText(body?.status, 30).toUpperCase();
  await transitionOrderStatus({
    orders,
    order,
    targetStatus,
    actor: ctx.kitchenActor || 'kitchen-display',
    reason: cleanText(body?.reason, 300)
  });

  await logActivity({ ip }, 'UPDATE', 'ORDER', `#${order.orderNumber} -> ${targetStatus} (Kitchen KDS)`);
  return { ok: true, status: targetStatus, orderNumber: order.orderNumber };
});

get('/shop/kitchen-recalls', async (ctx) => {
  if (!verifyKitchenAuth(ctx)) {
    throw unauthorized('Kitchen access required.');
  }

  const orders = await col('order');
  const rows = await orders.find({
    status: { $in: ['COMPLETED', 'DELIVERED'] }
  }).sort({ updatedAt: -1 }).limit(20).toArray();

  return rows.map((order) => {
    const safe = serialize(order);
    const lines = safe.lines || [];
    const itemsCount = lines.reduce((sum, line) => sum + (Number(line.qty ?? line.quantity) || 1), 0);
    const itemsSummary = lines
      .map((line) => `${line.qty ?? line.quantity ?? 1}x ${line.name || 'Item'}`)
      .slice(0, 2)
      .join(', ');

    return {
      id: safe.id,
      orderNumber: safe.orderNumber,
      status: safe.status,
      fulfilment: safe.fulfilment,
      customer: {
        name: safe.customer?.name || 'Walk-in Guest'
      },
      lines,
      kdsItemStates: safe.kdsItemStates || [],
      kdsAssignment: safe.kdsAssignment || null,
      itemsCount,
      itemsSummary: lines.length > 2 ? `${itemsSummary} +${lines.length - 2} more` : itemsSummary,
      totalCents: safe.totalCents || 0,
      updatedAt: safe.updatedAt
    };
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   Checkout
   ══════════════════════════════════════════════════════════════════════════ */

/** Reads a `setting` row that stores a short list of names (stations, tables), with a fallback default. */
async function namedList(settingRows, key, fallback) {
  const row = await settingRows.findOne({ key });
  return Array.isArray(row?.value) && row.value.length
    ? row.value.map((value) => cleanText(value, 40)).filter(Boolean).slice(0, 40)
    : fallback;
}

/** Validates a PATCH body list of names: trims, dedupes case-insensitively, caps length, requires at least one. */
function cleanNameList(raw, { max = 40, label }) {
  if (!Array.isArray(raw)) throw badRequest(`${label} must be a list of names.`);
  const seen = new Set();
  const list = [];
  for (const value of raw) {
    const name = cleanText(value, 40);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    list.push(name);
  }
  if (!list.length) throw badRequest(`Keep at least one ${label.toLowerCase()}.`);
  return list.slice(0, max);
}

get('/shop/kitchen-operations', async (ctx) => {
  if (!verifyKitchenAuth(ctx)) throw unauthorized('Kitchen access required.');

  const [settings, menuItems, settingRows] = await Promise.all([
    shopSettings(),
    col('menuItems'),
    col('setting')
  ]);
  const stations = await namedList(settingRows, 'kdsStations', ['Expo', 'Grill', 'Fryer', 'Pantry']);
  const tables = await namedList(settingRows, 'dineInTables', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  const items = await menuItems
    .find({ orderable: true })
    .sort({ category: 1, sortOrder: 1, name: 1 })
    .limit(300)
    .toArray();

  return {
    settings,
    stations,
    tables,
    items: items.map((item) => ({
      id: item._id.toString(),
      name: item.name,
      category: item.category || 'Others',
      available: item.available !== false,
      station: cleanText(item.kdsStation, 40) || 'Expo',
      trackInventory: Boolean(item.trackInventory),
      stockCount: Number.isFinite(item.stockCount) ? item.stockCount : 0
    }))
  };
});

patch('/shop/kitchen-operations', async (ctx) => {
  if (!verifyKitchenAuth(ctx)) throw unauthorized('Kitchen access required.');

  const settings = await col('setting');
  const now = new Date();
  const updates = [];
  const booleans = {
    orderingEnabled: 'shopOrderingEnabled',
    pickupEnabled: 'shopPickupEnabled',
    deliveryEnabled: 'shopDeliveryEnabled'
  };
  for (const [inputKey, settingKey] of Object.entries(booleans)) {
    if (typeof ctx.body?.[inputKey] === 'boolean') updates.push([settingKey, ctx.body[inputKey]]);
  }
  for (const [inputKey, settingKey] of [
    ['pickupMinutes', 'shopPickupMinutes'],
    ['deliveryMinutes', 'shopDeliveryMinutes']
  ]) {
    if (ctx.body?.[inputKey] !== undefined) {
      const value = Number(ctx.body[inputKey]);
      if (!Number.isInteger(value) || value < 10 || value > 180) {
        throw badRequest(`${inputKey} must be a whole number between 10 and 180.`);
      }
      updates.push([settingKey, value]);
    }
  }
  if (ctx.body?.closedMessage !== undefined) {
    const value = cleanText(ctx.body.closedMessage, 300);
    if (!value) throw badRequest('Closed message cannot be empty.');
    updates.push(['shopClosedMessage', value]);
  }

  let stations;
  if (ctx.body?.stations !== undefined) {
    stations = cleanNameList(ctx.body.stations, { max: 20, label: 'Station' });
    updates.push(['kdsStations', stations]);
  }

  let tables;
  if (ctx.body?.tables !== undefined) {
    tables = cleanNameList(ctx.body.tables, { max: 40, label: 'Table' });
    updates.push(['dineInTables', tables]);
  }

  if (!updates.length) throw badRequest('No supported kitchen setting was provided.');

  for (const [key, value] of updates) {
    await settings.updateOne({ key }, { $set: { key, value, updatedAt: now } }, { upsert: true });
  }
  await logActivity(ctx, 'UPDATE', 'KITCHEN_SETTINGS', updates.map(([key]) => key).join(', '));
  return {
    ok: true,
    settings: await shopSettings(),
    ...(stations ? { stations } : {}),
    ...(tables ? { tables } : {})
  };
});

/**
 * One row per configured table, showing at a glance whether it's empty,
 * has food in progress, or is sitting on an unpaid bill. A table can have
 * more than one order open at once (a second round while the first is still
 * cooking) — those are summed into one row rather than picking just one.
 */
get('/shop/dine-in-tables', async (ctx) => {
  if (!verifyKitchenAuth(ctx)) throw unauthorized('Kitchen access required.');

  const settingRows = await col('setting');
  const tableNames = await namedList(settingRows, 'dineInTables', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);

  const orders = await col('order');
  const unpaidSince = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const rows = await orders.find({
    fulfilment: 'DINE_IN',
    $or: [
      { status: { $in: KDS_ACTIVE_STATUSES } },
      { status: 'COMPLETED', 'payment.status': 'UNPAID', updatedAt: { $gte: unpaidSince } }
    ]
  }).sort({ createdAt: 1 }).toArray();

  const byTable = new Map();
  for (const order of rows) {
    const table = order.tableNumber || '';
    if (!byTable.has(table)) byTable.set(table, []);
    byTable.get(table).push(order);
  }

  const tables = tableNames.map((table) => {
    const tableOrders = byTable.get(table) || [];
    if (!tableOrders.length) return { table, status: 'empty' };

    const anyUnpaid = tableOrders.some((one) => one.status === 'COMPLETED' && one.payment?.status === 'UNPAID');
    const itemCount = tableOrders.reduce((sum, one) => sum + (one.lines || []).reduce((s, line) => s + (Number(line.qty) || 0), 0), 0);
    const totalCents = tableOrders.reduce((sum, one) => sum + (Number(one.totalCents) || 0), 0);
    const oldest = tableOrders.reduce((min, one) => (one.createdAt < min ? one.createdAt : min), tableOrders[0].createdAt);

    return {
      table,
      status: anyUnpaid ? 'unpaid' : 'active',
      orderCount: tableOrders.length,
      orderIds: tableOrders.map((one) => one._id.toString()),
      itemCount,
      totalCents,
      oldestCreatedAt: oldest,
      statuses: [...new Set(tableOrders.map((one) => one.status))]
    };
  });

  return { tables };
});

/**
 * A dine-in order is entered by staff for a guest sitting at a table in the
 * restaurant. It skips checkout, payment gating and delivery/pickup timing
 * entirely — it goes straight to the kitchen as RECEIVED, and payment is
 * settled at the table afterward (see the payment endpoint below).
 */
post('/shop/dine-in-orders', async (ctx) => {
  if (!verifyKitchenAuth(ctx)) throw unauthorized('Kitchen access required.');

  const tableNumber = cleanText(ctx.body?.tableNumber, 40);
  if (!tableNumber) throw badRequest('Choose a table for this order.');

  const settingRows = await col('setting');
  const tables = await namedList(settingRows, 'dineInTables', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  if (!tables.includes(tableNumber)) throw badRequest('That table is not configured. Add it in KDS Settings first.');

  const priced = await priceOrder({ fulfilment: 'DINE_IN', lines: ctx.body?.lines });
  await reserveStock(await col('menuItems'), priced.lines);

  // priceOrder() always prices online orders with zero gratuity — dine-in is
  // the one channel where a guest actually tips, so it's applied here.
  let tipCents = 0;
  if (ctx.body?.tipCents !== undefined) {
    tipCents = Number(ctx.body.tipCents);
    if (!Number.isInteger(tipCents) || tipCents < 0 || tipCents > priced.subtotalCents) {
      throw badRequest('Tip amount is invalid.');
    }
  }

  const orders = await col('order');
  const now = new Date();
  const orderNumber = await nextOrderNumber();
  const note = cleanText(ctx.body?.note, 300);
  const actor = ctx.kitchenActor || 'kitchen-display';

  const document = {
    orderNumber,
    fulfilment: 'DINE_IN',
    tableNumber,
    status: 'RECEIVED',
    customer: { name: `Table ${tableNumber}`, phone: '', email: '', note },
    lines: priced.lines,
    subtotalCents: priced.subtotalCents,
    deliveryCents: 0,
    taxCents: priced.taxCents,
    tipCents,
    totalCents: priced.totalCents + tipCents,
    payment: { provider: 'none', status: 'UNPAID', amountCents: priced.totalCents + tipCents, currency: 'usd' },
    readyAt: readyAt(priced.settings, 'DINE_IN'),
    estimatedReadyAt: readyAt(priced.settings, 'DINE_IN'),
    isScheduled: false,
    statusHistory: [{ status: 'RECEIVED', at: now, by: actor }],
    statusChangedAt: now,
    createdAt: now,
    updatedAt: now
  };

  const inserted = await orders.insertOne(document);
  await logActivity(ctx, 'CREATE', 'ORDER', `#${orderNumber} dine-in, table ${tableNumber} (by ${actor})`);
  notifyKdsChange();
  return { ok: true, orderId: inserted.insertedId.toString(), orderNumber };
});

patch('/shop/dine-in-orders/:id/payment', async (ctx) => {
  if (!verifyKitchenAuth(ctx)) throw unauthorized('Kitchen access required.');

  const orders = await col('order');
  const id = asObjectId(ctx.params.id);
  if (!id) throw badRequest('Invalid order ID.');
  const order = await orders.findOne({ _id: id });
  if (!order) throw notFound('Order not found.');
  if (order.fulfilment !== 'DINE_IN') throw badRequest('This is not a dine-in order.');
  if (order.payment?.status === 'PAID') throw badRequest('This order is already marked paid.');

  const method = cleanText(ctx.body?.method, 20).toLowerCase();
  if (!['cash', 'card'].includes(method)) throw badRequest('Choose a payment method: cash or card.');

  const now = new Date();
  await orders.updateOne(
    { _id: id },
    { $set: { 'payment.status': 'PAID', 'payment.provider': 'staff', 'payment.method': method, 'payment.paidAt': now, updatedAt: now } }
  );
  await logActivity(ctx, 'PAYMENT', 'ORDER', `#${order.orderNumber} table ${order.tableNumber || ''} marked paid (${method})`);
  notifyKdsChange();
  return { ok: true };
});

patch('/shop/kitchen-menu-items/:id', async (ctx) => {
  if (!verifyKitchenAuth(ctx)) throw unauthorized('Kitchen access required.');

  const menuItems = await col('menuItems');
  const id = asObjectId(ctx.params.id);
  if (!id) throw badRequest('Invalid menu item ID.');
  const current = await menuItems.findOne({ _id: id });
  if (!current) throw notFound('Menu item not found.');

  const update = { updatedAt: new Date() };
  if (typeof ctx.body?.available === 'boolean') update.available = ctx.body.available;
  if (ctx.body?.station !== undefined) {
    const station = cleanText(ctx.body.station, 40);
    if (!station) throw badRequest('Station cannot be empty.');
    update.kdsStation = station;
  }
  if (typeof ctx.body?.trackInventory === 'boolean') update.trackInventory = ctx.body.trackInventory;
  if (ctx.body?.stockCount !== undefined) {
    const count = Number(ctx.body.stockCount);
    if (!Number.isInteger(count) || count < 0) throw badRequest('Stock count must be a whole number of 0 or more.');
    update.stockCount = count;
    // A manual restock implies the item is sellable again, unless the caller
    // is also explicitly setting availability in this same request.
    if (count > 0 && typeof ctx.body?.available !== 'boolean') update.available = true;
  }
  if (Object.keys(update).length === 1) { // only updatedAt
    throw badRequest('Availability, station, or inventory is required.');
  }

  await menuItems.updateOne({ _id: id }, { $set: update });
  await logActivity(ctx, 'UPDATE', 'MENU_ITEM', `${current.name}: kitchen controls`);
  return {
    ok: true,
    item: {
      id: id.toString(),
      name: current.name,
      available: update.available ?? current.available !== false,
      station: update.kdsStation || current.kdsStation || 'Expo',
      trackInventory: update.trackInventory ?? Boolean(current.trackInventory),
      stockCount: update.stockCount ?? (Number.isFinite(current.stockCount) ? current.stockCount : 0)
    }
  };
});

post('/shop/quote', async ({ body }) => {
  // Used by the cart to show tax and delivery before the customer commits.
  const priced = await priceOrder(body);
  const kitchenStatus = getKitchenOperatingStatus();
  return {
    lines: priced.lines,
    subtotalCents: priced.subtotalCents,
    deliveryCents: priced.deliveryCents,
    taxCents: priced.taxCents,
    tipCents: priced.tipCents,
    totalCents: priced.totalCents,
    kitchenStatus
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

  // Enforce kitchen operating hours (Mon-Fri 11:00 AM - 3:30 PM America/Detroit)
  const enforceHours = process.env.ENFORCE_KITCHEN_HOURS !== 'false';
  let scheduledAt = null;

  if (body?.scheduledAt) {
    const parsed = new Date(body.scheduledAt);
    const minTime = new Date(Date.now() + 25 * 60 * 1000);             // 25 min notice
    const maxTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);   // 7 days ahead
    if (isNaN(parsed.getTime())) throw badRequest('Invalid scheduled time.');
    if (parsed < minTime) throw badRequest('Scheduled time must be at least 25 minutes from now.');
    if (parsed > maxTime) throw badRequest('Cannot schedule more than 7 days in advance.');

    if (enforceHours) {
      const scheduleStatus = getKitchenOperatingStatus(parsed);
      if (!scheduleStatus.isOpen) {
        throw badRequest(scheduleStatus.reason || 'Scheduled orders must be set between 11:00 AM and 3:30 PM, Monday through Friday.');
      }
    }
    scheduledAt = parsed;
  } else if (enforceHours) {
    // Immediate order check against current restaurant time
    const currentStatus = getKitchenOperatingStatus(new Date());
    if (!currentStatus.isOpen) {
      throw badRequest(`${currentStatus.reason} Please select "Schedule" at checkout to place an advance order during our operating hours.`);
    }
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
  const estimatedReadyAt = scheduledAt || readyAt(priced.settings, priced.fulfilment);

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
    // Keep readyAt for existing clients while giving the estimate an explicit
    // name. actualReadyAt is written only when the kitchen marks the order ready.
    readyAt: estimatedReadyAt,
    estimatedReadyAt,
    scheduledAt: scheduledAt || null,
    isScheduled: !!scheduledAt,
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
          statusChangedAt: new Date(),
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
    await reserveStock(await col('menuItems'), priced.lines);
    await logActivity({ ip }, 'CREATE', 'ORDER', `#${orderNumber} (no-card test mode)`);
    notifyKdsChange();
    const updatedOrder = await orders.findOne({ _id: inserted.insertedId });
    if (updatedOrder) {
      notifyNewOrder(updatedOrder).catch(err => console.error('[email] test order staff notify error:', err.message));
      notifyCustomerOrder(updatedOrder).catch(err => console.error('[email] test order customer notify error:', err.message));
    }
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
    estimatedReadyAt: row.estimatedReadyAt || row.readyAt,
    actualReadyAt: row.actualReadyAt || null,
    createdAt: row.createdAt,
    orderStatus: row.status,
    paymentStatus: row.payment?.status || 'UNPAID',
    paymentMode: row.payment?.mode || null,
    isScheduled: row.isScheduled || false,
    scheduledAt: row.scheduledAt || null
  };
});

/** Lets the admin and a deploy check show whether payments are armed. */
get('/shop/payment-status', { auth: true }, async () => paymentStatusSummary());
